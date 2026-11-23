'use client';

import { useSyncExternalStore } from 'react';

export interface NothiUser {
  id: string;
  name: string;
  email: string;
  chamber: string;
  barNumber?: string;
  plan: 'free' | 'basic' | 'pro';
  role: 'Advocate' | 'Legal Officer' | 'Senior Counsel';
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

// Subscribe function for useSyncExternalStore
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

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signIn = (newUser: NothiUser) => {
    setStoredUser(newUser);
  };

  const signOut = () => {
    clearStoredUser();
  };

  return {
    user,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };
}
