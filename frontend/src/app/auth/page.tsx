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
    <div className="min-h-screen bg-crossy-light-bg flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/80 border-b-2 border-crossy-dark-purple">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <Mascot size="sm" mood="small" className="group-hover:animate-wiggle" />
            <span className="font-pixel text-lg text-crossy-purple">Crossy</span>
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
            <h1 className="text-2xl font-display font-bold mb-2 text-crossy-dark-purple">Welcome to Crossy!</h1>
            <p className="font-display text-crossy-dark-purple">
              Sign in to save your progress and compete with friends
            </p>
          </div>

          <div className="crossy-card">
            <AuthForms onSuccess={handleSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
