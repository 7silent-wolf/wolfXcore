import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, BookOpen, Search, X, ExternalLink, Loader2, Clock, User, MessageSquare, Heart, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const categoryColors = {
  'General': 'primary',
  'Getting Started': 'green',
  'Payments': 'blue',
  'Deployment': 'purple',
  'Server Management': 'yellow',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const Tutorials = () => {
  const { user } = useAuth();
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeVideo, setActiveVideo] = useState(null);
  const [likes, setLikes] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [liking, setLiking] = useState({});
  const [autoScrollComments, setAutoScrollComments] = useState(false);
  const commentsRef = useRef(null);

  useEffect(() => {
    if (autoScrollComments && activeVideo && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setAutoScrollComments(false);
    }
  }, [autoScrollComments, activeVideo, comments]);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      if (data.success) {
        setTutorials(data.tutorials);
        data.tutorials.forEach(t => {
          fetchLikes(t.id);
          fetchCommentCount(t.id);
        });
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async (id) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`/api/tutorials/${id}/likes`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setLikes(prev => ({ ...prev, [id]: { count: data.count, liked: data.liked } }));
      }
    } catch (e) {}
  };

  const fetchCommentCount = async (id) => {
    try {
      const res = await fetch(`/api/tutorials/${id}/comments`);
      const data = await res.json();
      if (data.success) {
        setCommentCounts(prev => ({ ...prev, [id]: data.comments.length }));
      }
    } catch (e) {}
  };

  const toggleLike = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    if (liking[id]) return;
    setLiking(prev => ({ ...prev, [id]: true }));
    const prev = likes[id] || { count: 0, liked: false };
    setLikes(l => ({ ...l, [id]: { count: prev.liked ? prev.count - 1 : prev.count + 1, liked: !prev.liked } }));
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`/api/tutorials/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLikes(l => ({ ...l, [id]: { count: data.count, liked: data.liked } }));
      } else {
        setLikes(l => ({ ...l, [id]: prev }));
      }
    } catch (err) {
      setLikes(l => ({ ...l, [id]: prev }));
    } finally {
      setLiking(p => ({ ...p, [id]: false }));
    }
  };

  const openVideo = async (tutorial) => {
    setActiveVideo(tutorial);
    setComments([]);
    setCommentText('');
    setCommentError('');
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/tutorials/${tutorial.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
        setCommentCounts(prev => ({ ...prev, [tutorial.id]: data.comments.length }));
      }
    } catch (e) {}
    finally { setCommentsLoading(false); }
  };

  const openVideoToComments = async (e, tutorial) => {
    e.stopPropagation();
    setAutoScrollComments(true);
    await openVideo(tutorial);
  };

  const scrollToComments = (e) => {
    e.stopPropagation();
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setCommentError('');
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`/api/tutorials/${activeVideo.id}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [data.comment, ...prev]);
        setCommentCounts(prev => ({ ...prev, [activeVideo.id]: (prev[activeVideo.id] || 0) + 1 }));
        setCommentText('');
      } else {
        setCommentError(data.message || 'Failed to post comment');
      }
    } catch (e) {
      setCommentError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    const token = localStorage.getItem('jwt_token');
    try {
      await fetch(`/api/tutorials/${activeVideo.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCounts(prev => ({ ...prev, [activeVideo.id]: Math.max(0, (prev[activeVideo.id] || 1) - 1) }));
    } catch (e) {}
  };

  const categories = ['All', ...new Set(tutorials.map(t => t.category || 'General'))];

  const filtered = tutorials.filter(t => {
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getColorClasses = (category) => {
    const color = categoryColors[category] || 'primary';
    const map = {
      primary: 'border-primary/20 bg-primary/5 text-primary',
      green: 'border-green-500/20 bg-green-500/5 text-green-400',
      blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
      purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
      yellow: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
    };
    return map[color] || map.primary;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Tutorials</h1>
          <p className="text-sm font-mono text-gray-400">Learn how to use WolfHost</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-primary/20 rounded-lg text-sm font-mono text-white placeholder:text-gray-500 focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg font-mono text-xs whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-white border border-primary/30'
                  : 'text-gray-400 hover:text-white hover:bg-primary/5 border border-primary/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-mono">
            {tutorials.length === 0 ? 'No tutorials available yet.' : 'No tutorials match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-3 sm:px-0">
          {filtered.map((tutorial, index) => {
            const likeData = likes[tutorial.id] || { count: 0, liked: false };
            const commentCount = commentCounts[tutorial.id] || 0;
            return (
              <motion.div
                key={tutorial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-2xl border border-primary/10 bg-gradient-to-b from-white/[0.03] to-black/40 overflow-hidden hover:border-primary/35 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 cursor-pointer"
                onClick={() => openVideo(tutorial)}
              >
                <div className="relative bg-black/60 flex items-center justify-center overflow-hidden" style={{aspectRatio:'16/9'}}>
                  {tutorial.youtubeId ? (
                    <>
                      <img
                        src={`https://img.youtube.com/vi/${tutorial.youtubeId}/hqdefault.jpg`}
                        alt={tutorial.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
                        onError={(e) => { e.target.src = `https://img.youtube.com/vi/${tutorial.youtubeId}/0.jpg`; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/25 border-2 border-primary/50 flex items-center justify-center backdrop-blur-sm group-hover:scale-115 group-hover:bg-primary/35 transition-all duration-300 shadow-lg shadow-primary/20">
                          <PlayCircle className="w-9 h-9 text-primary drop-shadow-md" />
                        </div>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${getColorClasses(tutorial.category)}`}>
                          {tutorial.category || 'General'}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4">
                        <h3 className="text-[11px] sm:text-sm font-bold text-white drop-shadow-md line-clamp-2 leading-snug">{tutorial.title}</h3>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <PlayCircle className="w-12 h-12 text-gray-600" />
                      <span className="text-xs font-mono text-gray-500">Video</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 sm:p-3.5 space-y-2">
                  {tutorial.youtubeId ? null : (
                    <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">{tutorial.title}</h3>
                  )}
                  {tutorial.description && (
                    <p className="text-xs font-mono text-gray-400 line-clamp-2 leading-relaxed">{tutorial.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                    <div className="flex items-center gap-3">
                      {tutorial.createdBy && (
                        <span className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
                          <User size={11} />{tutorial.createdBy.split('@')[0]}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
                        <Clock size={11} />{new Date(tutorial.createdAt).toLocaleDateString()}
                      </span>
                      {commentCount > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
                          <MessageSquare size={11} />{commentCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleLike(e, tutorial.id)}
                      title={!user ? 'Log in to like' : likeData.liked ? 'Unlike' : 'Like'}
                      className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        likeData.liked
                          ? 'border-red-500/50 bg-red-500/15 text-red-400 shadow-sm shadow-red-500/10'
                          : !user
                          ? 'border-gray-700 bg-gray-800/40 text-gray-600 cursor-not-allowed'
                          : 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Heart size={13} className={likeData.liked ? 'fill-current' : ''} />
                      <span>{likeData.count}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl rounded-xl border border-primary/20 bg-black/95 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-primary/10 shrink-0">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{activeVideo.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getColorClasses(activeVideo.category)}`}>
                      {activeVideo.category || 'General'}
                    </span>
                    {activeVideo.createdBy && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                        <User size={9} />{activeVideo.createdBy.split('@')[0]}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                      <Clock size={9} />{new Date(activeVideo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeVideo.videoUrl && (
                    <a
                      href={activeVideo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-primary"
                      title="Open on YouTube"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-row min-h-0">
                <div className="lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden">
                  <div className="aspect-video bg-black shrink-0">
                    {activeVideo.youtubeId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                        title={activeVideo.title}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <PlayCircle className="w-16 h-16 text-gray-600" />
                        <a
                          href={activeVideo.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-sm hover:bg-primary/20 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink size={14} />Open Video
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 border-t border-primary/10">
                    {(() => {
                      const likeData = likes[activeVideo.id] || { count: 0, liked: false };
                      return (
                        <button
                          onClick={(e) => toggleLike(e, activeVideo.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                            likeData.liked
                              ? 'border-red-500/40 bg-red-500/10 text-red-400'
                              : 'border-primary/20 text-gray-400 hover:border-red-500/30 hover:text-red-400'
                          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!user}
                          title={!user ? 'Log in to like' : ''}
                        >
                          <Heart size={15} className={likeData.liked ? 'fill-current' : ''} />
                          <span>{likeData.liked ? 'Liked' : 'Like'}</span>
                          <span className="text-xs opacity-70">· {likeData.count}</span>
                        </button>
                      );
                    })()}
                  </div>

                  {activeVideo.description && (
                    <div className="px-4 pb-4 border-t border-primary/10 pt-3">
                      <p className="text-xs font-mono text-gray-400 leading-relaxed">{activeVideo.description}</p>
                    </div>
                  )}
                </div>

                <div className="lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-primary/10 lg:min-h-0 lg:overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10 shrink-0">
                    <MessageSquare size={14} className="text-primary" />
                    <span className="text-sm font-mono font-semibold text-white">Comments</span>
                    <span className="text-xs font-mono text-gray-500">({comments.length})</span>
                  </div>

                  <div className="px-4 py-3 border-b border-primary/10 shrink-0">
                    {user ? (
                      <form onSubmit={submitComment} className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => { setCommentText(e.target.value); setCommentError(''); }}
                          placeholder="Write a comment..."
                          maxLength={500}
                          className="flex-1 px-3 py-2 rounded-lg border border-primary/20 bg-black/50 text-white font-mono text-xs placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                          disabled={submitting}
                        />
                        <button
                          type="submit"
                          disabled={submitting || !commentText.trim()}
                          className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-mono text-xs"
                        >
                          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Post
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs font-mono text-gray-500 italic">Log in to leave a comment.</p>
                    )}
                    {commentError && (
                      <p className="text-xs font-mono text-red-400 mt-1">{commentError}</p>
                    )}
                  </div>

                  <div className="lg:flex-1 lg:overflow-y-auto p-4 space-y-3 pb-8 lg:pb-4" ref={commentsRef}>
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 size={18} className="animate-spin text-primary" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs font-mono text-gray-600 text-center py-4">No comments yet. Be the first!</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="flex gap-2.5 group/comment">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-mono text-primary font-bold">
                              {comment.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-mono font-semibold text-white">{comment.username}</span>
                              <span className="text-[10px] font-mono text-gray-600">{timeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-xs font-mono text-gray-300 leading-relaxed break-words">{comment.text}</p>
                          </div>
                          {(user && (String(comment.userId) === String(user.userId) || user.isAdmin)) && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="opacity-0 group-hover/comment:opacity-100 p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                              title="Delete comment"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tutorials;
