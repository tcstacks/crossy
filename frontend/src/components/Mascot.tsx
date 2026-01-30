'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type CrossyMood =
  | 'main'
  | 'hint'
  | 'cheer'
  | 'cool'
  | 'chat'
  | 'calendar'
  | 'ball'
  | 'coffee'
  | 'gym'
  | 'popcorn'
  | 'reading'
  | 'sleep'
  | 'small'
  | 'thumbsup'
  | 'yoga';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: CrossyMood;
  className?: string;
  animate?: boolean;
}

const moodToImage: Record<CrossyMood, string> = {
  main: '/crossy-main.png',
  hint: '/crossy-hint.png',
  cheer: '/crossy-cheer.png',
  cool: '/crossy-cool.png',
  chat: '/crossy-chat.png',
  calendar: '/crossy-calendar.png',
  ball: '/crossy-ball.png',
  coffee: '/crossy-coffee.png',
  gym: '/crossy-gym.png',
  popcorn: '/crossy-popcorn.png',
  reading: '/crossy-reading.png',
  sleep: '/crossy-sleep.png',
  small: '/crossy-small.png',
  thumbsup: '/crossy-thumbsup.png',
  yoga: '/crossy-yoga.png',
};

export function Mascot({ size = 'md', mood = 'main', className = '', animate = true }: MascotProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const sizePixels = {
    sm: 48,
    md: 80,
    lg: 128,
    xl: 192,
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        animate && 'bob-animation',
        'relative',
        className
      )}
    >
      <Image
        src={moodToImage[mood]}
        alt={`Crossy ${mood}`}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}

export function MascotWithSpeech({
  message,
  size = 'md',
  mood = 'main',
  className = '',
}: MascotProps & { message?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {message && (
        <div className="speech-bubble max-w-xs">
          <p className="text-sm font-display font-medium text-crossy-dark-purple">{message}</p>
        </div>
      )}
      <Mascot size={size} mood={mood} animate />
    </div>
  );
}
