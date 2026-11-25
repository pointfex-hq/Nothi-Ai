'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import { SignInModal } from '@/components/auth/SignInModal';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const isAdmin = user?.role === 'admin';

  if (pathname === '/chat') return null;

  const links = mounted && user
    ? [
      { href: '/chat', label: lang === 'bn' ? 'চ্যাট' : 'Chat' },
      { href: '/audit', label: lang === 'bn' ? 'অডিট' : 'Audit' },
      { href: isAdmin ? '/admin' : '/dashboard', label: isAdmin ? (lang === 'bn' ? 'অ্যাডমিন' : 'Admin') : (lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard') },
      ...(isAdmin ? [{ href: '/admin/settings', label: lang === 'bn' ? 'সেটিংস' : 'Settings' }] : []),
    ]
    : [
      { href: '/pricing', label: lang === 'bn' ? 'প্ল্যান' : 'Plans' },
      { href: '/#explore', label: lang === 'bn' ? 'কীভাবে কাজ করে' : 'How it works' },
      { href: '/#who-its-for', label: lang === 'bn' ? 'কার জন্য' : 'For chambers' },
      { href: '/#citations', label: lang === 'bn' ? 'আইনি ধারা' : 'Citations' },
    ];

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut();
    router.replace('/');
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-green-deep focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-paper/95 text-ink shadow-2xs backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-brass" aria-label="Nothi AI home">
            <Logo />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-paper-dark ${pathname === link.href ? 'bg-green-deep text-paper hover:bg-green-deep' : 'text-ink-muted hover:text-ink'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div role="group" aria-label="Language" className="flex rounded-full border border-border p-0.5 text-xs">
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={`rounded-full px-2 py-1 ${lang === 'en' ? 'bg-green-deep text-paper' : 'text-ink-muted'}`}>EN</button>
              <button type="button" aria-pressed={lang === 'bn'} onClick={() => setLang('bn')} className={`rounded-full px-2 py-1 ${lang === 'bn' ? 'bg-green-deep text-paper' : 'text-ink-muted'}`}>বাং</button>
            </div>
            {mounted && user ? (
              <>
                <span className="hidden max-w-36 truncate text-xs text-ink-muted lg:inline" title={user.email}>{user.name}</span>
                <button type="button" onClick={() => void handleSignOut()} className="hidden rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-vermillion hover:text-vermillion sm:inline-flex">
                  {lang === 'bn' ? 'সাইন আউট' : 'Sign out'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setSignInOpen(true)} className="hidden rounded-full bg-green-deep px-4 py-2 text-xs font-semibold text-paper hover:bg-green-mid sm:inline-flex">
                {lang === 'bn' ? 'সাইন ইন' : 'Sign in'}
              </button>
            )}
            <button
              type="button"
              className="rounded-md border border-border p-2 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileOpen(open => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav id="site-mobile-nav" aria-label="Mobile navigation" className="space-y-1 border-t border-border bg-paper px-4 py-3 md:hidden">
            {links.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-paper-dark">
                {link.label}
              </Link>
            ))}
            {mounted && user ? (
              <button type="button" onClick={() => void handleSignOut()} className="w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-vermillion hover:bg-rose-50">Sign out</button>
            ) : (
              <button type="button" onClick={() => { setMobileOpen(false); setSignInOpen(true); }} className="w-full rounded-md px-3 py-3 text-left text-sm font-semibold text-green-deep hover:bg-paper-dark">Sign in</button>
            )}
          </nav>
        )}
      </header>
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
