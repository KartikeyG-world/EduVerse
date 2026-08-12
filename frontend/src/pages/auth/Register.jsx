// CHANGED FILE: frontend/src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import { User, Lock, Mail, ArrowRight, Eye, EyeOff, Check, X, Smartphone } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return showToast("Passwords do not match!", "warning");
    }
    if (!Object.values(reqs).every(Boolean)) {
      const missing = [];
      if (!reqs.length) missing.push("8+ characters");
      if (!reqs.upper || !reqs.lower) missing.push("uppercase & lowercase");
      if (!reqs.number) missing.push("at least one number");
      if (!reqs.special) missing.push("a special character");
      
      return showToast(`Password needs: ${missing.join(', ')}`, "warning");
    }

    setLoading(true);
    try {
      const payload = { name, email, password };
      if (phone) payload.phone = phone;
      
      const res = await api.post('/auth/register', payload);
      showToast(res.data.message || 'OTP sent to your email!', 'success');
      navigate('/verify-otp', { state: { userId: res.data.userId, email } });
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
              Create Account
          </h1>
          <p className="text-gray-400 text-sm">Join EduVerse AI today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full Name" required
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address" required
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile Number (Optional)"
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-400">Strength:</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>
                <div className="flex gap-1 h-1.5 w-full">
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className={`flex-1 rounded-full ${Object.values(reqs).filter(Boolean).length >= level ? strength.color : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password" required
                className="w-full bg-surface/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-content font-bold rounded-2xl py-4 transition-all shadow-[0_8px_30px_rgb(var(--primary),0.2)] mt-4 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Create Account <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>

        <SocialAuthButtons actionText="WITH SOCIAL" />
        
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
