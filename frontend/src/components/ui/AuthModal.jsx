import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, Phone, LogIn, UserPlus } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { CompanionContext, COMPANION_EVENTS } from '../../context/CompanionContext';
import api from '../../utils/api';

const AuthModal = () => {
    const { showAuthModal, setShowAuthModal, login } = useContext(AuthContext);
    const { triggerFeedback } = useContext(CompanionContext);
    
    // UI View Tracking
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [loading, setLoading] = useState(false);
    
    // Inputs (Register & Login merged safely natively)
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [identity, setIdentity] = useState(''); // Used specifically for Phone/Email Login merged bounds

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'login') {
                const res = await api.post('/auth/login', { identity, password });
                login(res.data.token, res.data.user);
                triggerFeedback({ 
                    type: COMPANION_EVENTS.AUTH_SUCCESS, 
                    data: { name: res.data.user.name, mode: 'login' } 
                });
            } else {
                const res = await api.post('/auth/register', { name, email, phone, password });
                login(res.data.token, res.data.user);
                triggerFeedback({ 
                    type: COMPANION_EVENTS.AUTH_SUCCESS, 
                    data: { name: res.data.user.name, mode: 'register' } 
                });
            }
            
            // Clean specific inputs securely natively
            setPassword('');
        } catch (err) {
            triggerFeedback({ 
                type: COMPANION_EVENTS.AUTH_ERROR, 
                data: { message: err.response?.data?.message || 'Authentication error occurred' } 
            });
        } finally {
            setLoading(false);
        }
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
                        className="bg-[#0b1120] border border-white/10 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative"
                    >
                        {/* Header Gradient Accents */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="p-8">
                            <div className="mb-8 text-center">
                                <h2 className="text-3xl font-black text-white tracking-wide mb-2 neon-text">EduVerse <span className="text-primary">AI</span></h2>
                                <p className="text-gray-400 text-sm">
                                    {mode === 'login' ? 'Unlock your personalized analytical ecosystem' : 'Join the fastest analytical framework structurally'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                
                                {mode === 'register' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                                <input 
                                                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                                    placeholder="Alex Rivers"
                                                    className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors text-sm"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {mode === 'login' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email or Phone</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                            <input 
                                                type="text" required value={identity} onChange={(e) => setIdentity(e.target.value)}
                                                placeholder="alex@eduverse.ai"
                                                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                                <input 
                                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Email"
                                                    className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone</label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                                <input 
                                                    type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Phone"
                                                    className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                                        <input 
                                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary transition-colors text-sm"
                                        />
                                    </div>
                                </div>

                                <motion.button 
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white rounded-xl py-3 font-black shadow-[0_0_20px_rgba(var(--primary),0.3)] mt-2 flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        mode === 'login' ? <><LogIn size={18} /> Authenticate</> : <><UserPlus size={18} /> Establish Identity</>
                                    )}
                                </motion.button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                <p className="text-gray-400 text-sm">
                                    {mode === 'login' ? "Don't have a structured ID?" : "Already established an ID?"}{' '}
                                    <button 
                                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                        className="text-primary font-bold hover:underline"
                                    >
                                        {mode === 'login' ? 'Register Now' : 'Login Sequence'}
                                    </button>
                                </p>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
