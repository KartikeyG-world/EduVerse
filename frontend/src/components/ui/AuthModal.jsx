import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, ShieldAlert } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SocialAuthButtons from '../auth/SocialAuthButtons';

const AuthModal = () => {
    const { showAuthModal, closeAuthModal } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleNavigate = (path) => {
        closeAuthModal();
        navigate(path);
    };

    return (
        <AnimatePresence>
            {showAuthModal && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                    <motion.div 
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="bg-surface border border-white/10 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative p-8 text-center"
                    >
                        {/* Header Gradient Accents */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => closeAuthModal()}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert size={32} className="text-primary" />
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-wide mb-2">Auth Required</h2>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Please login or create an account to use this feature and securely save your progress to your neural workspace.
                        </p>

                        <div className="space-y-3">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleNavigate('/login')}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-content rounded-xl py-3.5 font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] flex justify-center items-center gap-2 transition-all"
                            >
                                <LogIn size={18} /> Login to Account
                            </motion.button>
                            
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleNavigate('/register')}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-3.5 font-bold flex justify-center items-center gap-2 transition-all"
                            >
                                <UserPlus size={18} /> Create Free Account
                            </motion.button>

                            <SocialAuthButtons actionText="WITH SOCIAL" />
                            
                            <button 
                                onClick={() => closeAuthModal()}
                                className="w-full text-gray-500 hover:text-white text-sm font-semibold pt-2 transition-colors"
                            >
                                Maybe Later / Continue as Guest
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
