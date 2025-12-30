'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Puzzle Archive</h1>

        {/* Filters */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  difficulty === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border hover:bg-gray-50'
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
            <div className="spinner w-8 h-8" />
          </div>
        ) : puzzles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No puzzles found
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {puzzles.map((puzzle) => (
                <Link
                  key={puzzle.id}
                  href={`/puzzle/${puzzle.date}`}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-lg mb-1">{puzzle.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        {puzzle.date && (
                          <span>{formatDate(puzzle.date)}</span>
                        )}
                        <span>•</span>
                        <span>By {puzzle.author}</span>
                        <span>•</span>
                        <span>
                          {puzzle.gridWidth}×{puzzle.gridHeight}
                        </span>
                      </div>
                      {puzzle.theme && (
                        <p className="mt-2 text-sm text-gray-500">
                          Theme: {puzzle.theme}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDifficultyColor(
                        puzzle.difficulty
                      )}`}
                    >
                      {getDifficultyLabel(puzzle.difficulty)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner w-4 h-4" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
