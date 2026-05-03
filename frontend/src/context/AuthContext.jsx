// CHANGED FILE: frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isGuest, setIsGuest] = useState(!localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Modal Display State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasPromptedSoftly, setHasPromptedSoftly] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/auth/me');
          setUser(res.data);
          setIsAuthenticated(true);
          setIsGuest(false);
        } catch (e) {
          console.error("Token verification failed:", e);
          localStorage.removeItem("token");
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setIsAuthenticated(false);
          setIsGuest(true);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setIsGuest(true);
        setUser(null);
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  // 15-second soft prompt for Guest Experience
  useEffect(() => {
    const authPaths = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];
    const isAuthPath = authPaths.some(path => location.pathname.startsWith(path));

    // Force close modal if we navigate to an auth path
    if (isAuthPath && showAuthModal) {
      setShowAuthModal(false);
    }

    // Diagnostic Fix: Only show modal if NOT authenticated, NOT on auth page, 
    // NOT already dismissed this session, and NOT currently showing.
    const isDismissed = sessionStorage.getItem("authModalDismissed") === "true";

    if (!loading && isGuest && !hasPromptedSoftly && !showAuthModal && !isAuthPath && !isDismissed) {
      const timer = setTimeout(() => {
        // Re-check conditions inside timer to be safe
        const currentPath = window.location.pathname;
        const currentIsAuthPath = authPaths.some(path => currentPath.startsWith(path));
        
        if (!currentIsAuthPath && sessionStorage.getItem("authModalDismissed") !== "true") {
          setShowAuthModal(true);
          setHasPromptedSoftly(true);
        }
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading, isGuest, hasPromptedSoftly, showAuthModal, location.pathname]);

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
    sessionStorage.removeItem("authModalDismissed");
    window.location.href = '/';
  };

  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  const requireAuth = (callback) => {
    if (isAuthenticated) {
      if (callback) callback();
      return true;
    } else {
      setShowAuthModal(true);
      return false;
    }
  };

  // Enhanced close handler for the modal
  const closeAuthModal = () => {
    setShowAuthModal(false);
    if (isGuest) {
      sessionStorage.setItem("authModalDismissed", "true");
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        token,
        isAuthenticated, 
        isGuest,
        login, 
        logout, 
        updateUser, 
        loading,
        showAuthModal,
        setShowAuthModal,
        closeAuthModal, // Added for better session management
        requireAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthProvider;
