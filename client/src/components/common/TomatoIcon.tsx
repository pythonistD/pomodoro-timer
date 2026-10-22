import React from 'react';

interface TomatoIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TomatoIcon: React.FC<TomatoIconProps> = ({ size = 24, className, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="tomatoBodyGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff5252" />
          <stop offset="45%" stopColor="#e53935" />
          <stop offset="85%" stopColor="#b71c1c" />
          <stop offset="100%" stopColor="#880e4f" />
        </radialGradient>
        <linearGradient id="tomatoLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81c784" />
          <stop offset="50%" stopColor="#43a047" />
          <stop offset="100%" stopColor="#1b5e20" />
        </linearGradient>
        <filter id="tomatoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#tomatoGlow)">
        {/* Tomato main body */}
        <path
          d="M16 29C8 29 4 23 4 16.5C4 10.5 8.5 7.5 13 8C14.2 8.1 15.3 8.6 16 9C16.7 8.6 17.8 8.1 19 8C23.5 7.5 28 10.5 28 16.5C28 23 24 29 16 29Z"
          fill="url(#tomatoBodyGrad)"
        />

        {/* Subtle highlight */}
        <ellipse cx="11" cy="13" rx="3.5" ry="2" transform="rotate(-30 11 13)" fill="white" opacity="0.35" />

        {/* Stem */}
        <path
          d="M16 8.5C15.8 6 16.2 3.5 17.5 2C17.2 2.8 17.1 3.8 17.2 4.8C17.3 5.8 17.6 7 16 8.5Z"
          fill="#388e3c"
          stroke="#1b5e20"
          strokeWidth="0.5"
        />

        {/* Calyx Leaves */}
        {/* Left leaf */}
        <path d="M16 8.5C13 7.5 9 8 8 9.5C9.5 9.8 12.5 9.2 14.5 9.5Z" fill="url(#tomatoLeafGrad)" />
        {/* Right leaf */}
        <path d="M16 8.5C19 7.5 23 8 24 9.5C22.5 9.8 19.5 9.2 17.5 9.5Z" fill="url(#tomatoLeafGrad)" />
        {/* Center-left leaf */}
        <path d="M16 8.5C14.5 10.5 12 12.5 11 13C12.5 12 14 10.5 15.5 9.5Z" fill="url(#tomatoLeafGrad)" />
        {/* Center-right leaf */}
        <path d="M16 8.5C17.5 10.5 20 12.5 21 13C19.5 12 18 10.5 16.5 9.5Z" fill="url(#tomatoLeafGrad)" />
        {/* Center point */}
        <circle cx="16" cy="8.5" r="1.2" fill="#2e7d32" />
      </g>
    </svg>
  );
};
