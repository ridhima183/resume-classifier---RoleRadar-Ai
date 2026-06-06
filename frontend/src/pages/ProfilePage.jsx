import React, { useEffect, useState } from "react";
import { getProfile, updatePassword, editProfile, uploadAvatar, getSecurityInfo, deleteAccount } from "../services/api";
import { useToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [securityInfo, setSecurityInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const toast = useToast();

  // Load profile data on mount
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const profileRes = await getProfile();
        setUser(profileRes.data);
        setEditName(profileRes.data.name);
        setEditEmail(profileRes.data.email);
        setAvatarPreview(profileRes.data.avatar_url);

        const securityRes = await getSecurityInfo();
        setSecurityInfo(securityRes.data);
      } catch (err) {
        const msg = err.response?.data?.detail || "Failed to load profile.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Handle edit profile submit
  async function handleEditProfile(e) {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");

    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Name and email are required.");
      return;
    }

    setEditLoading(true);
    try {
      const res = await editProfile({
        name: editName.trim(),
        email: editEmail.trim(),
      });
      setUser(res.data);
      setEditSuccess(res.data.message || "Profile updated successfully.");
      toast.success("Profile updated successfully.");
      setEditMode(false);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update profile.";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  }

  // Handle avatar upload
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setAvatarError("Only PNG and JPG images are allowed.");
      toast.error("Only PNG and JPG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("File size exceeds 5MB limit.");
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target.result;
      setAvatarPreview(preview);

      // Upload
      setAvatarLoading(true);
      setAvatarError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadAvatar(formData);
        setAvatarPreview(res.data.avatar_url);
        toast.success("Avatar uploaded successfully.");
      } catch (err) {
        const msg = err.response?.data?.detail || "Failed to upload avatar.";
        setAvatarError(msg);
        toast.error(msg);
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Handle password change
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully.");
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to update password.";
      setPasswordError(typeof msg === "string" ? msg : "Failed to update password.");
      toast.error(typeof msg === "string" ? msg : "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // Handle account deletion
  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      setDeleteError("Password is required for account deletion.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword, true);
      toast.success("Account deleted successfully.");
      localStorage.removeItem("token");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to delete account.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary dark:border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
        {error || "Failed to load profile."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Profile Header with Avatar */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:items-start gap-4">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover border-2 border-primary dark:border-indigo-400"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 dark:from-indigo-400 dark:to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleAvatarUpload}
                disabled={avatarLoading}
                id="avatar-input"
                className="hidden"
              />
              <label
                htmlFor="avatar-input"
                className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 inline-block"
              >
                {avatarLoading ? "Uploading..." : "Change Avatar"}
              </label>
            </div>
            {avatarError && (
              <p className="text-xs text-red-600 dark:text-red-400">{avatarError}</p>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {user.name}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{user.email}</p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Member since {formatDate(user.account_created_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Profile Information
          </h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Edit
            </button>
          )}
        </div>

        {editSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-400">
            {editSuccess}
          </div>
        )}
        {editError && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
            {editError}
          </div>
        )}

        {editMode ? (
          <form onSubmit={handleEditProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={editLoading}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-1">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-gray-100">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-gray-100">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined</dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-gray-100">
                {formatDate(user.account_created_date)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Security Information */}
      {securityInfo && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Security Information
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Verified</dt>
              <dd className="mt-1 text-base">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  securityInfo.email_verified
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                }`}>
                  {securityInfo.email_verified ? '✓ Verified' : 'Pending'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</dt>
              <dd className="mt-1 text-base">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  securityInfo.is_active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {securityInfo.is_active ? '✓ Active' : 'Disabled'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-gray-100">
                {formatDate(securityInfo.account_created_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-gray-100">
                {securityInfo.last_login ? formatDate(securityInfo.last_login) : 'Never'}
              </dd>
            </div>
            {securityInfo.oauth_provider && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Login Provider</dt>
                <dd className="mt-1 text-base text-gray-900 dark:text-gray-100 capitalize">
                  {securityInfo.oauth_provider}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Change Password */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your password to keep your account secure
        </p>

        {passwordSuccess && (
          <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-400">
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 characters with uppercase, numbers, and special characters recommended
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Delete Account Section */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">
          Danger Zone
        </h2>
        <p className="mt-2 text-sm text-red-800 dark:text-red-400">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="rounded-lg bg-white dark:bg-gray-800 max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete Account?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

