'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import { SignInModal } from '@/components/auth/SignInModal';

const subscribeReducedMotion = (callback: () => void) => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};
const getReducedMotionSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getReducedMotionServerSnapshot = () => false;

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function Header() {
  const { lang, setLang } = useLang();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const isHome = pathname === '/';

  // Scroll, mount & auth states
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<'home' | 'explore' | 'who-its-for' | 'citations' | 'pricing'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const lastScrollY = useRef(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll listener for: 24px solid transition, auto-hide on scroll down, and scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. Transparent vs Solid threshold (24px)
      setIsScrolled(currentScrollY > 24);

      // 2. Auto-hide on scroll down and reappear on scroll up (only on landing page, below hero)
      if (isHome) {
        if (currentScrollY <= 24) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY.current && currentScrollY > 600) {
          // Scrolling down past initial hero: hide header
          setIsVisible(false);
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling up: reveal header
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // 3. Scroll-spy for landing page
      if (isHome) {
        const sections: Array<'pricing' | 'citations' | 'who-its-for' | 'explore'> = [
          'pricing',
          'citations',
          'who-its-for',
          'explore',
        ];
        let found = false;
        for (const id of sections) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            // If top is within upper third of viewport
            if (rect.top <= 200 && rect.bottom >= 100) {
              setActiveSection(id);
              found = true;
              break;
            }
          }
        }
        if (!found && currentScrollY < 500) {
          setActiveSection('home');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Lock body scroll and trap focus when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
          menuButtonRef.current?.focus();
        } else if (e.key === 'Tab' && mobileMenuRef.current) {
          const focusable = mobileMenuRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  // Nav link definitions (Explore Plans goes to plans, removed AI Assistant)
  const navLinks = [
    { id: 'pricing', labelEn: 'Explore Plans', labelBn: 'প্ল্যান অনুসন্ধান', href: isHome ? '#pricing' : '/pricing' },
    { id: 'who-its-for', labelEn: 'Who it’s for', labelBn: 'কার জন্য', href: isHome ? '#who-its-for' : '/#who-its-for' },
    { id: 'citations', labelEn: 'Citations', labelBn: 'আইনি ধারা', href: isHome ? '#citations' : '/#citations' },
  ];

  // If on dedicated /chat page, Header is suppressed in favor of the chat page's single authoritative header
  if (pathname === '/chat') {
    return null;
  }

  return (
    <>
      {/* ── ACCESSIBILITY: SKIP TO MAIN CONTENT LINK ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-6 focus:z-[100] focus:px-4 focus:py-2 focus:bg-green-deep focus:text-paper focus:font-sans focus:text-sm focus:font-semibold focus:rounded-xs focus:ring-2 focus:ring-brass focus:shadow-xl focus:outline-hidden"
      >
        Skip to main content
      </a>

      {/* ── STICKY SITE HEADER (72PX DESKTOP, 60PX MOBILE) ── */}
      <header
        className={`sticky top-0 z-50 w-full select-none transition-all duration-200 ${isVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
          } ${isScrolled
            ? 'bg-paper/90 backdrop-blur-xl border-b border-border/80 text-ink shadow-[0_4px_20px_-4px_rgba(27,67,50,0.06)]'
            : 'bg-paper/80 backdrop-blur-md border-b border-border/60 text-ink shadow-2xs'
          }`}
      >
        <div className="mx-auto flex h-[60px] md:h-[70px] max-w-[1280px] items-center justify-between px-3 sm:px-8 lg:px-12">

          {/* ── LEFT: ORIGINAL LOGO + WORDMARK ── */}
          <Link
            href="/"
            className="group flex items-center no-underline focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:outline-hidden rounded-xs transition-transform hover:scale-[1.01] shrink-0"
            aria-label="Nothi AI Home"
          >
            <Logo />
          </Link>

          {/* ── CENTER: DESKTOP NAVIGATION LINKS ── */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-1.5 lg:gap-2 px-3 py-1 rounded-full bg-paper-dark/40 border border-border/50"
          >
            {navLinks.map((link) => {
              const isActive = isHome && activeSection === link.id;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-3.5 py-1.5 text-xs lg:text-[13px] font-medium font-sans rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden ${isActive
                    ? 'bg-green-deep text-paper font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-dark/70'
                    }`}
                >
                  {lang === 'bn' ? link.labelBn : link.labelEn}
                </Link>
              );
            })}
          </nav>

          {/* ── RIGHT CONTROLS: LANGUAGE SWITCH, SIGN IN & DIRECT CHAT CTA ── */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Compact Two-Segment Language Switch "EN | বাং" */}
            <div
              role="radiogroup"
              aria-label="Select interface language"
              className="inline-flex p-0.5 rounded-full border border-border bg-paper-dark/70 transition-colors shadow-2xs"
            >
              <button
                type="button"
                role="radio"
                aria-checked={lang === 'en'}
                onClick={() => setLang('en')}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-sans transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer ${lang === 'en'
                  ? 'bg-green-deep text-paper font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
                  }`}
                title="Switch interface to English"
              >
                EN
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={lang === 'bn'}
                onClick={() => setLang('bn')}
                className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bangla transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer ${lang === 'bn'
                  ? 'bg-green-deep text-paper font-bold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
                  }`}
                title="ইন্টারফেস বাংলায় পরিবর্তন করুন"
              >
                বাং
              </button>
            </div>

            {/* Registration & Sign In / User Profile Options (Desktop/Tablet; on mobile available in hamburger drawer) */}
            <div className="flex items-center min-h-[32px]">
              {mounted && (
                user ? (
                  <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                    <Link
                      href={user.role === 'admin' ? '/admin' : '/dashboard'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-paper-dark/70 hover:bg-paper-dark text-ink font-sans text-xs font-semibold transition-all shadow-2xs hover:border-brass/60"
                      title={`Signed in as ${user.name}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-amber-600' : 'bg-emerald-600'} animate-pulse`} />
                      <span className="max-w-[110px] truncate">{user.name.replace('Advocate ', 'Adv. ')}</span>
                      <span className="text-[10px] font-mono uppercase px-1 rounded bg-paper border border-border/70 text-ink-muted">
                        {user.role}
                      </span>
                    </Link>

                    <Link
                      href={user.role === 'admin' ? '/admin' : '/dashboard'}
                      className="px-2.5 py-1.5 rounded-full text-xs font-sans font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/70 transition-colors"
                    >
                      {user.role === 'admin'
                        ? (lang === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel')
                        : (lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard')}
                    </Link>

                    <Link
                      href="/chat"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                      title="Open Nothi AI Chat"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{lang === 'bn' ? 'চ্যাট' : 'Chat'}</span>
                      <span className="text-brass">→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-xs font-sans font-medium text-ink-muted hover:text-vermillion px-2 py-1 rounded-full hover:bg-paper-dark transition-colors cursor-pointer"
                      title="Sign out of your account"
                    >
                      {lang === 'bn' ? 'সাইন আউট' : 'Sign out'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSignInModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brass/50 bg-paper hover:bg-paper-dark text-ink font-sans text-xs font-semibold transition-all shadow-2xs hover:border-brass cursor-pointer"
                    title="Sign in to your account"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{lang === 'bn' ? 'সাইন ইন' : 'Sign In'}</span>
                  </button>
                )
              )}
            </div>

            {/* Mobile Hamburger Menu Button (<1024px) */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-1.5 sm:p-2 rounded-xs border border-border text-ink hover:bg-paper-dark transition-colors focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* ── MOBILE FULL-WIDTH DROPDOWN MENU PANEL (<1024PX) ── */}
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className={`fixed inset-x-0 top-[60px] bottom-0 bg-paper text-ink z-50 p-6 flex flex-col justify-between overflow-y-auto border-t border-border shadow-2xl lg:hidden ${reducedMotion ? '' : 'animate-in slide-in-from-top-4 duration-200'
              }`}
          >
            {/* Nav list */}
            <div className="space-y-6 pt-2">
              <nav className="flex flex-col space-y-4">
                {navLinks.map((link) => {
                  const isActive = isHome && activeSection === link.id;
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-lg font-heading font-medium transition-colors py-1 flex items-center justify-between border-b border-border/40 ${isActive ? 'text-green-deep font-bold' : 'text-ink-muted hover:text-ink'
                        }`}
                    >
                      <span>{lang === 'bn' ? link.labelBn : link.labelEn}</span>
                      {isActive && <span className="text-xs font-mono text-brass">Active</span>}
                    </Link>
                  );
                })}

                {/* Direct Chat Link in Mobile Navigation (Only for Authenticated Users) */}
                {mounted && user && (
                  <>
                    <Link
                      href={user.role === 'admin' ? '/admin' : '/dashboard'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-heading font-semibold text-ink py-2 flex items-center justify-between border-b border-border/40"
                    >
                      <span>{user.role === 'admin' ? (lang === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel') : (lang === 'bn' ? 'ড্যাশবোর্ড' : 'User Dashboard')}</span>
                      <span className="text-xs font-mono font-bold text-brass">Panel →</span>
                    </Link>

                    <Link
                      href="/chat"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-heading font-semibold text-green-deep py-2 flex items-center justify-between border-b border-border/40"
                    >
                      <span className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{lang === 'bn' ? 'নথি এআই চ্যাট' : 'Chat with Nothi AI'}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-brass">Go →</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-border space-y-3">
              {mounted && user ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-paper-dark/60 border border-border text-xs">
                    <span className="text-ink-muted block text-[10px] uppercase font-mono">Signed in as</span>
                    <span className="font-bold text-ink text-sm block">{user.name}</span>
                    <span className="text-ink-muted text-xs font-mono">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-vermillion/40 text-vermillion font-sans text-xs font-semibold hover:bg-vermillion/10 transition-colors cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সাইন আউট' : 'Sign Out'}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSignInModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-green-deep text-paper font-sans text-xs font-bold uppercase tracking-wider hover:bg-green-mid shadow-md transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{lang === 'bn' ? 'নিবন্ধন ও সাইন ইন' : 'Register & Sign In'}</span>
                </button>
              )}

              <p className="text-center text-xs text-ink-muted font-sans pt-2">
                Team Boron • Pointfex Land Intelligence
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Chamber Sign In Modal */}
      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
      />
    </>
  );
}
