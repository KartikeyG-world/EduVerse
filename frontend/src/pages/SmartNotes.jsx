import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Wand2, Plus, Trash2, Download, Bold, Italic, Underline as UnderlineIcon,
  Heading1, Heading2, List, ListOrdered, Quote, Code, Pin, Search, CheckCircle, 
  Clock, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import * as noteApi from '../api/notes';

// TipTap imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const STATUS = {
  IDLE: '✓ All changes saved',
  EDITING: 'Editing...',
  WAITING: 'Unsaved changes...',
  SAVING: 'Saving...',
  ERROR: 'Error saving changes'
};

const SmartNotes = () => {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [saveStatus, setSaveStatus] = useState(STATUS.IDLE);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const activeNoteIdRef = useRef(null);
  const titleRef = useRef('');
  const saveTimerRef = useRef(null);
  const { requireAuth } = useContext(AuthContext);

  // Sync ref with state for use in async functions/timers
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Initialize Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start writing your brilliant ideas here...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] text-gray-300 leading-relaxed spellcheck-true',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus(STATUS.EDITING);
      handleContentChange();
    },
  });

  useEffect(() => {
    loadNotes();
    return () => {
      // On unmount (refresh/exit), save any pending changes
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // We can't use await here but we can trigger the save
        // Using the current ref values ensures we save the latest data
        if (activeNoteIdRef.current) {
          const content = editor?.getHTML() || '';
          noteApi.updateNote(activeNoteIdRef.current, { 
            title: titleRef.current, 
            content 
          }).catch(console.error);
        }
      }
    };
  }, [editor]); // Re-run if editor instance changes

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await noteApi.fetchNotes();
      const fetchedNotes = res.data.notes;
      setNotes(fetchedNotes);
      if (fetchedNotes.length > 0 && !activeNoteIdRef.current) {
        selectNote(fetchedNotes[0]);
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to load notes', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectNote = (note) => {
    // If there's a pending save for the CURRENT note, save it before switching
    if (saveTimerRef.current && activeNoteIdRef.current) {
      clearTimeout(saveTimerRef.current);
      immediateSave(activeNoteIdRef.current, title, editor?.getHTML() || '');
    }

    setActiveNote(note);
    activeNoteIdRef.current = note._id;
    setTitle(note.title || 'Untitled Note');
    setSummary(note.summary || '');
    if (editor) {
      editor.commands.setContent(note.content || '');
    }
    setSaveStatus(STATUS.IDLE);
  };

  const handleCreateNote = async () => {
    requireAuth(async () => {
      try {
        const res = await noteApi.createNote();
        const newNote = res.data.note;
        setNotes([newNote, ...notes]);
        selectNote(newNote);
      } catch (err) {
        console.error('Failed to create note', err);
      }
    });
  };

  const handleDeleteNote = async (e, id) => {
    e.stopPropagation();
    requireAuth(async () => {
      if (!window.confirm('Are you sure you want to delete this note?')) return;
      
      try {
        await noteApi.deleteNote(id);
        setNotes(notes.filter(n => n._id !== id));
        if (activeNoteIdRef.current === id) {
          setActiveNote(null);
          activeNoteIdRef.current = null;
          setTitle('');
          setSummary('');
          if (editor) editor.commands.setContent('');
        }
      } catch (err) {
        console.error('Failed to delete note', err);
      }
    });
  };

  const handleContentChange = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus(STATUS.WAITING);
    saveTimerRef.current = setTimeout(() => {
      immediateSave();
    }, 4000);
  };

  const immediateSave = async (idToSave, titleToSave, contentToSave) => {
    if (!requireAuth()) return;
    const targetId = idToSave || activeNoteIdRef.current;
    if (!targetId) return;
    
    const content = contentToSave !== undefined ? contentToSave : (editor?.getHTML() || '');
    const currentTitle = titleToSave !== undefined ? titleToSave : titleRef.current;
    
    setSaveStatus(STATUS.SAVING);
    try {
      const res = await noteApi.updateNote(targetId, { 
        title: currentTitle, 
        content 
      });
      const updatedNote = res.data.note;
      
      // Update local notes list
      setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
      setSaveStatus(STATUS.IDLE);
    } catch (err) {
      setSaveStatus(STATUS.ERROR);
      console.error('Save failed', err);
    }
  };

  const handleSummarize = async () => {
    requireAuth(async () => {
      if (!editor || aiLoading) return;
      const text = editor.getText();
      if (!text.trim()) return;

      setAiLoading(true);
      try {
        const res = await noteApi.summarizeNote(text);
        const aiSummary = res.data.summary;
        setSummary(aiSummary);
        
        // Save summary to note
        if (activeNoteIdRef.current) {
           await noteApi.updateNote(activeNoteIdRef.current, { summary: aiSummary });
           setNotes(prev => prev.map(n => n._id === activeNoteIdRef.current ? { ...n, summary: aiSummary } : n));
        }
      } catch (err) {
        console.error('Summarization failed', err);
      } finally {
        setAiLoading(false);
      }
    });
  };

  const handleExportPDF = async () => {
    if (!activeNote || exportLoading) return;
    setExportLoading(true);
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('pdf-export-area');
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${title.replace(/\s+/g, '_')}-EduVerse.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Export failed', err);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden">
      
      {/* LEFT PANE: Notes Sidebar */}
      <div className="w-[320px] flex flex-col gap-4 flex-shrink-0">
        <PremiumButton className="w-full">
          <button 
            onClick={handleCreateNote}
            className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary py-3 rounded-xl transition-all font-semibold border border-primary/20"
          >
            <Plus size={20} /> New Note
          </button>
        </PremiumButton>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          <ScrollRevealGroup>
            {filteredNotes.map((note, idx) => (
              <ScrollReveal key={note._id} delay={idx * 0.05} y={10}>
                <div 
                  onClick={() => selectNote(note)}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer hover:bg-white/5
                    ${activeNote?._id === note._id ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/5'}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold truncate pr-6 ${activeNote?._id === note._id ? 'text-white' : 'text-gray-300'}`}>
                      {note.title || 'Untitled Note'}
                    </h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDeleteNote(e, note._id)}
                        className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {note.content?.replace(/<[^>]*>/g, '') || 'No content yet...'}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-gray-600 font-medium uppercase tracking-wider">
                    <span>{new Date(note.lastEditedAt || note.updatedAt).toLocaleDateString()}</span>
                    {note.isPinned && <Pin size={10} className="text-primary fill-primary" />}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </ScrollRevealGroup>

          {filteredNotes.length === 0 && !loading && (
            <div className="text-center py-10 opacity-50">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-sm">No notes found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Note Editor */}
      <div className="flex-1 flex flex-col glass-card overflow-hidden">
        {activeNote ? (
          <>
            {/* Header Area */}
            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="flex justify-between items-center gap-4">
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    handleContentChange();
                  }}
                  placeholder="Note Title..."
                  className="bg-transparent text-3xl font-bold text-white focus:outline-none flex-1 placeholder:text-gray-700"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                    {saveStatus === STATUS.IDLE ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : saveStatus === STATUS.SAVING ? (
                      <Clock size={14} className="text-yellow-400 animate-spin" />
                    ) : (
                      <AlertCircle size={14} className="text-blue-400" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {saveStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                  <Toolbar editor={editor} />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 transition-all disabled:opacity-50"
                  >
                    <Download size={16} /> Export PDF
                  </button>
                  <button 
                    onClick={handleSummarize}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  >
                    <Sparkles size={16} className={aiLoading ? 'animate-spin' : ''} />
                    {aiLoading ? 'Summarizing...' : 'Summarize AI'}
                  </button>
                </div>
              </div>
            </div>

            {/* Editor Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <EditorContent editor={editor} />
              
              <AnimatePresence>
                {summary && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-6 glass-card border-accent/20 bg-accent/5 rounded-2xl relative group"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-2 text-accent">
                      <Sparkles size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">AI Insights</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Wand2 size={18} className="text-accent" />
                      Note Summary
                    </h3>
                    <p className="text-gray-300 leading-relaxed italic">
                      "{summary}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center inner-shadow">
              <FileText className="w-10 h-10 text-gray-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">No Note Selected</h3>
              <p className="text-gray-500 max-w-sm">
                Select a note from the sidebar or create a new one to start documenting your journey.
              </p>
            </div>
            <PremiumButton>
              <button 
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-6 py-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl font-bold transition-all border border-primary/20"
              >
                <Plus size={20} /> Create Your First Note
              </button>
            </PremiumButton>
          </div>
        )}
      </div>

      {/* Hidden PDF Export Area */}
      <div className="hidden">
        <div id="pdf-export-area" className="p-10 bg-white text-slate-900 font-serif leading-relaxed">
          <h1 className="text-4xl font-bold mb-2 border-b-2 border-slate-200 pb-4">{title || 'Untitled Note'}</h1>
          <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-sans">
            EduVerse AI Smart Notes · {new Date().toLocaleDateString()}
          </p>
          
          <div 
            className="prose max-w-none mb-12 text-slate-800"
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} 
          />

          {summary && (
            <div className="mt-12 p-6 bg-slate-50 border-l-4 border-emerald-500 rounded-r-lg font-sans">
              <h3 className="text-lg font-bold text-emerald-700 mb-2 flex items-center gap-2">
                AI Summary & Insights
              </h3>
              <p className="text-slate-600 italic leading-relaxed">
                {summary}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const Toolbar = ({ editor }) => {
  if (!editor) return null;

  const buttons = [
    { icon: <Bold size={16} />, action: () => editor.chain().focus().toggleBold().run(), active: 'bold' },
    { icon: <Italic size={16} />, action: () => editor.chain().focus().toggleItalic().run(), active: 'italic' },
    { icon: <UnderlineIcon size={16} />, action: () => editor.chain().focus().toggleUnderline().run(), active: 'underline' },
    { icon: <Heading1 size={16} />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: { heading: { level: 1 } } },
    { icon: <Heading2 size={16} />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: { heading: { level: 2 } } },
    { icon: <List size={16} />, action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList' },
    { icon: <ListOrdered size={16} />, action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList' },
    { icon: <Quote size={16} />, action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote' },
    { icon: <Code size={16} />, action: () => editor.chain().focus().toggleCodeBlock().run(), active: 'codeBlock' },
  ];

  return (
    <>
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          className={`p-2 rounded hover:bg-white/10 transition-colors ${
            editor.isActive(btn.active) ? 'bg-primary/20 text-primary' : 'text-gray-500'
          }`}
        >
          {btn.icon}
        </button>
      ))}
    </>
  );
};

export default SmartNotes;
