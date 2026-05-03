import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      toast.success(res.data.message || 'Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <button onClick={() => navigate('/login')} className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>

        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8 mt-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Mail size={24} className="text-gray-300" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
                <p className="text-gray-400 text-sm px-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-white text-background hover:bg-gray-200 font-bold rounded-xl py-3.5 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <span className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin"></span> : <>Send Reset Link <Send size={18} /></>}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 relative">
                <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                   <Mail size={32} className="text-emerald-400" />
                </motion.div>
                <motion.div 
                  className="absolute -right-2 -bottom-2 w-8 h-8 bg-background rounded-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                </motion.div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Check your inbox!</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                A password reset link has been sent to<br/><strong className="text-white">{email}</strong>
              </p>
              <Link 
                to="/login"
                className="inline-block w-full bg-surface hover:bg-white/5 border border-white/10 text-white font-bold rounded-xl py-3.5 transition-all"
              >
                Back to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Simple check icon for the success state
const Check = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default ForgotPassword;
