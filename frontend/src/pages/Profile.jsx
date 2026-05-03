import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, ShieldCheck, ShieldAlert, Calendar, Clock, Edit2, Check, X, Lock, Activity, Award, Flame, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import ScrollReveal from '../components/ui/ScrollReveal';

const Profile = () => {
  const { user, updateUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (name.length < 2) return toast.error('Name must be at least 2 characters');
    
    setLoading(true);
    try {
      const res = await api.put('/auth/update-profile', { name, avatar });
      updateUser(res.data);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <User size={40} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-white">Your Profile</h1>
        <p className="text-gray-400">
          Sign in to view your learning statistics, track your progress, and customize your account settings.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-4 transition-all shadow-lg shadow-primary/20"
        >
          Sign In
        </button>
        <p className="text-sm text-gray-500">
          New here? <button onClick={() => navigate('/register')} className="text-primary hover:underline font-bold">Create an Account</button>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors font-medium text-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - User Info */}
        <div className="md:col-span-1 space-y-6">
          <ScrollReveal className="glass-card-hover p-6 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/20 to-accent/20 z-0"></div>
            
            <div className="relative z-10 pt-4">
              <div className="w-24 h-24 mx-auto bg-surface/80 border-2 border-primary/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-xl shadow-primary/20">
                {isEditing ? (
                  <div className="w-full h-full flex items-center justify-center bg-surface/50">
                    <User size={32} className="text-gray-400" />
                  </div>
                ) : user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-primary">{getInitials(user.name)}</span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 mb-2 text-left">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-1">Full Name</label>
                    <input 
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-1">Avatar URL</label>
                    <input 
                      type="text" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..."
                      className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg py-2 flex justify-center font-bold">
                      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Check size={18} />}
                    </button>
                    <button onClick={() => { setIsEditing(false); setName(user.name); setAvatar(user.avatar || ''); }} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg py-2 flex justify-center">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white mb-1 truncate">{user.name}</h2>
                  <p className="text-gray-400 text-sm flex items-center justify-center gap-1.5 truncate mb-4">
                    <Mail size={14} className="text-primary flex-shrink-0" /> {user.email}
                  </p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2 flex items-center justify-center gap-2 transition-colors text-sm font-semibold"
                  >
                    <Edit2 size={14} /> Edit Profile
                  </button>
                </>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="glass-card-hover p-6">
             <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck size={16} /> Security
             </h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.isVerified ? <Check size={16} /> : <ShieldAlert size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.isVerified ? 'Verified Account' : 'Unverified'}</p>
                      <p className="text-xs text-gray-500">Email status</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Just now'}</p>
                      <p className="text-xs text-gray-500">Last login</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">Member since</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/forgot-password')}
                  className="w-full bg-surface/50 hover:bg-white/5 border border-white/10 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors text-sm font-semibold mt-4"
                >
                  <Lock size={14} /> Change Password
                </button>
             </div>
          </ScrollReveal>
        </div>

        {/* Right Column - Stats */}
        <div className="md:col-span-2 space-y-6">
          <ScrollReveal delay={0.2}>
            <h3 className="text-lg font-bold text-white mb-4">Learning Stats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card-hover p-6 border-t-2 border-t-accent flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-3">
                  <Award size={24} className="text-accent" />
                </div>
                <h4 className="text-3xl font-black text-white">{user.level || 1}</h4>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Current Level</p>
              </div>

              <div className="glass-card-hover p-6 border-t-2 border-t-primary flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                  <Activity size={24} className="text-primary" />
                </div>
                <h4 className="text-3xl font-black text-white">{user.xp || 0}</h4>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total XP</p>
              </div>

              <div className="glass-card-hover p-6 border-t-2 border-t-orange-500 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-3">
                  <Flame size={24} className="text-orange-500" />
                </div>
                <h4 className="text-3xl font-black text-white">{user.streak || 0} <span className="text-sm font-medium text-gray-500">days</span></h4>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Active Streak</p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3} className="glass-card-hover p-6 min-h-[250px] flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 inner-shadow">
                <Activity size={28} className="text-gray-600" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Activity Graph Coming Soon</h3>
             <p className="text-gray-500 max-w-sm">We're building an advanced neural map to track your learning journey over time.</p>
          </ScrollReveal>
        </div>

      </div>
    </div>
  );
};

export default Profile;
