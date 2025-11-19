import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle2 } from "lucide-react";
import { AppItem } from "@/types/app";

interface AppCardProps {
  app: AppItem;
  onInstall: (app: AppItem) => void;
  isFocused: boolean;
  onFocus: () => void;
  isInstalled?: boolean;
}

export const AppCard = ({ 
  app, 
  onInstall, 
  isFocused, 
  onFocus,
  isInstalled = false
}: AppCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isFocused]);

  return (
    <Card
      ref={cardRef}
      tabIndex={0}
      onFocus={onFocus}
      className={`
        group relative overflow-hidden transition-all duration-300 outline-none
        bg-card hover:bg-secondary focus:bg-secondary
        ${isFocused ? "ring-4 ring-tv-focus shadow-tv-focus scale-105" : ""}
      `}
    >
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          <img
            src={app.icon}
            alt={app.name}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5'/%3E%3C/svg%3E";
            }}
          />
        </div>
        
        <div className="flex-1 min-h-[80px]">
          <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-1">{app.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{app.description}</p>
          <p className="text-xs text-muted-foreground">v{app.version}</p>
        </div>

        {isInstalled ? (
          <div className="w-full space-y-2">
            <Button
              onClick={() => onInstall(app)}
              className="w-full bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-tv-focus h-12 text-base"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Reinstalar
            </Button>
            <Button
              disabled
              className="w-full h-12 text-base bg-green-600/20 text-green-400 border border-green-600/50 cursor-default"
              size="lg"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Instalado
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => onInstall(app)}
            className="w-full bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-tv-focus h-12 text-base"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Instalar
          </Button>
        )}
      </div>
    </Card>
  );
};
