import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {(action || secondaryActions) && (
        <div className="flex items-center gap-3 shrink-0">
          {secondaryActions}
          {action && (
            <Button
              onClick={action.onClick}
              disabled={action.disabled}
              className="bg-primary hover:bg-primary/90 rounded-xl h-11 gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
