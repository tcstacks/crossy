export default function PuzzleSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* Grid skeleton */}
      <div className="flex gap-6">
        {/* Crossword grid */}
        <div className="flex-1">
          <div className="aspect-square bg-gray-200 rounded-lg"></div>
        </div>

        {/* Clue panel */}
        <div className="w-80 space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}
