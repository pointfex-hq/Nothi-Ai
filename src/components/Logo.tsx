'use client';

interface LogoProps {
  className?: string;
  isTransparent?: boolean;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 select-none ${className}`}>
      {/* ── ORIGINAL INLINE SVG MARK: DOSSIER FILE FOLDER ("NOTHI") WITH INSPECTION LENS ── */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width="34"
          height="34"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 sm:w-[34px] sm:h-[34px] transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          {/* Back folder silhouette with top tab */}
          <path
            d="M6 9C6 7.89543 6.89543 7 8 7H16.5C17.3 7 18.05 7.32 18.6 7.88L20.8 10.1H32C33.1046 10.1 34 10.9954 34 12.1V31C34 32.1046 33.1046 33 32 33H8C6.89543 33 6 32.1046 6 31V9Z"
            fill="rgba(27, 67, 50, 0.14)"
            stroke="#1b4332"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Clean archival document sheet protruding from folder */}
          <path
            d="M10 13C10 12.4477 10.4477 12 11 12H28C28.5523 12 29 12.4477 29 13V28H10V13Z"
            fill="#faf7f2"
            stroke="#1b4332"
            strokeWidth="1.2"
          />

          {/* Micro text lines on document sheet */}
          <line
            x1="13"
            y1="16"
            x2="23"
            y2="16"
            stroke="rgba(27, 67, 50, 0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="19.5"
            x2="20"
            y2="19.5"
            stroke="rgba(27, 67, 50, 0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Front folder flap */}
          <path
            d="M6 18C6 16.8954 6.89543 16 8 16H32C33.1046 16 34 16.8954 34 18V31C34 32.1046 33.1046 33 32 33H8C6.89543 33 6 32.1046 6 31V18Z"
            fill="#1b4332"
            fillOpacity="0.08"
            stroke="#1b4332"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Brass Optical Inspection Loupe & Verification Symbol */}
          <circle
            cx="24"
            cy="24"
            r="6.5"
            fill="#faf7f2"
            stroke="#b08d57"
            strokeWidth="2"
          />

          {/* Checkmark inside verification lens */}
          <path
            d="M21.5 24L23.2 25.8L26.5 22.2"
            stroke="#1b4332"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Brass Lens Handle extending diagonally */}
          <path
            d="M28.5 28.5L33 33"
            stroke="#b08d57"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── WORDMARK: NOTHI AI (SERIF 24PX IN DEEP GREEN) + BANGLA ON SAME BASELINE ── */}
      <div className="flex items-baseline gap-1.5 sm:gap-2">
        <span className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-green-deep">
          Nothi AI
        </span>
        <span className="font-bangla text-sm sm:text-xl font-medium text-brass hidden sm:inline">
          নথি এআই
        </span>
      </div>
    </div>
  );
}
