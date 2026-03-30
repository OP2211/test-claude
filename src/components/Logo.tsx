interface LogoProps {
  size?: number;
  animate?: boolean;
}

export default function Logo({ size = 36, animate = false }: LogoProps) {
  const id = `logo-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MatchDay logo"
      style={animate ? { animation: 'float 3s ease-in-out infinite' } : undefined}
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="50%" stopColor="#2979ff" />
          <stop offset="100%" stopColor="#b388ff" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="24" cy="24" r="22" stroke={`url(#${id}-grad)`} strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Ball */}
      <circle cx="24" cy="22" r="13" fill={`url(#${id}-grad)`} filter={`url(#${id}-glow)`} />

      {/* Pentagon pattern */}
      <polygon
        points="24,13 28,16 26.5,20.5 21.5,20.5 20,16"
        fill="none"
        stroke="rgba(10,10,26,0.6)"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Seam lines */}
      <line x1="24" y1="13" x2="24" y2="9.5" stroke="rgba(10,10,26,0.4)" strokeWidth="0.8" />
      <line x1="28" y1="16" x2="32" y2="14" stroke="rgba(10,10,26,0.4)" strokeWidth="0.8" />
      <line x1="26.5" y1="20.5" x2="30" y2="24" stroke="rgba(10,10,26,0.4)" strokeWidth="0.8" />
      <line x1="21.5" y1="20.5" x2="18" y2="24" stroke="rgba(10,10,26,0.4)" strokeWidth="0.8" />
      <line x1="20" y1="16" x2="16" y2="14" stroke="rgba(10,10,26,0.4)" strokeWidth="0.8" />

      {/* Chat bubble */}
      <g transform="translate(30, 29)">
        <path
          d="M0,0 C0,-2.5 2.5,-5 6,-5 C9.5,-5 12,-2.5 12,0 C12,2.5 9.5,5 6,5 C4.8,5 3.6,4.6 2.7,4 L0,6 L0.8,3.3 C0.3,2.3 0,1.2 0,0Z"
          fill={`url(#${id}-grad)`}
          opacity="0.95"
        />
        <circle cx="4" cy="0" r="0.9" fill="#0a0a1a" />
        <circle cx="6.5" cy="0" r="0.9" fill="#0a0a1a" />
        <circle cx="9" cy="0" r="0.9" fill="#0a0a1a" />
      </g>
    </svg>
  );
}
