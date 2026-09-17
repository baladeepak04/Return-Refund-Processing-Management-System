import React, { createContext, useContext, useState } from 'react';

import { login as loginApi } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('rrpms_user');
    return raw ? JSON.parse(raw) : null;
  });

  function signIn(userData, token) {
    localStorage.setItem('rrpms_user', JSON.stringify(userData));
    if (token) localStorage.setItem('rrpms_token', token);
    setUser(userData);
  }

  function signOut() {
    localStorage.removeItem('rrpms_user');
    localStorage.removeItem('rrpms_token');
    setUser(null);
  }

  async function loginAsDemo(email, password = 'Password123!') {
    const res = await loginApi({ email, password });
    const { token, id, name, email: userEmail, role: userRole } = res.data;
    const userData = { id, name, email: userEmail, role: userRole.toLowerCase() };
    signIn(userData, token);
    return userData;
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, logout: signOut, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
