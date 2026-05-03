import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const reqs = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password)
  };

  const getStrength = () => {
    const passed = Object.values(reqs).filter(Boolean).length;
    if (passed <= 2) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (passed === 3) return { label: 'Fair', color: 'bg-yellow-500', text: 'text-yellow-500' };
    if (passed === 4) return { label: 'Strong', color: 'bg-blue-500', text: 'text-blue-500' };
    return { label: 'Very Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strength = getStrength();

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    if (!Object.values(reqs).every(Boolean)) {
      return toast.error("Please meet all password requirements");
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="absolute top-[10%] right-[20%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Key size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create New Password</h1>
          <p className="text-gray-400 text-sm">Please enter your new strong password below.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
              <button
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {password.length > 0 && (
              <div className="mt-3 space-y-2 p-4 bg-surface/50 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-gray-400">Strength:</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>
                <div className="flex gap-1 h-1.5 w-full mb-4">
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className={`flex-1 rounded-full ${Object.values(reqs).filter(Boolean).length >= level ? strength.color : 'bg-white/10'}`} />
                  ))}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 ${reqs.length ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {reqs.length ? <Check size={14}/> : <X size={14}/>} 8+ characters
                  </div>
                  <div className={`flex items-center gap-2 ${reqs.upper && reqs.lower ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {reqs.upper && reqs.lower ? <Check size={14}/> : <X size={14}/>} Uppercase & lowercase
                  </div>
                  <div className={`flex items-center gap-2 ${reqs.number ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {reqs.number ? <Check size={14}/> : <X size={14}/>} At least 1 number
                  </div>
                  <div className={`flex items-center gap-2 ${reqs.special ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {reqs.special ? <Check size={14}/> : <X size={14}/>} Special char (@$!%*?&)
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl py-3.5 transition-all shadow-[0_8px_30px_rgb(16,185,129,0.2)] mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Reset Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
