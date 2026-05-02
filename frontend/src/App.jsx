import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import { AuthProvider } from './context/AuthContext';
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
import Login from './pages/Login';
import Register from './pages/Register';
import Tutor from './pages/Tutor';

import { CompanionProvider } from './context/CompanionContext';
import { FocusProvider } from './context/FocusContext';
import AuthModal from './components/ui/AuthModal';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastProvider>
          <CompanionProvider>
            <FocusProvider>
              <InteractionProvider>
                <ClickImpact />
                <AuthModal />
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

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
                </Route>
              </Routes>
              </InteractionProvider>
            </FocusProvider>
          </CompanionProvider>
        </ToastProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
