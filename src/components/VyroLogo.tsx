export function VyroLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap shrink-0 select-none">
      <svg
        width="30"
        height="30"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="vyroPrism" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="vyroSilver" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="8"
          fill="#0B0E16"
          stroke="url(#vyroPrism)"
          strokeWidth="1.5"
        />
        <path
          d="M10.5 11L18 25L25.5 11"
          stroke="url(#vyroSilver)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.5 11L18 17.5L21.5 11"
          stroke="url(#vyroPrism)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span className="font-display text-base font-semibold tracking-tight text-slate-100">
          VYRO AI <span className="text-blue-400 font-normal">STUDIO</span>
        </span>
      )}
    </div>
  );
}
