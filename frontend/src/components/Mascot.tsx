'use client';

import { useState } from 'react';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: 'happy' | 'excited' | 'thinking' | 'celebrating';
  className?: string;
  animate?: boolean;
}

export function Mascot({ size = 'md', mood = 'happy', className = '', animate = true }: MascotProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const getMoodColors = () => {
    switch (mood) {
      case 'excited':
        return { body: '#ff6b9d', light: '#ffb3c7', dark: '#e54d7a', cheeks: '#ff8fab' };
      case 'thinking':
        return { body: '#4cc9ff', light: '#a1e2ff', dark: '#2ba8e0', cheeks: '#ff8fab' };
      case 'celebrating':
        return { body: '#c44cff', light: '#dda1ff', dark: '#a020d0', cheeks: '#ff8fab' };
      default:
        return { body: '#e879f9', light: '#f5b3fc', dark: '#c026d3', cheeks: '#ff8fab' };
    }
  };

  const colors = getMoodColors();
  const p = 2; // pixel size

  return (
    <div
      className={`${sizeClasses[size]} ${className} ${animate ? 'animate-float' : ''} cursor-pointer transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ imageRendering: 'pixelated' }}
    >
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
        {/* Pixel art octopus - 16x16 grid scaled 2x */}

        {/* Body outline/shadow */}
        <rect x={8*p} y={3*p} width={1*p} height={1*p} fill={colors.dark} />
        <rect x={7*p} y={4*p} width={1*p} height={1*p} fill={colors.dark} />
        <rect x={6*p} y={5*p} width={1*p} height={3*p} fill={colors.dark} />
        <rect x={9*p} y={3*p} width={1*p} height={1*p} fill={colors.dark} />
        <rect x={10*p} y={4*p} width={1*p} height={1*p} fill={colors.dark} />
        <rect x={11*p} y={5*p} width={1*p} height={3*p} fill={colors.dark} />

        {/* Body main */}
        <rect x={7*p} y={2*p} width={4*p} height={1*p} fill={colors.body} />
        <rect x={6*p} y={3*p} width={6*p} height={1*p} fill={colors.body} />
        <rect x={5*p} y={4*p} width={8*p} height={1*p} fill={colors.body} />
        <rect x={5*p} y={5*p} width={8*p} height={1*p} fill={colors.body} />
        <rect x={5*p} y={6*p} width={8*p} height={1*p} fill={colors.body} />
        <rect x={6*p} y={7*p} width={6*p} height={1*p} fill={colors.body} />

        {/* Body highlight */}
        <rect x={7*p} y={2*p} width={2*p} height={1*p} fill={colors.light} />
        <rect x={6*p} y={3*p} width={2*p} height={1*p} fill={colors.light} />
        <rect x={5*p} y={4*p} width={1*p} height={1*p} fill={colors.light} />

        {/* Eyes - white */}
        <rect x={6*p} y={4*p} width={2*p} height={2*p} fill="white" />
        <rect x={10*p} y={4*p} width={2*p} height={2*p} fill="white" />

        {/* Pupils */}
        <rect x={(isHovered ? 7 : 6)*p} y={5*p} width={1*p} height={1*p} fill="#2d1b4e" />
        <rect x={(isHovered ? 11 : 10)*p} y={5*p} width={1*p} height={1*p} fill="#2d1b4e" />

        {/* Eye sparkles */}
        <rect x={6*p} y={4*p} width={1*p} height={1*p} fill="white" />
        <rect x={10*p} y={4*p} width={1*p} height={1*p} fill="white" />

        {/* Blush */}
        <rect x={5*p} y={6*p} width={1*p} height={1*p} fill={colors.cheeks} opacity="0.8" />
        <rect x={12*p} y={6*p} width={1*p} height={1*p} fill={colors.cheeks} opacity="0.8" />

        {/* Mouth - cute smile */}
        {mood === 'happy' && (
          <>
            <rect x={7*p} y={6*p} width={1*p} height={1*p} fill="#2d1b4e" />
            <rect x={8*p} y={7*p} width={2*p} height={1*p} fill="#2d1b4e" />
            <rect x={10*p} y={6*p} width={1*p} height={1*p} fill="#2d1b4e" />
          </>
        )}
        {mood === 'excited' && (
          <>
            <rect x={8*p} y={6*p} width={2*p} height={1*p} fill="#2d1b4e" />
            <rect x={8*p} y={6*p} width={2*p} height={0.5*p} fill="#ff6b9d" />
          </>
        )}
        {mood === 'thinking' && (
          <rect x={9*p} y={6*p} width={1*p} height={1*p} fill="#2d1b4e" />
        )}
        {mood === 'celebrating' && (
          <>
            <rect x={7*p} y={6*p} width={1*p} height={1*p} fill="#2d1b4e" />
            <rect x={8*p} y={7*p} width={2*p} height={1*p} fill="#2d1b4e" />
            <rect x={10*p} y={6*p} width={1*p} height={1*p} fill="#2d1b4e" />
            {/* Sparkles */}
            <rect x={14*p} y={1*p} width={1*p} height={1*p} fill="#ffe44c" className="animate-sparkle" />
            <rect x={15*p} y={2*p} width={1*p} height={1*p} fill="#ffe44c" className="animate-sparkle" />
            <rect x={2*p} y={2*p} width={1*p} height={1*p} fill="#ff6b9d" className="animate-sparkle" style={{ animationDelay: '0.3s' }} />
            <rect x={1*p} y={3*p} width={1*p} height={1*p} fill="#ff6b9d" className="animate-sparkle" style={{ animationDelay: '0.3s' }} />
          </>
        )}

        {/* Tentacles */}
        <g className={isHovered ? 'animate-wiggle' : ''}>
          {/* Left tentacles */}
          <rect x={5*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={4*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={4*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={5*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        <g className={isHovered ? 'animate-wiggle' : ''} style={{ animationDelay: '0.1s' }}>
          <rect x={7*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={6*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={6*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={7*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        {/* Middle tentacles */}
        <g className={isHovered ? 'animate-wiggle' : ''} style={{ animationDelay: '0.15s' }}>
          <rect x={8*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={8*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={8*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={8*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        <g className={isHovered ? 'animate-wiggle' : ''} style={{ animationDelay: '0.2s' }}>
          <rect x={9*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={9*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={9*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={9*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        {/* Right tentacles */}
        <g className={isHovered ? 'animate-wiggle' : ''} style={{ animationDelay: '0.25s' }}>
          <rect x={10*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={11*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={11*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={10*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        <g className={isHovered ? 'animate-wiggle' : ''} style={{ animationDelay: '0.3s' }}>
          <rect x={12*p} y={8*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={13*p} y={9*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={13*p} y={10*p} width={1*p} height={1*p} fill={colors.body} />
          <rect x={12*p} y={11*p} width={1*p} height={1*p} fill={colors.body} />
        </g>

        {/* Tiny pencil */}
        <rect x={3*p} y={10*p} width={1*p} height={3*p} fill="#fde68a" />
        <rect x={3*p} y={9*p} width={1*p} height={1*p} fill="#ffb6c1" />
        <rect x={3*p} y={13*p} width={1*p} height={1*p} fill="#2d1b4e" />
      </svg>
    </div>
  );
}

export function MascotWithSpeech({
  message,
  size = 'md',
  mood = 'happy',
  className = ''
}: MascotProps & { message?: string }) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <Mascot size={size} mood={mood} />
      {message && (
        <div className="relative bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-lg max-w-xs animate-bounce-in">
          <p className="text-sm font-medium text-purple-700">{message}</p>
          <div className="absolute -left-2 bottom-2 w-4 h-4 bg-white transform rotate-45" />
        </div>
      )}
    </div>
  );
}
