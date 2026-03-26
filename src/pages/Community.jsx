import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  Shield,
  Trash2,
  AlertTriangle,
  Reply,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Community = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('jwt_token');

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
    });
  };

  const fetchMessages = async (initial = false) => {
    try {
      const res = await fetch('/api/community/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setOnlineCount(data.onlineCount || 0);
        if (initial) {
          setTimeout(() => scrollToBottom(false), 100);
        }
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    pollIntervalRef.current = setInterval(() => fetchMessages(false), 4000);
    return () => clearInterval(pollIntervalRef.current);
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const body = { message: text };
      if (replyingTo) {
        body.replyTo = replyingTo.id;
      }
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setReplyingTo(null);
        await fetchMessages();
        scrollToBottom();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      const res = await fetch(`/api/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
      }
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  const handleEdit = async (messageId) => {
    const text = editText.trim();
    if (!text) return;

    try {
      const res = await fetch(`/api/community/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        setEditText('');
        await fetchMessages();
      }
    } catch (e) {
      console.error('Failed to edit message:', e);
    }
  };

  const startEditing = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const startReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      username: msg.username,
      message: msg.message.length > 80 ? msg.message.slice(0, 80) + '...' : msg.message,
    });
    inputRef.current?.focus();
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getAvatarColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };

  const isOwnMessage = (msg) => {
    return msg.userId === user?.panelId || msg.username === user?.username;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary">
              Community
            </h1>
            <p className="text-sm font-mono text-gray-500 mt-1">
              Public chat — everyone can see messages
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/10 bg-black/50">
            <Users size={14} className="text-primary/70" />
            <span className="text-xs font-mono text-primary/70">
              {onlineCount} online
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-primary/10 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="px-4 py-3 border-b border-primary/10 bg-black/30 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary/60" />
            <span className="text-sm font-mono text-gray-400">
              General Chat
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-yellow-500/60" />
              <span className="text-xs font-mono text-gray-600">
                Be respectful — all messages are public
              </span>
            </div>
          </div>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-mono text-gray-500">
                    Loading messages...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare
                    size={48}
                    className="text-primary/10 mx-auto mb-3"
                  />
                  <p className="text-sm font-mono text-gray-500">
                    No messages yet — be the first to say something!
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex gap-3 ${isOwnMessage(msg) ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/10"
                      style={{ backgroundColor: getAvatarColor(msg.username) }}
                    >
                      {msg.username.charAt(0).toUpperCase()}
                    </div>

                    <div className={`max-w-[75%] ${isOwnMessage(msg) ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isOwnMessage(msg) ? 'justify-end' : ''}`}>
                        {!isOwnMessage(msg) && (
                          <span className="text-xs font-mono font-semibold text-primary/80">
                            {msg.username}
                          </span>
                        )}
                        {isOwnMessage(msg) && (
                          <span className="text-xs font-mono font-semibold text-primary/80">
                            You
                          </span>
                        )}
                        {msg.isAdmin && (
                          <span className="flex items-center gap-0.5 text-[10px] font-mono bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded-full border border-primary/20">
                            <Shield size={8} />
                            ADMIN
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1">
                          <Clock size={9} />
                          {formatTime(msg.createdAt)}
                          {msg.edited && (
                            <span className="text-gray-500 italic ml-1">(edited)</span>
                          )}
                        </span>
                      </div>

                      {msg.replyTo && (
                        <div className={`mb-1 px-2.5 py-1.5 rounded-md border-l-2 border-primary/30 bg-primary/5 ${isOwnMessage(msg) ? 'ml-auto' : ''}`} style={{ maxWidth: '100%' }}>
                          <span className="text-[10px] font-mono text-primary/60 font-semibold">{msg.replyTo.username}</span>
                          <p className="text-[11px] font-mono text-gray-500 truncate">{msg.replyTo.message}</p>
                        </div>
                      )}

                      {editingId === msg.id ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            maxLength={500}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEdit(msg.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="w-full bg-black/60 border border-primary/30 rounded-lg px-3 py-1.5 text-sm font-mono text-gray-200 focus:outline-none focus:border-primary/50 transition-colors"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(msg.id)}
                              disabled={!editText.trim()}
                              className="flex items-center gap-1 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors disabled:opacity-30"
                            >
                              <Check size={10} />
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <X size={10} />
                              Cancel
                            </button>
                            <span className="text-[9px] font-mono text-gray-600 ml-1">esc to cancel</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-3 py-2 rounded-lg text-sm font-mono leading-relaxed ${
                            isOwnMessage(msg)
                              ? 'bg-primary/10 border border-primary/20 text-gray-200'
                              : 'bg-white/[0.03] border border-primary/5 text-gray-300'
                          }`}
                        >
                          {msg.message}
                        </div>
                      )}

                      <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage(msg) ? 'justify-end' : ''}`}>
                        <button
                          onClick={() => startReply(msg)}
                          className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-primary/70 transition-colors"
                        >
                          <Reply size={10} />
                          Reply
                        </button>
                        {isOwnMessage(msg) && editingId !== msg.id && (
                          <button
                            onClick={() => startEditing(msg)}
                            className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-blue-400 transition-colors"
                          >
                            <Pencil size={10} />
                            Edit
                          </button>
                        )}
                        {(isOwnMessage(msg) || user?.isAdmin) && (
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="flex items-center gap-1 text-[10px] font-mono text-red-500/50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-primary/10 bg-black/30">
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/10 bg-primary/5">
                    <Reply size={12} className="text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-primary/70 font-semibold">
                        Replying to {replyingTo.username}
                      </span>
                      <p className="text-[11px] font-mono text-gray-500 truncate">
                        {replyingTo.message}
                      </p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-white/5 rounded transition-colors shrink-0"
                    >
                      <X size={12} className="text-gray-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSend} className="p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : 'Type a message...'}
                  maxLength={500}
                  className="flex-1 bg-black/50 border border-primary/10 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-sm hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={14} />
                  Send
                </motion.button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] font-mono text-gray-600">
                  {newMessage.length}/500
                </span>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Community;
