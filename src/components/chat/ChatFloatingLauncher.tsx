'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ChatFloatingLauncher() {
  const pathname = usePathname();
  const [pulse, setPulse] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);

  // Gentle one-time attention pulse after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setPulse(true);
      const stopTimer = setTimeout(() => setPulse(false), 2400);
      return () => clearTimeout(stopTimer);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Suppress floating button when already on the dedicated /chat page
  if (pathname === '/chat') return null;

  return (
    <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 select-none">
      <Link
        href="/chat"
        onMouseEnter={() => setHasHovered(true)}
        onMouseLeave={() => setHasHovered(false)}
        aria-label="Open Nothi AI Legal Assistant Chat"
        className={`group flex items-center h-14 rounded-full bg-green-deep hover:bg-green-mid text-paper shadow-2xl border-2 border-brass/60 transition-all duration-300 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:outline-hidden ${
          pulse ? 'animate-bounce shadow-[0_0_24px_rgba(176,141,87,0.5)]' : ''
        } ${hasHovered ? 'px-5' : 'w-14 justify-center'}`}
      >
        {/* Chat Icon */}
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h8" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 14h5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Expandable Label on Hover */}
        <span
          className={`font-sans text-xs font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${
            hasHovered ? 'max-w-xs pl-2.5 opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          Chat with Nothi AI →
        </span>
      </Link>
    </div>
  );
}
