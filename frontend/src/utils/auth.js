const SELECTED_ROLE_KEY = "selected_role";

function normalizeRole(value) {
  return value === "recruiter" ? "recruiter" : "student";
}

export function readAuth() {
  const token = localStorage.getItem("token");
  const role = normalizeRole(localStorage.getItem("role"));
  const isVerified = localStorage.getItem("is_verified") === "true";

  return {
    token,
    role,
    isVerified,
  };
}

export function storeAuth({ token, role = "student", is_verified = false }) {
  const normalizedRole = normalizeRole(role);
  if (token) {
    localStorage.setItem("token", token);
  }
  localStorage.setItem("role", normalizedRole);
  localStorage.setItem("is_verified", String(Boolean(is_verified)));
  setSelectedRole(normalizedRole);
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("is_verified");
}

export function getPostLoginPath(role, isVerified) {
  if (role === "recruiter") {
    return isVerified ? "/recruiter" : "/pending-approval";
  }
  return "/dashboard";
}

export function setSelectedRole(role) {
  localStorage.setItem(SELECTED_ROLE_KEY, normalizeRole(role));
}

export function getSelectedRole() {
  return normalizeRole(localStorage.getItem(SELECTED_ROLE_KEY));
}
