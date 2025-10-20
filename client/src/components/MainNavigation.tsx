import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { MapPin, Table, BarChart3, PlusCircle, LogOut } from 'lucide-react';
import { User } from '../types';

interface MainNavigationProps {
  user: User;
  onLogout: () => void;
}

export function MainNavigation({ user, onLogout }: MainNavigationProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2 mr-8">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-semibold">Firesight</span>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          <Link to="/map">
            <Button variant={isActive('/map') ? 'secondary' : 'ghost'} size="sm" className="gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </Button>
          </Link>
          <Link to="/table">
            <Button
              variant={isActive('/table') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Table className="h-4 w-4" />
              Table View
            </Button>
          </Link>
          <Link to="/analytics">
            <Button
              variant={isActive('/analytics') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          {user.role === 'admin' && (
            <Link to="/create">
              <Button
                variant={isActive('/create') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create Incident
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user.username} ({user.role})
          </span>
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
