import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'navy' | 'green' | 'amber' | 'red';
  delay?: number;
}

export function QuickActionCard({ 
  title, 
  icon: Icon, 
  onClick, 
  color = 'navy',
  delay = 0 
}: QuickActionCardProps) {
  const colorClasses = {
    navy: 'bg-navy-light text-navy hover:bg-navy hover:text-white',
    green: 'bg-green-light text-green hover:bg-green hover:text-white',
    amber: 'bg-amber-light text-amber hover:bg-amber hover:text-white',
    red: 'bg-red-light text-red hover:bg-red hover:text-white'
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg p-5 transition-all duration-200 shadow-card',
        colorClasses[color]
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium">{title}</span>
    </motion.button>
  );
}
