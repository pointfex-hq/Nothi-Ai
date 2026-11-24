'use client';

import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang';

export function Footer() {
  const pathname = usePathname();
  const { lang } = useLang();

  // Suppress footer on dedicated chat page to give full 100dvh height without collisions
  if (pathname === '/chat') {
    return null;
  }

  return (
    <footer className="border-t border-border bg-paper-dark no-print">
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-8 lg:px-12 py-6 text-center sm:text-left">
        <p className="text-xs text-ink-muted font-sans">
          © 2026{' '}
          <a
            href="https://pointfex.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink hover:text-green-deep underline underline-offset-2 transition-colors"
          >
            Pointfex
          </a>{' '}
          • {lang === 'bn' ? 'টিম বোরন দ্বারা ডেভেলপকৃত' : 'Developed by Team Boron'} • Nothi AI v1.0
        </p>
        <p className="text-xs text-ink-muted font-mono">
          Bangladesh Legal Record & Deed Vetting • Deterministic Engine
        </p>
      </div>
    </footer>
  );
}
