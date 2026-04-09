import { useEffect, useRef } from 'react';
import './AgentXLogo.css';

export function AgentXLogo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`agentx-logo ${className}`}
    >
      <path
        d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
        fill="url(#gradient-bg)"
        stroke="url(#gradient-stroke)"
        strokeWidth="1.5"
        className="agentx-logo__hex"
      />
      <path
        d="M24 12L16 17V27L24 32L32 27V17L24 12Z"
        fill="none"
        stroke="url(#gradient-inner)"
        strokeWidth="1"
        className="agentx-logo__inner"
      />
      <path
        d="M18 18L30 30M30 18L18 30"
        stroke="url(#gradient-x)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="agentx-logo__x"
      />
      <circle cx="24" cy="24" r="3" fill="url(#gradient-core)" className="agentx-logo__core" />
      <circle cx="24" cy="24" r="3" fill="none" stroke="url(#gradient-core)" strokeWidth="0.5" className="agentx-logo__pulse" />

      <defs>
        <linearGradient id="gradient-bg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a0a2e" />
          <stop offset="1" stopColor="#0d0518" />
        </linearGradient>
        <linearGradient id="gradient-stroke" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="gradient-inner" x1="16" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" stopOpacity="0.6" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="gradient-x" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e9d5ff" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id="gradient-core" cx="24" cy="24" r="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5f3ff" />
          <stop offset="0.5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#a855f7" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function AgentXLogoText({ className = '' }) {
  return (
    <div className={`agentx-logotext ${className}`}>
      <AgentXLogo size={40} />
      <span className="agentx-logotext__name">
        <span className="agentx-logotext__base">AgentX</span>
        <span className="agentx-logotext__suffix">_SYNCRO</span>
      </span>
    </div>
  );
}