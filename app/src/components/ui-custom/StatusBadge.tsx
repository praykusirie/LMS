import { cn } from '@/lib/utils';

type StatusType = 'active' | 'inactive' | 'available' | 'unavailable' | 'borrowed' | 'returned' | 'overdue' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      bg: 'bg-green-light',
      text: 'text-green',
      label: 'Active'
    },
    inactive: {
      bg: 'bg-secondary',
      text: 'text-muted-foreground',
      label: 'Inactive'
    },
    available: {
      bg: 'bg-green-light',
      text: 'text-green',
      label: 'In Stock'
    },
    unavailable: {
      bg: 'bg-red-light',
      text: 'text-red',
      label: 'Out of Stock'
    },
    borrowed: {
      bg: 'bg-navy-light',
      text: 'text-navy',
      label: 'Borrowed'
    },
    returned: {
      bg: 'bg-green-light',
      text: 'text-green',
      label: 'Returned'
    },
    overdue: {
      bg: 'bg-red-light',
      text: 'text-red',
      label: 'Overdue'
    },
    pending: {
      bg: 'bg-amber-light',
      text: 'text-amber',
      label: 'Pending'
    }
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      {children || config.label}
    </span>
  );
}
