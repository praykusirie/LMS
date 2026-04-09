import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createInitialsAvatar, getInitials } from '@/lib/identity';

interface IdentityAvatarProps {
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export function IdentityAvatar({ name, className, fallbackClassName }: IdentityAvatarProps) {
  const avatarDataUri = useMemo(() => createInitialsAvatar(name), [name]);

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarDataUri} alt={name} />
      <AvatarFallback className={fallbackClassName}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
