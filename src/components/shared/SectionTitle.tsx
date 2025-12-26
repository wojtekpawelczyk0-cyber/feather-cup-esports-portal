import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center';
}

export const SectionTitle = ({
  title,
  subtitle,
  className,
  align = 'left',
}: SectionTitleProps) => {
  return (
    <div className={cn('mb-8', align === 'center' && 'text-center', className)}>
      <h2 className="section-title mb-2">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
};
