import React, { useState, useRef, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Plus, Menu, X, MessageSquare, Trash2, Edit2, Check, BrainCircuit } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal from '../components/ui/ScrollReveal';

const Chatbot = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  
  const { requireAuth, isAuthenticated } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSessions();
  }, [isAuthenticated]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
      if (res.data.length > 0 && !activeSessionId) {
        loadSession(res.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setMessages(res.data.messages || []);
      setActiveSessionId(sessionId);
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Failed to load session details', err);
    }
  };

  const createNewSession = async () => {
    requireAuth(async () => {
      try {
        const res = await api.post('/chat/sessions');
        setSessions(prev => [res.data, ...(prev || [])]);
        setMessages(res.data.messages || []);
        setActiveSessionId(res.data._id);
        setIsSidebarOpen(false);
      } catch (err) {
        console.error('Failed to create new session', err.response?.data || err.message);
      }
    });
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      const updated = sessions.filter(s => s._id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          loadSession(updated[0]._id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setRenamingId(session._id);
    setRenameInput(session.title);
  };

  const saveRename = async (e, sessionId) => {
    e.stopPropagation();
    if (!renameInput.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await api.patch(`/chat/sessions/${sessionId}/rename`, { title: renameInput });
      setSessions(sessions.map(s => s._id === sessionId ? res.data.session : s));
      setRenamingId(null);
    } catch (err) {
      console.error('Failed to rename session', err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    requireAuth(async () => {
      if (!input.trim() || !activeSessionId) return;
  
      const userMessage = { role: 'user', content: input };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setLoading(true);
  
      try {
        const res = await api.post(`/chat/sessions/${activeSessionId}/message`, {
          message: userMessage.content
        });
  
        setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
        
        const updatedSession = res.data.session;
        setSessions(prev => prev.map(s => s._id === activeSessionId ? { ...s, title: updatedSession.title, updatedAt: updatedSession.updatedAt } : s));
        
      } catch (err) {
        const backendMsg = err.response?.data?.message || err.response?.data?.error || err.message || "";
        if (backendMsg.includes('AI_CREDIT_LIMIT') || backendMsg.includes('AI_RATE_LIMIT')) {
          toast.error("AI features are temporarily unavailable. Please try again in a moment.");
          setMessages([...newMessages, { role: 'assistant', content: "⚠️ AI features are temporarily unavailable. Please try again in a moment." }]);
        } else {
          toast.error("Failed to send message. Please try again.");
          setMessages([...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the server. Please try again." }]);
        }
      } finally {
        setLoading(false);
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 50);
      }
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <ScrollReveal 
      delay={0.1}
      className="h-[calc(100vh-140px)] flex relative overflow-hidden max-w-6xl mx-auto rounded-2xl glass-card-hover border-primary/20 shadow-primary/10 p-0"
    >
      {/* LEFT PANEL - Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`absolute md:relative z-20 w-[260px] h-full flex flex-col bg-surface/90 backdrop-blur-xl border-r border-white/5 md:flex shrink-0 ${isSidebarOpen ? 'flex' : 'hidden'}`}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" /> Tutor Chats
              </h3>
              <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-3 border-b border-white/5">
              <button 
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-2.5 rounded-xl transition-all font-medium text-sm"
              >
                <Plus size={16} /> New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <AnimatePresence>
                {sessions?.map(session => (
                  <motion.div 
                    key={session._id}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative group"
                  >
                    <div 
                      onClick={() => loadSession(session._id)}
                      className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-colors ${activeSessionId === session._id ? 'bg-white/10 border-l-2 border-primary' : 'hover:bg-white/5'}`}
                    >
                      {renamingId === session._id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={renameInput} 
                            onChange={e => setRenameInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveRename(e, session._id)}
                            className="bg-black/30 border border-primary/50 rounded px-2 py-1 text-xs text-white w-full focus:outline-none"
                            autoFocus
                          />
                          <button onClick={(e) => saveRename(e, session._id)} className="text-green-400 hover:text-green-300">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium truncate pr-4">{session.title}</span>
                          <div className="hidden group-hover:flex items-center gap-2 absolute right-2 bg-gradient-to-l from-surface via-surface to-transparent pl-4 py-1">
                            <button onClick={(e) => startRename(e, session)} className="text-gray-400 hover:text-primary"><Edit2 size={14} /></button>
                            <button onClick={(e) => deleteSession(e, session._id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500">{formatRelativeTime(session.updatedAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {sessions?.length === 0 && (
                <div className="text-center p-4 text-xs text-gray-500">No recent chats</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANEL - Active Chat */}
      <div className="flex-1 flex flex-col h-full bg-surface/20 relative">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 glass border-b border-white/5 flex items-center gap-4 z-10 sticky top-0 shrink-0">
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/50 relative shadow-[0_0_15px_rgba(var(--primary),0.3)] shrink-0">
            <Bot size={20} />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full shadow-[0_0_8px_rgba(34,197,94,1)]"></span>
          </div>
          <div>
            <h2 className="text-lg font-bold truncate max-w-[200px] sm:max-w-xs md:max-w-md">{activeSessionId ? sessions.find(s => s._id === activeSessionId)?.title || "EduVerse Tutor" : "EduVerse Tutor"}</h2>
            <p className="text-xs text-secondary">Online and ready to help</p>
          </div>
        </div>

        {/* Chat Area */}
        {activeSessionId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col" ref={scrollRef}>
              <AnimatePresence>
                {messages?.map((msg, idx) => (
                  <motion.div 
                    key={msg._id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg
                        ${msg.role === 'user' ? 'bg-gradient-to-tr from-accent to-primary text-white-fixed' : 'bg-surface border border-primary/30 text-primary'}`}
                      >
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-4 rounded-2xl shadow-xl backdrop-blur-md relative
                        ${msg.role === 'user' ? 'bg-primary/90 text-primary-content rounded-tr-sm' : 'glass border-white/10 text-gray-200 rounded-tl-sm'}`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="max-w-[80%] flex gap-3">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-surface border border-primary/30 text-primary shadow-lg">
                        <Bot size={14} />
                      </div>
                      <div className="p-4 rounded-2xl glass border-white/10 text-gray-200 rounded-tl-sm flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 bg-surface/50 border-t border-white/5 backdrop-blur-lg shrink-0">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-14 text-white focus:outline-none focus:border-primary/50 transition-colors shadow-inner text-sm md:text-base"
                  disabled={loading}
                />
                <motion.button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  whileHover={!loading && input.trim() ? { scale: 1.02 } : {}}
                  whileTap={!loading && input.trim() ? { scale: 0.96 } : {}}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-content disabled:opacity-50 transition-colors shadow-lg"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </motion.button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
              <BrainCircuit size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start a New Conversation</h2>
            <p className="text-gray-400 max-w-md mb-8">Ask anything. Learn everything. Your EduVerse AI tutor is ready to help you master any subject.</p>
            <button 
              onClick={createNewSession}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-content font-medium rounded-xl py-3 px-8 transition-all transform hover:scale-[1.02] flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={18} /> New Chat
            </button>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-10 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </ScrollReveal>
  );
};

export default Chatbot;
