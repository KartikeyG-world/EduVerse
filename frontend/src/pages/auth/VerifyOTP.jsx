import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(60);
  const [attempts, setAttempts] = useState(3);
  
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();
  
  const userId = location.state?.userId;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(isNaN)) return;
    
    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    if (pastedData.length === 6) {
      inputRefs.current[5].focus();
    } else {
      inputRefs.current[pastedData.length].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return showToast('Please enter a 6-digit code', 'warning');

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp: otpCode });
      showToast('Email verified successfully!', 'success');
      login(res.data.token, res.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification failed', 'warning');
      setAttempts(prev => Math.max(0, prev - 1));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { userId });
      showToast('New OTP sent to your email', 'success');
      setResendCooldown(60);
      setTimeLeft(600);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resend OTP', 'warning');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md relative z-10 border-white/10 shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Verify Email</h1>
        <p className="text-gray-400 text-sm mb-8">
          We sent a 6-digit verification code to your email. Enter it below to activate your account.
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={handlePaste}
                className="w-12 h-14 bg-surface/50 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:border-primary focus:outline-none transition-colors"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs font-semibold px-2">
            <span className={`${timeLeft < 60 ? 'text-red-400' : 'text-gray-400'}`}>
              Expires in: {formatTime(timeLeft)}
            </span>
            <span className="text-gray-400">
              Attempts: <span className={attempts === 1 ? 'text-red-400' : 'text-primary'}>{attempts}</span> remaining
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading || timeLeft === 0 || otp.join('').length !== 6}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-4 transition-all shadow-[0_8px_30px_rgb(var(--primary),0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Verify Account <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm">Didn't receive the code?</p>
          <button 
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
