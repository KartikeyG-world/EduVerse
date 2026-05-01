import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Modal Display State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasPromptedSoftly, setHasPromptedSoftly] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
         try {
             // Configure API header natively
             api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
             const res = await api.get('/auth/me');
             setUser(res.data);
             setIsAuthenticated(true);
             setIsGuest(false);
         } catch (e) {
             console.error("Token verification failed, defaulting back to guest.", e);
             localStorage.removeItem("token");
             delete api.defaults.headers.common['Authorization'];
             setIsGuest(true);
             setIsAuthenticated(false);
             setUser(null);
         }
      } else {
         setIsGuest(true);
         setIsAuthenticated(false);
         setUser(null);
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  // 15-second soft prompt for SaaS "Try-Before-You-Buy"
  useEffect(() => {
     if (!loading && isGuest && !hasPromptedSoftly && !showAuthModal) {
         const timer = setTimeout(() => {
             setShowAuthModal(true);
             setHasPromptedSoftly(true);
         }, 15000);
         return () => clearTimeout(timer);
     }
  }, [loading, isGuest, hasPromptedSoftly, showAuthModal]);


  const login = (token, userData) => {
    localStorage.setItem("token", token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
    // Hard refresh resets all react contexts beautifully wiping data views
    window.location.reload();
  };

  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  // Higher Order Wrapper -> Native Gate keeping write-actions effectively securely
  const requireAuth = (callback) => {
     if (isAuthenticated) {
         callback();
     } else {
         setShowAuthModal(true);
     }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAuthenticated, 
        isGuest, 
        login, 
        logout, 
        updateUser, 
        loading,
        showAuthModal,
        setShowAuthModal,
        requireAuth
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
