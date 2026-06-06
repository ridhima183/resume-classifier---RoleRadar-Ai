import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import DashboardLayout from "../components/DashboardLayout";
import AdminLayout from "../components/AdminLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import PageLoader from "../components/PageLoader";
import { ToastProvider } from "../components/Toast";

// Lazy load pages for code splitting
// Public pages
const LandingPage = lazy(() => import("./LandingPage"));
const LoginPage = lazy(() => import("./LoginPage"));
const SignupPage = lazy(() => import("./SignupPage"));
const RecruiterSignupPage = lazy(() => import("./RecruiterSignupPage"));
const ForgotPasswordPage = lazy(() => import("./ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./ResetPasswordPage"));
const PendingApprovalPage = lazy(() => import("./PendingApprovalPage"));

// Protected pages
const DashboardPage = lazy(() => import("./DashboardPage"));
const UploadResumePage = lazy(() => import("./UploadResumePage"));
const AnalysisPage = lazy(() => import("./AnalysisPage"));
const HistoryPage = lazy(() => import("./HistoryPage"));
const LinkedInImportPage = lazy(() => import("./LinkedInImportPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));
const RecruiterDashboardPage = lazy(() => import("./RecruiterDashboardPage"));

// Admin pages
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./AdminUsersPage"));
const AdminLogsPage = lazy(() => import("./AdminLogsPage"));
const AdminAnalyticsPage = lazy(() => import("./AdminAnalyticsPage"));
const AdminFeedbackPage = lazy(() => import("./AdminFeedbackPage"));

// Suspense wrapper for lazy-loaded routes
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader message="Loading page..." />}>
    {children}
  </Suspense>
);

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <SuspenseWrapper>
                <LandingPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/login"
          element={
            <Layout>
              <SuspenseWrapper>
                <LoginPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/signup"
          element={
            <Layout>
              <SuspenseWrapper>
                <SignupPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/recruiter-signup"
          element={
            <Layout>
              <SuspenseWrapper>
                <RecruiterSignupPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Layout>
              <SuspenseWrapper>
                <ForgotPasswordPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Layout>
              <SuspenseWrapper>
                <ResetPasswordPage />
              </SuspenseWrapper>
            </Layout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["student"]}>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <DashboardPage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/upload"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["student"]}>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <UploadResumePage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/analysis"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["student"]}>
                <SuspenseWrapper>
                  <AnalysisPage />
                </SuspenseWrapper>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/history"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["student"]}>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <HistoryPage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/linkedin-import"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["student"]}>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <LinkedInImportPage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <ProtectedRoute>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <ProfilePage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/pending-approval"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["recruiter"]}>
                <SuspenseWrapper>
                  <PendingApprovalPage />
                </SuspenseWrapper>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/recruiter"
          element={
            <Layout>
              <ProtectedRoute allowedRoles={["recruiter"]} requireVerifiedRecruiter>
                <DashboardLayout>
                  <SuspenseWrapper>
                    <RecruiterDashboardPage />
                  </SuspenseWrapper>
                </DashboardLayout>
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin"
          element={
            <Layout>
              <AdminProtectedRoute>
                <AdminLayout>
                  <SuspenseWrapper>
                    <AdminDashboardPage />
                  </SuspenseWrapper>
                </AdminLayout>
              </AdminProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Layout>
              <AdminProtectedRoute>
                <AdminLayout>
                  <SuspenseWrapper>
                    <AdminUsersPage />
                  </SuspenseWrapper>
                </AdminLayout>
              </AdminProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <Layout>
              <AdminProtectedRoute>
                <AdminLayout>
                  <SuspenseWrapper>
                    <AdminLogsPage />
                  </SuspenseWrapper>
                </AdminLayout>
              </AdminProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <Layout>
              <AdminProtectedRoute>
                <AdminLayout>
                  <SuspenseWrapper>
                    <AdminAnalyticsPage />
                  </SuspenseWrapper>
                </AdminLayout>
              </AdminProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <Layout>
              <AdminProtectedRoute>
                <AdminLayout>
                  <SuspenseWrapper>
                    <AdminFeedbackPage />
                  </SuspenseWrapper>
                </AdminLayout>
              </AdminProtectedRoute>
            </Layout>
          }
        />
      </Routes>
      <ToastProvider />
    </>
  );
}
