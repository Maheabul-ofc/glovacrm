'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  isOwner?: boolean;
  tenantName?: string;
  tenantPlan?: string;
}

interface TrialInfo {
  isTrialActive: boolean;
  daysLeft: number;
  trialEndsAt: string;
}

interface AuthContextType {
  user: User | null;
  trialInfo: TrialInfo | null;
  loading: boolean;
  login: (data: any) => Promise<User>;
  logout: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety fallback: Never keep page in infinite loading state
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (isMounted) {
            setUser(res.data.user);
            setTrialInfo(res.data.trialInfo || null);
          }
        } catch (error) {
          console.warn('Session expired or invalid');
          localStorage.removeItem('accessToken');
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        if (isMounted) setLoading(false);
      }
    };
    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (credentials: any): Promise<User> => {
    const res = await api.post('/auth/login', credentials);
    const { accessToken, user, trialInfo } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    setTrialInfo(trialInfo || null);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setTrialInfo(null);
    window.location.href = '/login';
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, trialInfo, loading, login, logout, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
