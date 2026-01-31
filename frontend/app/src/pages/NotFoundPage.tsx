import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <div className="text-center space-y-8 px-4">
        <div className="flex justify-center">
          <img
            src="/crossy-sleep.png"
            alt="Crossy Sleeping"
            className="h-48 w-auto"
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Oops! Looks like Crossy got lost. The page you're looking for doesn't exist.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => navigate('/')}
          className="min-w-[200px]"
        >
          Go Home
        </Button>
      </div>
    </div>
  );
}
