import { useMemo } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: 'square' | 'circle' | 'rectangle';
  delay: number;
}

const COLORS = [
  '#7B61FF', // Purple
  '#2ECC71', // Green
  '#FF4D6A', // Pink
  '#FFC107', // Gold
  '#4ECDC4', // Teal
  '#FF6B6B', // Coral
];

const SHAPES = ['square', 'circle', 'rectangle'] as const;

const pseudoRandom = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

interface ConfettiProps {
  isActive: boolean;
  pieceCount?: number;
}

export function Confetti({ isActive, pieceCount = 60 }: ConfettiProps) {
  const pieces = useMemo(() => {
    if (!isActive) return [];

    const generated: ConfettiPiece[] = [];
    for (let i = 0; i < pieceCount; i++) {
      const seed = (i + 1) * (pieceCount + 7);
      const spread = pseudoRandom(seed + 1);
      const colorPick = pseudoRandom(seed + 2);
      const rotationPick = pseudoRandom(seed + 3);
      const scalePick = pseudoRandom(seed + 4);
      const shapePick = pseudoRandom(seed + 5);
      const delayPick = pseudoRandom(seed + 6);

      generated.push({
        id: i,
        x: 50 + (spread - 0.5) * 20,
        y: 50,
        color: COLORS[Math.floor(colorPick * COLORS.length)],
        rotation: rotationPick * 360,
        scale: 0.5 + scalePick * 0.5,
        shape: SHAPES[Math.floor(shapePick * SHAPES.length)],
        delay: delayPick * 0.3,
      });
    }
    return generated;
  }, [isActive, pieceCount]);

  if (!isActive || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            animationDelay: `${piece.delay}s`,
            width: piece.shape === 'rectangle' ? '12px' : '10px',
            height: piece.shape === 'rectangle' ? '6px' : '10px',
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;
