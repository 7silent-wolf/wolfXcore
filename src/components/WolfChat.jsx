import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Zap } from 'lucide-react';

const WolfChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey there! I'm W.O.L.F — Wise Operational Learning Function. I'm here to help you navigate WolfHost. Ask me anything about servers, payments, referrals, or your account!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/wolf/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: trimmed })
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.error || "Sorry, I couldn't process that. Please try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-3 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[380px] sm:max-h-[520px] z-50 flex flex-col rounded-xl border border-primary/20 bg-[#0a0a0a]/95 backdrop-blur-md shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white">W.O.L.F</h3>
                  <p className="text-[10px] text-gray-500 font-mono">Wise Operational Learning Function</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'assistant' 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-blue-500/10 border border-blue-500/30'
                  }`}>
                    {msg.role === 'assistant' 
                      ? <Bot size={14} className="text-primary" />
                      : <User size={14} className="text-blue-400" />
                    }
                  </div>
                  <div className={`max-w-[80%] sm:max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-gray-900 border border-gray-800 text-gray-300'
                      : 'bg-primary/10 border border-primary/20 text-white'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-primary/10 border border-primary/30">
                    <Bot size={14} className="text-primary" />
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={14} className="text-primary animate-spin" />
                      <span className="text-xs text-gray-500">W.O.L.F is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-800 bg-black/30">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask W.O.L.F anything..."
                  disabled={loading}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          isOpen 
            ? 'bg-gray-800 border border-gray-700 text-gray-400' 
            : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={!isOpen ? { 
          boxShadow: ['0 0 10px hsl(120 100% 50% / 0.1)', '0 0 25px hsl(120 100% 50% / 0.2)', '0 0 10px hsl(120 100% 50% / 0.1)'] 
        } : {}}
        transition={!isOpen ? { duration: 2, repeat: Infinity } : {}}
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </motion.button>
    </>
  );
};

export default WolfChat;