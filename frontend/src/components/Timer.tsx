'use client';

import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

interface TimerProps {
  startTime: number | null;
  endTime?: number | null;
  yellowThreshold?: number; // seconds after which timer turns yellow
  redThreshold?: number; // seconds after which timer turns red
}

export function Timer({ startTime, endTime, yellowThreshold = 300, redThreshold = 600 }: TimerProps) {
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

  const getColorClass = () => {
    if (elapsed >= redThreshold) {
      return 'text-red-600';
    }
    if (elapsed >= yellowThreshold) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  return (
    <div className={`timer ${getColorClass()}`}>
      {formatTime(elapsed)}
    </div>
  );
}

interface CountdownTimerProps {
  totalSeconds: number;
  startTime: number | null;
  onComplete?: () => void;
  yellowThreshold?: number; // seconds remaining when timer turns yellow
  redThreshold?: number; // seconds remaining when timer turns red
}

export function CountdownTimer({
  totalSeconds,
  startTime,
  onComplete,
  yellowThreshold = 60,
  redThreshold = 10,
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

  const getColorClass = () => {
    if (remaining <= redThreshold) {
      return 'text-red-600 animate-pulse';
    }
    if (remaining <= yellowThreshold) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  return (
    <div className={`timer ${getColorClass()}`}>
      {formatTime(remaining)}
    </div>
  );
}
