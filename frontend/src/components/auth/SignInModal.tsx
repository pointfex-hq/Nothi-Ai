'use client';

import { serverApi } from '@/lib/api';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'register' | 'signin';
}

export function SignInModal({ isOpen, onClose, defaultTab = 'signin' }: SignInModalProps) {
  const router = useRouter();
  const { signIn, register, user, signOut } = useAuth();

  // Tab mode: 'register' (Registration) or 'signin' (Sign In)
  const [activeTab, setActiveTab] = useState<'register' | 'signin'>(defaultTab);

  // Registration Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [chamber, setChamber] = useState('');
  const [registerScope, setRegisterScope] = useState(false);
  const [signInScope, setSignInScope] = useState(false);

  // Sign In Form Fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

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

  const handleGoogleSignIn = async (acknowledgeScope: boolean) => {
    if (!acknowledgeScope) {
      setError('Confirm that you understand the scope of Nothi AI.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const { url } = await serverApi.auth.beginGoogleSignIn(acknowledgeScope);
      window.location.assign(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in is unavailable.');
      setIsLoading(false);
    }
  };

  // Handle Live Backend Registration
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Password must be between 8 and 128 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        acknowledgeScope: registerScope,
        name: name.trim(),
        chamber: chamber.trim() || undefined,
      });
      setIsLoading(false);
      onClose();
      router.push('/dashboard');
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Registration failed. Try again.');
    }
  };

  // Handle Live Backend Sign In
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) {
      setError('Please enter your registered email address or username');
      return;
    }
    if (!signInPassword) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authUser = await signIn({
        email: signInEmail.trim().toLowerCase(),
        password: signInPassword,
        acknowledgeScope: signInScope,
      });
      setIsLoading(false);
      onClose();
      if (authUser.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Invalid username/email or password.');
    }
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
                : 'Enter your credentials to continue.'}
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
                  Active Session
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-emerald-800 text-paper shadow-2xs'
                      : 'bg-brass/20 text-ink'
                  }`}
                >
                  {user.role === 'admin' ? 'Administrator' : 'Legal Officer'}
                </span>
              </div>
              <div className="font-heading text-xl font-bold text-ink">{user.name}</div>
              <div className="text-xs font-mono text-ink-muted">{user.email}</div>
              {user.chamber && (
                <div className="text-xs font-sans text-ink-muted pt-1 flex items-center gap-1.5">
                  <span>Chamber:</span>
                  <span className="font-semibold text-ink">{user.chamber}</span>
                </div>
              )}
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
            {/* Two-Button Pill Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-paper-dark/70 border border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                className={`py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-green-deep text-paper shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
                className={`py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-green-deep text-paper shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Registration
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-vermillion/10 border border-vermillion/30 text-vermillion text-xs font-sans">
                {error}
              </div>
            )}

            {/* TAB 1: SIGN IN FORM */}
            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Email / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. admin@nothiai.com or user@nothiai.com"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-ink mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-paper-light text-sm font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden transition-all placeholder:text-ink-muted/50"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs font-sans text-ink">
                  <input type="checkbox" required checked={signInScope} onChange={(e) => setSignInScope(e.target.checked)} />
                  <span>I understand that Nothi AI is for Bangladeshi property law and document vetting.</span>
                </label>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In →'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn(signInScope)}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl border border-border bg-paper-light text-ink text-xs font-sans font-bold hover:border-brass transition-colors cursor-pointer disabled:opacity-50"
                >
                  Continue with Google
                </button>

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
            ) : (
              /* TAB 2: REGISTRATION FORM */
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
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
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

                <label className="flex items-start gap-2 text-xs font-sans text-ink">
                  <input type="checkbox" required checked={registerScope} onChange={(e) => setRegisterScope(e.target.checked)} />
                  <span>I understand that Nothi AI is for Bangladeshi property law and document vetting.</span>
                </label>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Registering...' : 'Register Account →'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn(registerScope)}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl border border-border bg-paper-light text-ink text-xs font-sans font-bold hover:border-brass transition-colors cursor-pointer disabled:opacity-50"
                >
                  Continue with Google
                </button>

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
