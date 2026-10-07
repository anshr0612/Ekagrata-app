import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import LiveSession from './pages/LiveSession';
import Samiksha from './pages/Samiksha';
import Journey from './pages/Journey';
import Methods from './pages/Methods';
import Rewards from './pages/Rewards';
import Privacy from './pages/Privacy';
import Settings from './pages/Settings';

export default function App() {
  const { onboarded, activeSession } = useApp();

  if (!onboarded) {
    return (
      <ErrorBoundary>
        <Onboarding />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={activeSession ? <Navigate to="/session" /> : <Home />} />
          <Route path="/session" element={<LiveSession />} />
          <Route path="/samiksha" element={<Samiksha />} />
          <Route path="/samiksha/:sessionId" element={<Samiksha />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/methods" element={<Methods />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/teachings" element={<Navigate to="/methods" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
