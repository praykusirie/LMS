import { motion } from 'framer-motion';
import { BookOpen, UserPlus, ArrowLeftRight, Bell, BookMarked } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Activity } from '@/types';

interface ActivityItemProps {
  activity: Activity;
  index?: number;
}

export function ActivityItem({ activity, index = 0 }: ActivityItemProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'borrow':
        return { icon: BookOpen, bg: 'bg-navy-light', text: 'text-navy' };
      case 'return':
        return { icon: ArrowLeftRight, bg: 'bg-green-light', text: 'text-green' };
      case 'register':
        return { icon: UserPlus, bg: 'bg-amber-light', text: 'text-amber' };
      case 'reminder':
        return { icon: Bell, bg: 'bg-red-light', text: 'text-red' };
      case 'add_book':
        return { icon: BookMarked, bg: 'bg-navy-light', text: 'text-navy' };
      default:
        return { icon: Bell, bg: 'bg-secondary', text: 'text-muted-foreground' };
    }
  };

  const { icon: Icon, bg, text } = getActivityIcon(activity.type);

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0"
    >
      {activity.userAvatar ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={activity.userAvatar} alt={activity.userName} />
          <AvatarFallback className={cn('text-xs', bg, text)}>
            {activity.userName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('h-4 w-4', text)} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{activity.userName}</span>{' '}
          <span className="text-muted-foreground">{activity.description}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getRelativeTime(activity.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}
