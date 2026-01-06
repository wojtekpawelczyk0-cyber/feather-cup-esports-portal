import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-bg.jpg';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  showBg?: boolean;
  backgroundImage?: string | null;
}

export const HeroSection = ({
  title,
  subtitle,
  children,
  className,
  size = 'md',
  gradient = true,
  showBg = false,
  backgroundImage,
}: HeroSectionProps) => {
  const sizeClasses = {
    sm: 'py-16 md:py-20',
    md: 'py-20 md:py-32',
    lg: 'py-32 md:py-48',
  };

  // Use custom background image if provided, otherwise fall back to default
  const bgImageSrc = backgroundImage || heroBg;

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {/* Background Image */}
      {showBg && (
        <div className="absolute inset-0">
          <img 
            src={bgImageSrc} 
            alt="" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      {gradient && (
        <>
          <div className="hero-glow top-0 left-1/4 -translate-x-1/2 -translate-y-1/2" />
          <div className="hero-glow bottom-0 right-1/4 translate-x-1/2 translate-y-1/2 opacity-50" />
        </>
      )}

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 opacity-0 animate-fade-in text-gradient-hero">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in stagger-1">
              {subtitle}
            </p>
          )}
          {children && (
            <div className="mt-8 opacity-0 animate-fade-in stagger-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
