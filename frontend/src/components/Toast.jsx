import React from "react";
import { Toaster, toast } from "react-hot-toast";

const baseToastOptions = {
  duration: 4000,
  className: "!rounded-2xl !shadow-xl !px-4 !py-3 !text-sm !font-medium",
  style: {
    borderRadius: "1rem",
    background: "#0f172a",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.24)",
  },
};

function makeToast(type, message, options = {}) {
  return toast[type](message, {
    ...baseToastOptions,
    ...options,
  });
}

export function showSuccess(message, options) {
  return makeToast("success", message, options);
}

export function showError(message, options) {
  return makeToast("error", message, options);
}

export function showInfo(message, options) {
  return toast(message, {
    ...baseToastOptions,
    icon: "i",
    ...options,
  });
}

export function showWarning(message, options) {
  return toast(message, {
    ...baseToastOptions,
    icon: "!",
    style: {
      ...baseToastOptions.style,
      background: "#78350f",
      color: "#fffbeb",
      border: "1px solid rgba(251, 191, 36, 0.24)",
    },
    ...options,
  });
}

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      toastOptions={baseToastOptions}
      containerStyle={{
        top: 20,
        right: 20,
      }}
    />
  );
}

export function useToast() {
  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    dismiss: toast.dismiss,
  };
}
