import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface VetoTimerProps {
  timeLeft: number;
  maxTime: number;
  isActive: boolean;
}

export const VetoTimer = ({ timeLeft, maxTime, isActive }: VetoTimerProps) => {
  const percentage = (timeLeft / maxTime) * 100;
  const isWarning = timeLeft <= 30;
  const isCritical = timeLeft <= 10;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary/30"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
            className={cn(
              "transition-all duration-1000",
              isCritical 
                ? "text-red-500 animate-pulse" 
                : isWarning 
                  ? "text-amber-500" 
                  : "text-primary"
            )}
          />
        </svg>
        {/* Timer text */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center text-2xl font-bold transition-colors",
          isCritical 
            ? "text-red-500 animate-pulse" 
            : isWarning 
              ? "text-amber-500" 
              : "text-foreground"
        )}>
          {timeLeft}s
        </div>
      </div>
      {isActive && (
        <span className={cn(
          "text-sm font-medium",
          isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
        )}>
          {isCritical ? "Pośpiesz się!" : isWarning ? "Mało czasu!" : "Pozostało"}
        </span>
      )}
    </div>
  );
};
