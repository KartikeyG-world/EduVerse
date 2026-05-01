import React, { useState, useRef, useEffect, useContext } from 'react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal from '../components/ui/ScrollReveal';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your EduVerse AI tutor. How can I help you study today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { requireAuth } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    requireAuth(async () => {
        if (!input.trim()) return;
    
        const userMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
    
        try {
          const history = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }));
    
          const res = await api.post(`/ai/chat`, {
            message: input,
            history
          });
    
          setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
        } catch (err) {
          setMessages([...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the server. Please try again." }]);
        } finally {
          setLoading(false);
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 50);
        }
    });
  };

  return (
    <ScrollReveal 
      delay={0.1}
      className="h-[calc(100vh-140px)] flex flex-col max-w-4xl mx-auto glass-card-hover relative overflow-hidden p-0 border-primary/20 shadow-primary/10"
    >
      
      {/* Header */}
      <div className="px-6 py-4 glass border-b border-white/5 flex items-center gap-4 z-10 sticky top-0">
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/50 relative shadow-[0_0_15px_rgba(var(--primary),0.3)]">
          <Bot size={20} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1e293b] rounded-full shadow-[0_0_8px_rgba(34,197,94,1)]"></span>
        </div>
        <div>
          <h2 className="text-lg font-bold">EduVerse Tutor</h2>
          <p className="text-xs text-secondary">Online and ready to help</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-surface/20" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg
                  ${msg.role === 'user' ? 'bg-gradient-to-tr from-accent to-primary text-white' : 'bg-surface border border-primary/30 text-primary'}`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-4 rounded-2xl shadow-xl backdrop-blur-md relative
                  ${msg.role === 'user' ? 'bg-primary/90 text-white rounded-tr-sm' : 'glass border-white/10 text-gray-200 rounded-tl-sm'}`}
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
      <div className="p-4 bg-surface/50 border-t border-white/5 backdrop-blur-lg">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            ref={inputRef}
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-14 text-white focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
            disabled={loading}
          />
          <motion.button 
            type="submit" 
            disabled={loading || !input.trim()}
            whileHover={!loading && input.trim() ? { scale: 1.02 } : {}}
            whileTap={!loading && input.trim() ? { scale: 0.96 } : {}}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 transition-colors shadow-lg"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </motion.button>
        </form>
      </div>
    </ScrollReveal>
  );
};

export default Chatbot;
