import React from 'react';
import { MapPin, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  zoneCount?: number;
}

const Header: React.FC<HeaderProps> = ({ zoneCount = 0 }) => {
  return (
    <header className="bg-card border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <MapPin className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Texas Elementary Zones
              </h1>
              <p className="text-sm text-muted-foreground">
                Marketing Insights & Analysis Tool
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {zoneCount > 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{zoneCount}</span> zones loaded
              </div>
            )}
            <Button variant="hero" size="sm" className="hidden sm:flex">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;