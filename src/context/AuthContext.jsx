import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Please try again.');
    error.code = payload.code || '';
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authCapabilities, setAuthCapabilities] = useState({
    emailVerification: false,
    passwordRecovery: false,
    oauth: { google: false, apple: false },
  });

  const refreshUser = useCallback(async () => {
    try {
      const payload = await api('/api/auth/me', { method: 'GET', headers: { Accept: 'application/json' } });
      setUser(payload.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    api('/api/auth/providers', { method: 'GET', headers: { Accept: 'application/json' } })
      .then(setAuthCapabilities)
      .catch(() => {});
  }, [refreshUser]);

  const signIn = useCallback(async (fields) => {
    const payload = await api('/api/auth/signin', { method: 'POST', body: JSON.stringify(fields) });
    setUser(payload.user);
    return payload.user;
  }, []);

  const signUp = useCallback(async (fields) => {
    const payload = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(fields) });
    if (payload.user) setUser(payload.user);
    return payload;
  }, []);

  const verifyEmail = useCallback(async (fields) => {
    const payload = await api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify(fields) });
    setUser(payload.user);
    return payload.user;
  }, []);

  const resendVerification = useCallback((fields) => api('/api/auth/resend-verification', {
    method: 'POST', body: JSON.stringify(fields),
  }), []);

  const requestPasswordReset = useCallback((fields) => api('/api/auth/forgot-password', {
    method: 'POST', body: JSON.stringify(fields),
  }), []);

  const resetPassword = useCallback((fields) => api('/api/auth/reset-password', {
    method: 'POST', body: JSON.stringify(fields),
  }), []);

  const signOut = useCallback(async () => {
    await api('/api/auth/signout', { method: 'POST' });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const payload = await api('/api/profile', { method: 'PUT', body: JSON.stringify(fields) });
    setUser(payload.user);
    return payload.user;
  }, []);

  const value = useMemo(() => ({
    user, isLoading, authCapabilities, signIn, signUp, verifyEmail,
    resendVerification, requestPasswordReset, resetPassword,
    signOut, updateProfile, refreshUser,
  }), [user, isLoading, authCapabilities, signIn, signUp, verifyEmail,
    resendVerification, requestPasswordReset, resetPassword,
    signOut, updateProfile, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
}
