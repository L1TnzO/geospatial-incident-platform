import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { MapPin, Table, LogOut, BarChart3, Target, AlertCircle, LogIn, FileText } from 'lucide-react'; // <--- IMPORT NUEVO
import { User } from '../types';
import { isMobile } from '../utils/platform';

interface MainNavigationProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function MainNavigation({ user, onLogin, onLogout }: MainNavigationProps) {
  const location = useLocation();
  const mobile = isMobile();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2 mr-8">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-semibold">Firesight</span>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {!mobile && user && (
            <>
              <Link to="/map">
                <Button
                  variant={isActive('/map') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Map View
                </Button>
              </Link>
              <div className="flex items-center gap-1">
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
                <Link to="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/strategic">
                  <Button
                    variant={isActive('/strategic') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Target className="h-4 w-4" />
                    Strategic
                  </Button>
                </Link>

                <Link to="/consolidated-report">
                  <Button
                    variant={isActive('/consolidated-report') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Summary Report
                  </Button>
                </Link>

                {/* BOTÓN NUEVO REPORT */}
                <Link to="/report">
                  <Button
                    variant={isActive('/report') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Report Incident
                  </Button>
                </Link>

              </div>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user ? `${user.username} (${user.role})` : 'Guest Mode'}
          </span>
          {!mobile && (
            <>
              {user ? (
                <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={onLogin} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}