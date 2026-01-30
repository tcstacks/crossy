'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { Header } from '@/components/Header';
import { CrossyButton, CrossyCard, CrossyCardContent } from '@/components/crossy';
import { api } from '@/lib/api';
import { getDifficultyColor, getDifficultyLabel, formatDate } from '@/lib/utils';
import type { Puzzle, Difficulty } from '@/types';

export default function ArchivePage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    const loadPuzzles = async () => {
      setIsLoading(true);
      try {
        const data = await api.getArchive(difficulty || undefined, limit, page * limit);
        setPuzzles((prev) => (page === 0 ? data : [...prev, ...data]));
        setHasMore(data.length === limit);
      } catch (err) {
        console.error('Failed to load puzzles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPuzzles();
  }, [difficulty, page]);

  const handleDifficultyChange = (newDifficulty: Difficulty | '') => {
    setDifficulty(newDifficulty);
    setPage(0);
    setPuzzles([]);
  };

  return (
    <div className="min-h-screen bg-crossy-light-bg">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-6 text-crossy-dark-purple flex items-center gap-2">
          <Calendar className="w-8 h-8 text-crossy-purple" />
          Puzzle Archive
        </h1>

        {/* Filters */}
        <div className="mb-6">
          <label className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
            Filter by Difficulty
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleDifficultyChange(option.value as Difficulty | '')}
                className={`px-4 py-2 rounded-xl text-sm font-display font-semibold transition-all border-2 ${
                  difficulty === option.value
                    ? 'bg-crossy-purple text-white border-crossy-dark-purple'
                    : 'bg-white border-crossy-dark-purple hover:border-crossy-purple text-crossy-dark-purple'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Puzzle List */}
        {isLoading && puzzles.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="spinner w-8 h-8 border-crossy-purple" />
          </div>
        ) : puzzles.length === 0 ? (
          <div className="text-center py-12 text-crossy-dark-purple font-display font-semibold">
            No puzzles found
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {puzzles.map((puzzle) => (
                <Link
                  key={puzzle.id}
                  href={`/puzzle/${puzzle.date}`}
                >
                  <CrossyCard className="hover:scale-[1.02] transition-transform cursor-pointer">
                    <CrossyCardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-display font-bold text-lg mb-1 text-crossy-dark-purple">{puzzle.title}</h2>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-crossy-dark-purple font-display">
                            {puzzle.date && (
                              <span>{formatDate(puzzle.date)}</span>
                            )}
                            <span>•</span>
                            <span>By {puzzle.author}</span>
                            <span>•</span>
                            <span className="bg-crossy-light-purple px-2 py-0.5 rounded-full border border-crossy-purple font-semibold">
                              {puzzle.gridWidth}×{puzzle.gridHeight}
                            </span>
                          </div>
                          {puzzle.theme && (
                            <p className="mt-2 text-sm text-crossy-dark-purple font-display">
                              Theme: {puzzle.theme}
                            </p>
                          )}
                        </div>
                        <span className={`tag-${puzzle.difficulty} whitespace-nowrap`}>
                          {getDifficultyLabel(puzzle.difficulty)}
                        </span>
                      </div>
                    </CrossyCardContent>
                  </CrossyCard>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <CrossyButton
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                  variant="secondary"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner w-4 h-4 border-crossy-dark-purple" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </CrossyButton>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
