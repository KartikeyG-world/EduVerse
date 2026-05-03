// CHANGED FILE: frontend/src/pages/auth/Login.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Phone, Smartphone } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!identifier || !password) {
      showToast(`${loginMethod === 'email' ? 'Email' : 'Phone number'} and password are required`, 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      showToast('Welcome back!', 'success');
      login(res.data.token, res.data.user);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login Error Details:", err);
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(errorMsg, 'warning');
      
      if (err.response?.data?.requiresVerification) {
        navigate('/verify-otp', { state: { userId: err.response.data.userId } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 neon-text">
              EduVerse <span className="text-primary italic">AI</span>
          </h1>
          <p className="text-gray-400 text-sm">Secure Authentication</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-surface/50 p-1 rounded-xl border border-white/5 mb-6">
          <button
            onClick={() => { setLoginMethod('email'); setIdentifier(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'email' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Mail size={14} /> Email
          </button>
          <button
            onClick={() => { setLoginMethod('phone'); setIdentifier(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'phone' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Phone size={14} /> Mobile
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
            </label>
            <div className="relative">
              {loginMethod === 'email' ? (
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              ) : (
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              )}
              <input 
                type={loginMethod === 'email' ? 'email' : 'text'} 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginMethod === 'email' ? 'alex@eduverse.ai' : 'Enter mobile number'}
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                required 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" />
              <div className="w-4 h-4 rounded border border-white/20 bg-white/5 flex items-center justify-center group-hover:border-primary/50 transition-colors"></div>
              <span className="text-xs text-gray-400 group-hover:text-gray-300">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-4 transition-all shadow-[0_8px_30px_rgb(var(--primary),0.2)] mt-2 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>Log In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>
            )}
          </button>
        </form>
        
        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
