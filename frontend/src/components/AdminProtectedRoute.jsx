import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getProfile } from "../services/api";
import { getPostLoginPath, readAuth } from "../utils/auth";

/**
 * Protects admin routes: requires auth and is_admin.
 * Redirects to /login if not authenticated, /dashboard if not admin.
 */
export default function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const { token, role, isVerified } = readAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    async function checkAdmin() {
      try {
        const res = await getProfile();
        setIsAdmin(res.data?.is_admin === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }
    checkAdmin();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (checking) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to={getPostLoginPath(role, isVerified)} replace />;
  }

  return children;
}
