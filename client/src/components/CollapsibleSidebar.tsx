import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { FiltersPanel } from './FiltersPanel';
import { cn } from './ui/utils';
import { isMobile } from '../utils/platform';

interface CollapsibleSidebarProps {
  defaultOpen?: boolean;
}

export function CollapsibleSidebar({ defaultOpen = true }: CollapsibleSidebarProps) {
  const [isOpen, setIsOpen] = useState(isMobile() ? false : defaultOpen);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-background transition-all duration-300 ease-in-out overflow-y-auto relative z-0',
          isOpen ? 'w-80' : 'w-0',
        )}
      >
        <div className={cn('p-4', !isOpen && 'hidden')}>
          <FiltersPanel />
        </div>
      </aside>

      {/* Toggle Button - Always visible, positioned absolutely */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute top-4 z-50 h-8 w-8 rounded-full shadow-md transition-all duration-300',
          isOpen ? 'left-[304px]' : 'left-4',
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    </>
  );
}
