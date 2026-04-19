import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, FileQuestion } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="h-16 w-16 text-destructive/60" />
      <h1 className="text-4xl font-bold">403</h1>
      <p className="text-lg text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground/60" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
