import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPersonAvatar, getInitials } from '@/lib/identity';

interface PersonAvatarProps {
  name: string;
  gender?: 'male' | 'female';
  className?: string;
  fallbackClassName?: string;
}

export function PersonAvatar({ name, gender = 'male', className, fallbackClassName }: PersonAvatarProps) {
  const avatarDataUri = useMemo(() => createPersonAvatar(name, gender), [name, gender]);

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarDataUri} alt={name} />
      <AvatarFallback className={fallbackClassName}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
