import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import AuthProvider from './context/AuthContext';
import { ToastProvider } from './components/ui/ToastProvider';
import { Toaster } from 'react-hot-toast';
import { InteractionProvider } from './context/InteractionContext';
import ClickImpact from './components/ui/ClickImpact';

// FIX 16: Lazy-load all 17 page components for optimal bundle splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const FocusMode = lazy(() => import('./pages/FocusMode'));
const SmartNotes = lazy(() => import('./pages/SmartNotes'));
const SkillsHub = lazy(() => import('./pages/SkillsHub'));
const LearningView = lazy(() => import('./pages/LearningView'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ExpenseTracker = lazy(() => import('./pages/ExpenseTracker'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyOTP = lazy(() => import('./pages/auth/VerifyOTP'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Tutor = lazy(() => import('./pages/Tutor'));
const FlashcardStudy = lazy(() => import('./pages/FlashcardStudy')); // Phase 2: SRS

import { CompanionProvider } from './context/CompanionContext';
import { FocusProvider } from './context/FocusContext';
import AuthModal from './components/ui/AuthModal';
import { ThemeProvider } from './context/ThemeContext';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Centered loading spinner fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CompanionProvider>
              <FocusProvider>
                <InteractionProvider>
                  <ClickImpact />
                  <AuthModal />
                  <Toaster 
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#18181b',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/verify-otp" element={<VerifyOTP />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password/:token" element={<ResetPassword />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />

                      {/* Full-screen learning view — outside Layout so it owns the full viewport */}
                      <Route path="/skills/:id/learn" element={<LearningView />} />

                      <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="planner" element={<StudyPlanner />} />
                        <Route path="focus" element={<FocusMode />} />
                        <Route path="notes" element={<SmartNotes />} />
                        <Route path="skills" element={<SkillsHub />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="expenses" element={<ExpenseTracker />} />
                        <Route path="chat" element={<Chatbot />} />
                        <Route path="tutor" element={<Tutor />} />
                        <Route path="profile" element={<Profile />} />
                        {/* Phase 2: SRS study route */}
                        <Route path="flashcards/study" element={<FlashcardStudy />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
              </InteractionProvider>
            </FocusProvider>
          </CompanionProvider>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
