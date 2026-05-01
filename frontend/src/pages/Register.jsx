import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, phone, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                Join <span className="text-secondary italic">EduVerse</span>
            </h1>
            <p className="text-gray-400 text-sm">Establish your personalized study ID</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
            <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-secondary/50 transition-all font-medium text-sm"
                    required 
                />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-secondary/50 transition-all font-medium text-sm"
                        required 
                    />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                    <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1..."
                        className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-secondary/50 transition-all font-medium text-sm"
                        required 
                    />
                </div>
              </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Secure Password</label>
            <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-secondary/50 transition-all font-medium text-sm"
                    required 
                />
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-3 mt-4">
              <ShieldCheck size={20} className="text-secondary shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Your data is secured using AES-256 standard encryption and tied exclusively to your neural profile.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold rounded-2xl py-4 transition-all shadow-[0_8px_30px_rgb(var(--secondary),0.1)] mt-2 flex items-center justify-center gap-2 group"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Build Profile <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>

        <p className="text-gray-400 text-center text-sm mt-8">
          Already established an ID? <Link to="/login" className="text-secondary font-bold hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
