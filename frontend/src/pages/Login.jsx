import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Lock, Mail, Phone, ArrowRight } from 'lucide-react';

const Login = () => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identity, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"></div>
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2 neon-text">
                EduVerse <span className="text-primary italic">AI</span>
            </h1>
            <p className="text-gray-400 text-sm">Synchronize your learning ecosystem</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email or Phone</label>
            <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                <input 
                    type="text" 
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="alex@eduverse.ai"
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
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    required 
                />
            </div>
          </div>
          
          <div className="flex justify-end">
              <button type="button" className="text-xs font-semibold text-primary hover:underline">Forgot password?</button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-4 transition-all shadow-[0_8px_30px_rgb(var(--primary),0.2)] mt-2 flex items-center justify-center gap-2 group"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Log In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>
        
        <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-400 text-sm">
                Don't have a neural ID? <Link to="/register" className="text-primary font-bold hover:underline">Establish Account</Link>
            </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
