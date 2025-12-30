import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (seconds == null || isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  const totalSecs = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'hard':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    default:
      return difficulty;
  }
}

export function generateShareText(
  puzzleTitle: string,
  solveTime: number,
  hintsUsed: number
): string {
  const timeStr = formatTime(solveTime);
  const hintsStr = hintsUsed === 0 ? 'no hints' : `${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}`;
  return `I solved "${puzzleTitle}" in ${timeStr} with ${hintsStr}! Play at crossplay.app`;
}

export function getClueId(direction: 'across' | 'down', number: number): string {
  return `${direction}-${number}`;
}

export function parseClueId(clueId: string): { direction: 'across' | 'down'; number: number } | null {
  const match = clueId.match(/^(across|down)-(\d+)$/);
  if (!match) return null;
  return {
    direction: match[1] as 'across' | 'down',
    number: parseInt(match[2], 10),
  };
}
