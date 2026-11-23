'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth, NothiUser } from '@/lib/auth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'register' | 'signin';
}

export function SignInModal({ isOpen, onClose, defaultTab = 'register' }: SignInModalProps) {
  const { signIn, user, signOut } = useAuth();

  // Tab mode: 'register' (Registration) or 'signin' (Sign In)
  const [activeTab, setActiveTab] = useState<'register' | 'signin'>(defaultTab);

  // Registration Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [chamber, setChamber] = useState('');

  // Sign In Form Fields
  const [signInEmail, setSignInEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Registration
  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const newUser: NothiUser = {
        id: 'usr_' + Date.now(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        chamber: chamber.trim() || 'Chamber Counsel',
        plan: 'basic',
        role: 'Advocate',
      };
      signIn(newUser);
      setIsLoading(false);
      onClose();
    }, 400);
  };

  // Handle Sign In (by email)
  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInEmail.includes('@')) {
      setError('Please enter a valid registered email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      // Derive name from email handle if signing in
      const emailUser = signInEmail.trim().toLowerCase();
      const derivedName = emailUser.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = derivedName
        ? derivedName.charAt(0).toUpperCase() + derivedName.slice(1)
        : 'Advocate';

      const existingUser: NothiUser = {
        id: 'usr_' + Date.now(),
        name: formattedName.length > 2 ? `Adv. ${formattedName}` : 'Adv. Rafiqul Islam',
        email: emailUser,
        chamber: 'Chamber Counsel',
        plan: 'basic',
        role: 'Advocate',
      };
      signIn(existingUser);
      setIsLoading(false);
      onClose();
    }, 350);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-paper shadow-2xl p-6 sm:p-8 space-y-6 relative text-ink animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Close Button */}
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brass font-bold">
              Chamber Access
            </span>
            <h2 id="auth-modal-title" className="font-heading text-2xl font-bold text-green-deep mt-0.5">
              {user
                ? 'Account Profile'
                : activeTab === 'register'
                  ? 'Register Your Account'
                  : 'Sign In to Workspace'}
            </h2>
            <p className="text-xs text-ink-muted font-sans mt-0.5">
              {user
                ? 'You are currently active in your chamber workspace.'
                : activeTab === 'register'
                  ? 'Create a registered account for statutory examinations.'
                  : 'Enter your registered email to continue.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-paper-dark font-mono text-sm focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── ALREADY SIGNED IN VIEW ── */}
        {user ? (
          <div className="space-y-5 py-1">
            <div className="p-4 rounded-xl bg-paper-dark/60 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-green-deep uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Active Account
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brass/20 text-ink font-bold font-mono uppercase">
                  {user.plan} tier
                </span>
              </div>
              <div className="font-heading text-xl font-bold text-ink">{user.name}</div>
              <div className="text-xs font-mono text-ink-muted">{user.email}</div>
              <div className="text-xs font-sans text-ink-muted pt-1 flex items-center gap-1.5">
                <span>Chamber:</span>
                <span className="font-semibold text-ink">{user.chamber}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex-1 py-2.5 rounded-xl border border-vermillion/40 text-vermillion hover:bg-vermillion/10 font-sans text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-green-deep text-paper hover:bg-green-mid font-sans text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── REGISTRATION & SIGN IN TABS ── */
          <div className="space-y-5">
            {/* Two-Button Pill Switcher: [ Registration | Sign In ] */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-paper-dark/70 border border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
                className={`py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'register'
                  ? 'bg-green-deep text-paper shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink'
                  }`}
              >
                Registration
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                className={`py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'signin'
                  ? 'bg-green-deep text-paper shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink'
                  }`}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-vermillion/10 border border-vermillion/30 text-vermillion text-xs font-sans">
                {error}
              </div>
            )}

            {/* TAB 1: REGISTRATION FORM */}
            {activeTab === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Adv. Rafiqul Islam"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rafiqul@chamber.com.bd"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Chamber / Organization <span className="font-normal text-ink-muted">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={chamber}
                    onChange={(e) => setChamber(e.target.value)}
                    placeholder="e.g. Supreme Court Bar Association"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Registering...' : 'Register Account →'}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setError(null);
                    }}
                    className="text-xs font-sans text-ink-muted hover:text-green-deep underline transition-colors cursor-pointer"
                  >
                    Already have an account? Sign in here
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: SIGN IN FORM */
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. rafiqul@chamber.com.bd"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In →'}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setError(null);
                    }}
                    className="text-xs font-sans text-ink-muted hover:text-green-deep underline transition-colors cursor-pointer"
                  >
                    New user? Register your account first
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-[11px] font-sans text-ink-muted pt-2 border-t border-border/60">
              Deterministic statutory examination for deeds, khatians and NIDs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
