import { useEffect, useState } from 'react';

export function GlitchText({ text, className = '' }) {
  const [displayText, setDisplayText] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let interval;

    const triggerGlitch = () => {
      setIsGlitching(true);
      let iterations = 0;
      const maxIterations = 10;
      interval = setInterval(() => {
        setDisplayText(
          text.split('').map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iterations / 2) return text[index];
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }).join('')
        );
        iterations++;
        if (iterations > maxIterations) {
          setDisplayText(text);
          setIsGlitching(false);
          clearInterval(interval);
        }
      }, 50);
    };

    const timeout = setTimeout(triggerGlitch, 500);
    const randomGlitch = setInterval(() => {
      if (Math.random() > 0.7) triggerGlitch();
    }, 5000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      clearInterval(randomGlitch);
    };
  }, [text]);

  return (
    <span
      className={`glitch-text ${className}`}
      style={{ position: 'relative', display: 'inline-block', transform: isGlitching ? 'translateX(-1px)' : 'none' }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{displayText}</span>
      {isGlitching && (
        <>
          <span style={{ position: 'absolute', inset: 0, color: 'rgba(168,85,247,0.5)', transform: 'translateX(-2px)' }}>
            {displayText}
          </span>
          <span style={{ position: 'absolute', inset: 0, color: 'rgba(124,58,237,0.5)', transform: 'translateX(2px)' }}>
            {displayText}
          </span>
        </>
      )}
    </span>
  );
}