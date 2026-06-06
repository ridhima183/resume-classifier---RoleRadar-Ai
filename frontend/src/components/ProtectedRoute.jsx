import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getPostLoginPath, readAuth } from "../utils/auth";

export default function ProtectedRoute({
  children,
  allowedRoles = null,
  requireVerifiedRecruiter = false,
}) {
  const location = useLocation();
  const { token, role, isVerified } = readAuth();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict recruiter pending redirect
  if (role === "recruiter" && !isVerified) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getPostLoginPath(role, isVerified)} replace />;
  }

  if (requireVerifiedRecruiter && (role !== "recruiter" || !isVerified)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}
