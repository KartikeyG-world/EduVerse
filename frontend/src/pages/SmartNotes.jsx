import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { Save, Sparkles, Wand2, FileText, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';

const SmartNotes = () => {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { requireAuth } = useContext(AuthContext);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to load notes');
    }
  };

  const loadNote = (id) => {
    const note = notes.find(n => n._id === id);
    if (note) {
      setActiveNoteId(note._id);
      setTitle(note.title);
      setContent(note.content);
      setSummary(note.summary || '');
    }
  };

  const createNew = () => {
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setSummary('');
  };

  const handleSave = async () => {
    requireAuth(async () => {
        if (!title || !content) {
          alert("Please provide a title and content.");
          return;
        }
        setSaving(true);
        try {
          // For now, always create new. If we had an update endpoint, it would be a PUT.
          const res = await api.post('/notes', { title, content, summary });
          setNotes([res.data, ...notes]);
          setActiveNoteId(res.data._id);
          alert('Note saved!');
        } catch (err) {
          alert("Failed to save note.");
        } finally {
          setSaving(false);
        }
    });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    requireAuth(async () => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;
        try {
          await api.delete(`/notes/${id}`);
          setNotes(notes.filter(n => n._id !== id));
          if (activeNoteId === id) {
            createNew();
          }
        } catch (err) {
          alert("Failed to delete note.");
        }
    });
  };

  const handleSummarize = async () => {
    requireAuth(async () => {
        if (!content) return;
        setLoading(true);
        try {
          const res = await api.post('/ai/summarize', { content });
          setSummary(res.data.summary);
        } catch (err) {
          alert("Failed to summarize notes. Please check if your OpenAI key has billing credits active.");
        } finally {
          setLoading(false);
        }
    });
  };

  return (
    <div className="h-full flex flex-col space-y-4 relative">
<<<<<<< HEAD
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <span className="p-2 glass rounded-xl text-accent"><Wand2 size={24} /></span>
            Smart Notes
          </h2>
          <p className="text-gray-400 mt-1">Write your notes and let AI summarize and generate quizzes.</p>
        </div>
        <div className="flex gap-3">
          <PremiumButton>
            <button 
              onClick={handleSave}
              disabled={saving || !content || !title}
              className="glass flex items-center gap-2 px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
=======
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 glass rounded-xl text-accent"><Wand2 className="w-5 h-5 sm:w-6 sm:h-6" /></span>
            Smart Notes
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Write your notes and let AI summarize and generate quizzes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <PremiumButton className="w-full sm:w-auto">
            <button 
              onClick={handleSave}
              disabled={saving || !content || !title}
              className="w-full sm:w-auto glass flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
>>>>>>> phase2Code
            >
              {saving ? <Sparkles size={18} className="animate-spin" /> : <Save size={18} />} 
              Save Note
            </button>
          </PremiumButton>
<<<<<<< HEAD
          <PremiumButton>
            <button 
              onClick={handleSummarize}
              disabled={loading || !content}
              className="bg-accent hover:opacity-90 text-white flex items-center gap-2 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
=======
          <PremiumButton className="w-full sm:w-auto">
            <button 
              onClick={handleSummarize}
              disabled={loading || !content}
              className="w-full sm:w-auto bg-accent hover:opacity-90 text-white flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl transition-all disabled:opacity-50 min-h-[44px]"
>>>>>>> phase2Code
            >
              {loading ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Summarize with AI
            </button>
          </PremiumButton>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        
        {/* Sidebar History */}
        <ScrollReveal 
          delay={0.1}
          y={0}
<<<<<<< HEAD
          className="glass-card-hover flex flex-col p-4 overflow-hidden h-[calc(100vh-240px)]"
=======
          className="glass-card-hover flex flex-col p-4 overflow-hidden h-[300px] lg:h-[calc(100vh-240px)]"
>>>>>>> phase2Code
        >
          <PremiumButton className="w-full">
            <button 
              onClick={createNew}
<<<<<<< HEAD
              className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded-xl mb-4 transition-colors font-medium"
=======
              className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary py-2.5 sm:py-2 rounded-xl mb-4 transition-colors font-medium min-h-[44px]"
>>>>>>> phase2Code
            >
              <Plus size={18} /> New Note
            </button>
          </PremiumButton>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {notes.map(note => (
              <button 
                key={note._id}
                onClick={() => loadNote(note._id)}
<<<<<<< HEAD
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group
=======
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group min-h-[44px]
>>>>>>> phase2Code
                  ${activeNoteId === note._id ? 'border-primary bg-primary/10' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
                `}
              >
                <div className="flex-1 overflow-hidden pr-2">
                  <p className={`font-medium text-sm truncate ${activeNoteId === note._id ? 'text-white' : 'text-gray-300'}`}>
                    {note.title}
                  </p>
                  <p className="text-xs text-secondary truncate mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
<<<<<<< HEAD
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div 
                     onClick={(e) => handleDelete(e, note._id)}
                     className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded z-10"
=======
                <div className="flex items-center gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                   <div 
                     onClick={(e) => handleDelete(e, note._id)}
                     className="p-1.5 lg:p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded z-10"
>>>>>>> phase2Code
                   >
                     <Trash2 size={16}/>
                   </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Editor Area */}
        <ScrollReveal 
          delay={0.2}
          y={10}
<<<<<<< HEAD
          className="lg:col-span-2 glass-card-hover flex flex-col p-0 overflow-hidden"
=======
          className="lg:col-span-2 glass-card-hover flex flex-col p-0 overflow-hidden min-h-[400px] lg:min-h-0"
>>>>>>> phase2Code
        >
          <input 
            type="text" 
            placeholder="Note Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
<<<<<<< HEAD
            className="w-full bg-transparent border-b border-white/5 p-6 text-xl font-bold text-white focus:outline-none placeholder:text-gray-600"
=======
            className="w-full bg-transparent border-b border-white/5 p-4 sm:p-6 text-lg sm:text-xl font-bold text-white focus:outline-none placeholder:text-gray-600"
>>>>>>> phase2Code
          />
          <textarea 
            placeholder="Start typing your notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
<<<<<<< HEAD
            className="flex-1 w-full bg-transparent p-6 text-gray-300 focus:outline-none resize-none leading-relaxed h-[calc(100vh-320px)]"
=======
            className="flex-1 w-full bg-transparent p-4 sm:p-6 text-sm sm:text-base text-gray-300 focus:outline-none resize-none leading-relaxed h-[300px] lg:h-[calc(100vh-320px)]"
>>>>>>> phase2Code
          ></textarea>
        </ScrollReveal>

        {/* AI Output Area */}
        <ScrollReveal 
          delay={0.3}
          className="glass-card-hover flex flex-col overflow-hidden relative"
        >
          {summary ? (
             <div className="p-6 h-full overflow-y-auto w-full prose prose-invert prose-emerald">
                <h3 className="text-xl font-semibold mb-4 text-accent border-b border-white/10 pb-2">AI Summary & Quiz</h3>
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed font-medium">
                  {summary}
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 h-full text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-surface/50 flex items-center justify-center mb-4 inner-shadow">
                <Wand2 size={32} className="text-gray-600" />
              </div>
              <p>Type your notes on the left and click <strong>Summarize with AI</strong> to generate brief summaries and study questions.</p>
            </div>
          )}
        </ScrollReveal>
      </div>
    </div>
  );
};

export default SmartNotes;
