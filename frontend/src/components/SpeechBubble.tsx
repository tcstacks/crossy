'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SpeechBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

const SpeechBubble = React.forwardRef<HTMLDivElement, SpeechBubbleProps>(
  ({ className, children, position = 'bottom', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'speech-bubble',
          position === 'top' && 'mb-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SpeechBubble.displayName = 'SpeechBubble';

export { SpeechBubble };
