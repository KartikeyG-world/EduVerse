import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import AuthProvider from './context/AuthContext';
import { ToastProvider } from './components/ui/ToastProvider';
import { InteractionProvider } from './context/InteractionContext';
import ClickImpact from './components/ui/ClickImpact';

// Pages
import Dashboard from './pages/Dashboard';
import StudyPlanner from './pages/StudyPlanner';
import FocusMode from './pages/FocusMode';
import SmartNotes from './pages/SmartNotes';
import SkillsHub from './pages/SkillsHub';
import LearningView from './pages/LearningView';
import Analytics from './pages/Analytics';
import ExpenseTracker from './pages/ExpenseTracker';
import Chatbot from './pages/Chatbot';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Profile from './pages/Profile';
import Tutor from './pages/Tutor';
import FlashcardStudy from './pages/FlashcardStudy'; // Phase 2: SRS

import { CompanionProvider } from './context/CompanionContext';
import { FocusProvider } from './context/FocusContext';
import AuthModal from './components/ui/AuthModal';
import { ThemeProvider } from './context/ThemeContext';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';

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
