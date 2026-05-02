import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ListVideo, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useToast } from './ui/ToastProvider';

const SourcePreviewModal = ({ isOpen, onClose, source, onSourceAdded }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addStatus, setAddStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error', 'duplicate'
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setAddStatus('idle');
      setIsAdding(false);
    }
  }, [isOpen, source]);

  if (!source) return null;

  // Extract source information
  const getSourceDetails = () => {
    const url = source.url || '';
    const title = source.title || 'Unknown Source';

    let type = 'documentation';
    let videoId = null;
    let playlistId = null;
    let thumbnailUrl = null;
    let domain = '';
    let subtitle = '';

    try {
      const parsedUrl = new URL(url);
      domain = parsedUrl.hostname.replace('www.', '');

      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        if (url.includes('list=')) {
          type = 'playlist';
          playlistId = new URLSearchParams(parsedUrl.search).get('list');
          thumbnailUrl = `https://img.youtube.com/vi/${new URLSearchParams(parsedUrl.search).get('v') || ''}/maxresdefault.jpg`;
          if (!thumbnailUrl.includes('vi//')) {
             // Fallback if no specific video in playlist url
             thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&auto=format&fit=crop';
          }
          subtitle = 'Playlist on YouTube';
        } else {
          type = 'youtube';
          if (domain.includes('youtu.be')) {
            videoId = parsedUrl.pathname.substring(1);
          } else {
            videoId = new URLSearchParams(parsedUrl.search).get('v');
          }
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          subtitle = 'Video on YouTube';
        }
      } else {
        type = 'documentation';
        thumbnailUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        subtitle = `Documentation on ${domain}`;
      }
    } catch (e) {
      console.warn("Invalid URL in source preview", url);
    }

    return { type, title, subtitle, url, thumbnailUrl, domain };
  };

  const details = getSourceDetails();

  const handleAddToSkillHub = async () => {
    if (addStatus === 'loading' || addStatus === 'success' || addStatus === 'duplicate') return;
    
    setIsAdding(true);
    setAddStatus('loading');

    try {
      await api.post('/skillhub/add-source', {
        sourceUrl: details.url,
        sourceTitle: details.title,
        sourceType: details.type === 'youtube' ? 'video' : details.type,
        thumbnailUrl: details.type === 'documentation' ? null : details.thumbnailUrl,
        sourceMetadata: {
          channel: details.domain
        }
      });

      setAddStatus('success');
      showToast('Source added to Skill Hub successfully!', 'success');
      
      if (onSourceAdded) onSourceAdded();

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      if (err.response && err.response.status === 409) {
        setAddStatus('duplicate');
        showToast('This source is already in your Skill Hub', 'info');
      } else {
        setAddStatus('error');
        showToast('Failed to add source. Please try again.', 'error');
        setIsAdding(false);
      }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'youtube': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'playlist': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md overflow-y-auto px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getBadgeColor(details.type)} capitalize flex items-center gap-1`}>
                {details.type === 'youtube' && <Play size={10} />}
                {details.type === 'playlist' && <ListVideo size={10} />}
                {details.type === 'documentation' && <FileText size={10} />}
                {details.type}
              </span>
              <button 
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Section */}
            <div className="p-5 flex flex-col items-center">
              <div className="relative w-full max-w-[300px] aspect-video bg-black/40 rounded-xl overflow-hidden mb-5 group border border-white/5 flex items-center justify-center">
                {details.type === 'documentation' ? (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-surface to-background">
                     <img 
                      src={details.thumbnailUrl} 
                      alt={details.domain}
                      className="w-16 h-16 object-contain mb-2 drop-shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center">
                       <FileText size={48} className="text-blue-400/50" />
                    </div>
                  </div>
                ) : (
                  <>
                    <img 
                      src={details.thumbnailUrl} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                         e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {details.type === 'youtube' ? (
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-40 group-hover:opacity-90 group-hover:scale-110 transition-all">
                          <Play size={24} className="ml-1" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-40 group-hover:opacity-90 group-hover:scale-110 transition-all">
                          <ListVideo size={24} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Content Section */}
              <div className="w-full text-center">
                <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2">{details.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{details.subtitle}</p>
                <a href={details.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary/80 hover:text-primary transition-colors truncate max-w-[250px] inline-block">
                  {details.url}
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={handleAddToSkillHub}
                disabled={isAdding || addStatus === 'success' || addStatus === 'duplicate'}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                  addStatus === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  addStatus === 'duplicate' ? 'bg-white/10 text-gray-300 border border-white/20' :
                  addStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' :
                  'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 hover:shadow-lg'
                }`}
              >
                {addStatus === 'loading' && <Loader2 size={18} className="animate-spin" />}
                {addStatus === 'success' && <Check size={18} />}
                {addStatus === 'duplicate' && <Check size={18} />}
                {addStatus === 'error' && <AlertCircle size={18} />}
                
                {addStatus === 'idle' && 'Add to My Skill Hub'}
                {addStatus === 'loading' && 'Adding...'}
                {addStatus === 'success' && 'Added to Skill Hub'}
                {addStatus === 'duplicate' && 'Already Added'}
                {addStatus === 'error' && 'Retry'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SourcePreviewModal;
