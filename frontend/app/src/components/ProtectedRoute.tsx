import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [authModalDismissed, setAuthModalDismissed] = useState(false);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated and modal was dismissed, redirect to home
  if (authModalDismissed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If not authenticated, show auth modal
  return (
    <AuthModal
      open={!isAuthenticated && !authModalDismissed}
      onOpenChange={(open) => {
        if (!open) {
          setAuthModalDismissed(true);
        }
      }}
    />
  );
}
