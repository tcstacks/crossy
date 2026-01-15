import {
  cn,
  formatTime,
  formatDate,
  getDifficultyColor,
  getDifficultyLabel,
  generateShareText,
  getClueId,
  parseClueId,
} from '@/lib/utils';

describe('cn (className merge)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatTime', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(3600)).toBe('60:00');
  });

  it('should handle edge cases', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-10)).toBe('0:00');
  });

  it('should pad seconds correctly', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
  });
});

describe('formatDate', () => {
  it('should format date string correctly', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('January');
    expect(result).toContain('15');
  });
});

describe('getDifficultyColor', () => {
  it('should return correct colors for each difficulty', () => {
    expect(getDifficultyColor('easy')).toContain('green');
    expect(getDifficultyColor('medium')).toContain('yellow');
    expect(getDifficultyColor('hard')).toContain('red');
  });

  it('should return gray for unknown difficulty', () => {
    expect(getDifficultyColor('unknown')).toContain('gray');
  });
});

describe('getDifficultyLabel', () => {
  it('should return correct labels', () => {
    expect(getDifficultyLabel('easy')).toBe('Easy');
    expect(getDifficultyLabel('medium')).toBe('Medium');
    expect(getDifficultyLabel('hard')).toBe('Hard');
  });

  it('should return original string for unknown difficulty', () => {
    expect(getDifficultyLabel('extreme')).toBe('extreme');
  });
});

describe('generateShareText', () => {
  it('should generate correct share text', () => {
    const text = generateShareText('Monday Mini', 120, 0);
    expect(text).toContain('Monday Mini');
    expect(text).toContain('2:00');
    expect(text).toContain('no hints');
  });

  it('should handle hints correctly', () => {
    expect(generateShareText('Test', 60, 1)).toContain('1 hint');
    expect(generateShareText('Test', 60, 3)).toContain('3 hints');
  });
});

describe('getClueId', () => {
  it('should generate correct clue IDs', () => {
    expect(getClueId('across', 1)).toBe('across-1');
    expect(getClueId('down', 15)).toBe('down-15');
  });
});

describe('parseClueId', () => {
  it('should parse valid clue IDs', () => {
    expect(parseClueId('across-1')).toEqual({ direction: 'across', number: 1 });
    expect(parseClueId('down-15')).toEqual({ direction: 'down', number: 15 });
  });

  it('should return null for invalid clue IDs', () => {
    expect(parseClueId('invalid')).toBeNull();
    expect(parseClueId('across-')).toBeNull();
    expect(parseClueId('-1')).toBeNull();
  });
});
