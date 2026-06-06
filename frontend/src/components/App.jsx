import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../components/Toast';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import RecruiterSignupPage from '../pages/RecruiterSignupPage';
import DashboardPage from '../pages/DashboardPage';
import RecruiterDashboardPage from '../pages/RecruiterDashboardPage';
import PendingApprovalPage from '../pages/PendingApprovalPage';
import ProfilePage from '../pages/ProfilePage';
import HistoryPage from '../pages/HistoryPage';
import AnalysisPage from '../pages/AnalysisPage';
import UploadResumePage from '../pages/UploadResumePage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import ProtectedRoute from './ProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';
import DashboardLayout from './DashboardLayout';
import Layout from './Layout';
import PageLoader from './PageLoader';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/recruiter-signup" element={<RecruiterSignupPage />} />
              <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
              <Route path="/reset-password" element={<div>Reset Password Page</div>} />

              {/* Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout>
                      <HistoryPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout>
                      <UploadResumePage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analysis/:id"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout>
                      <AnalysisPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Recruiter Routes */}
              <Route
                path="/recruiter"
                element={
                  <ProtectedRoute requireVerifiedRecruiter={true}>
                    <DashboardLayout>
                      <RecruiterDashboardPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending-approval"
                element={
                  <ProtectedRoute allowedRoles={['recruiter']}>
                    <DashboardLayout>
                      <PendingApprovalPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ProfilePage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <div>Admin Dashboard</div>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminProtectedRoute>
                    <AdminUsersPage />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={<Navigate to="/admin" replace />}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

