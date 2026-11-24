'use client';

import { useSyncExternalStore, useEffect } from 'react';
import { serverApi } from '@/lib/api';

export interface NothiUser {
  id: string;
  name: string;
  email: string;
  chamber?: string;
  barNumber?: string;
  plan?: 'free' | 'basic' | 'pro';
  role: 'admin' | 'user';
}

const STORAGE_KEY = 'nothi_ai_user_v1';
const EVENT_NAME = 'nothi_auth_changed';

export function getStoredUser(): NothiUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: NothiUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (err) {
    console.error('Failed to clear user session:', err);
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
}

let cachedUserJson: string | null = null;
let cachedUserObj: NothiUser | null = null;

function getSnapshot(): NothiUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedUserJson) {
      cachedUserJson = raw;
      cachedUserObj = raw ? JSON.parse(raw) : null;
    }
    return cachedUserObj;
  } catch {
    return null;
  }
}

function getServerSnapshot(): NothiUser | null {
  return null;
}

let sessionChecked = false;

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Synchronize session with backend httpOnly cookie on client mount
  useEffect(() => {
    if (typeof window === 'undefined' || sessionChecked) return;
    sessionChecked = true;

    serverApi.auth
      .getSession()
      .then(({ user: serverUser }) => {
        if (serverUser) {
          const current = getStoredUser();
          const updated: NothiUser = {
            id: serverUser.id,
            name: current?.name || serverUser.username.split('@')[0],
            email: serverUser.username,
            chamber: current?.chamber || (serverUser.role === 'admin' ? 'Chamber Administrator' : 'Chamber Counsel'),
            plan: serverUser.role === 'admin' ? 'pro' : 'basic',
            role: serverUser.role,
          };
          setStoredUser(updated);
        } else if (getStoredUser()) {
          clearStoredUser();
        }
      })
      .catch((err) => {
        console.warn('Could not verify server auth session:', err);
      });
  }, []);

  const signIn = async (credentials: { email: string; password: string; name?: string; chamber?: string }) => {
    const { user: serverUser } = await serverApi.auth.signIn({
      username: credentials.email,
      password: credentials.password,
    });

    const displayName =
      credentials.name ||
      credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const authUser: NothiUser = {
      id: serverUser.id,
      name: displayName.length > 2 ? displayName : 'Advocate',
      email: serverUser.username,
      chamber: credentials.chamber || (serverUser.role === 'admin' ? 'Chamber Administrator' : 'Chamber Counsel'),
      plan: serverUser.role === 'admin' ? 'pro' : 'basic',
      role: serverUser.role,
    };

    setStoredUser(authUser);
    return authUser;
  };

  const register = async (credentials: { email: string; password: string; name?: string; chamber?: string }) => {
    const { user: serverUser } = await serverApi.auth.register({
      username: credentials.email,
      password: credentials.password,
    });

    const displayName =
      credentials.name ||
      credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const authUser: NothiUser = {
      id: serverUser.id,
      name: displayName,
      email: serverUser.username,
      chamber: credentials.chamber || 'Chamber Counsel',
      plan: 'basic',
      role: serverUser.role,
    };

    setStoredUser(authUser);
    return authUser;
  };

  const signOut = async () => {
    try {
      await serverApi.auth.signOut();
    } catch (err) {
      console.warn('Server sign-out request failed:', err);
    } finally {
      clearStoredUser();
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signIn,
    register,
    signOut,
  };
}
