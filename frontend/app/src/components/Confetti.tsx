import { useEffect, useState } from 'react';

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

interface ConfettiProps {
  isActive: boolean;
  pieceCount?: number;
}

export function Confetti({ isActive, pieceCount = 60 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < pieceCount; i++) {
      newPieces.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20, // Center with spread
        y: 50,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        delay: Math.random() * 0.3,
      });
    }
    setPieces(newPieces);

    // Clean up after animation
    const timeout = setTimeout(() => {
      setPieces([]);
    }, 3500);

    return () => clearTimeout(timeout);
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
