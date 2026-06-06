const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const PROVIDER_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    envKey: "VITE_GOOGLE_CLIENT_ID",
    scope: "openid email profile",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    envKey: "VITE_GITHUB_CLIENT_ID",
    scope: "user:email",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    envKey: "VITE_LINKEDIN_CLIENT_ID",
    scope: "openid profile email",
  },
};

function maskValue(value) {
  if (!value) {
    return "(missing)";
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function getOAuthConfig(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const clientId = (import.meta.env[config.envKey] || "").trim();
  const redirectUri = `${API_BASE_URL}/api/auth/${provider}/callback`;

  console.info(
    `[OAuth][${provider}] clientId=${maskValue(clientId)} redirectUri=${redirectUri}`
  );

  return {
    ...config,
    clientId,
    redirectUri,
  };
}

export function startOAuth(provider) {
  const { authUrl, clientId, redirectUri, scope, envKey } = getOAuthConfig(provider);

  if (!clientId) {
    const message = `Missing ${envKey}. Add it to frontend/.env and restart Vite.`;
    console.error(`[OAuth][${provider}] ${message}`);
    return { ok: false, message };
  }

  const url = new URL(authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);

  window.location.href = url.toString();
  return { ok: true };
}

