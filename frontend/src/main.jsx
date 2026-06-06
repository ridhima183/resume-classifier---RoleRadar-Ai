import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./pages/App";
import { ThemeProvider } from "./context/ThemeContext";
import { setAuthToken } from "./services/api";
import { readAuth } from "./utils/auth";
import "./index.css";

// Restore auth token from localStorage on app load
const { token } = readAuth();
if (token) setAuthToken(token);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
