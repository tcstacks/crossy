'use client';

import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

interface TimerProps {
  startTime: number | null;
  endTime?: number | null;
}

export function Timer({ startTime, endTime }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    if (endTime) {
      setElapsed(Math.floor((endTime - startTime) / 1000));
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <div className="timer">
      {formatTime(elapsed)}
    </div>
  );
}

interface CountdownTimerProps {
  totalSeconds: number;
  startTime: number | null;
  onComplete?: () => void;
}

export function CountdownTimer({
  totalSeconds,
  startTime,
  onComplete,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (!startTime) {
      setRemaining(totalSeconds);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newRemaining = Math.max(0, totalSeconds - elapsed);
      setRemaining(newRemaining);

      if (newRemaining === 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, totalSeconds, onComplete]);

  const isLow = remaining <= 60;
  const isCritical = remaining <= 10;

  return (
    <div
      className={`timer ${
        isCritical
          ? 'text-red-600 animate-pulse'
          : isLow
          ? 'text-yellow-600'
          : ''
      }`}
    >
      {formatTime(remaining)}
    </div>
  );
}
