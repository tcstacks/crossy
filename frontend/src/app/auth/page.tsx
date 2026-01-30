'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthForms } from '@/components/AuthForms';
import { Mascot } from '@/components/Mascot';
import { useGameStore } from '@/store/gameStore';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useGameStore();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, redirect, router]);

  const handleSuccess = () => {
    router.push(redirect);
  };

  return (
    <div className="min-h-screen fun-bg flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/80 border-b border-purple-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <Mascot size="sm" mood="main" animate={false} className="group-hover:animate-wiggle" />
            <span className="font-bold text-xl gradient-text">Crossy</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Mascot size="lg" mood="cheer" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-purple-900">Welcome to Crossy!</h1>
            <p className="text-purple-600">
              Sign in to save your progress and compete with friends
            </p>
          </div>

          <div className="card">
            <AuthForms onSuccess={handleSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
