import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProblemSolver } from './pages/ProblemSolver';
import { Snapshots } from './pages/Snapshots';
import { SnapshotDetail } from './pages/SnapshotDetail';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/problem" element={
        <ProtectedRoute>
          <ProblemSolver />
        </ProtectedRoute>
      } />
      <Route path="/snapshots" element={
        <ProtectedRoute>
          <Snapshots />
        </ProtectedRoute>
      } />
      <Route path="/snapshots/:id" element={
        <ProtectedRoute>
          <SnapshotDetail />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}