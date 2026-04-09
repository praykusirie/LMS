import { createAvatar } from '@dicebear/core';
import { initials, avataaars } from '@dicebear/collection';

export function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function createInitialsAvatar(seed: string): string {
  const avatar = createAvatar(initials, {
    seed,
    radius: 50,
    backgroundColor: ['1e3a5f'], // navy color
    textColor: ['ffffff'],
  });
  return avatar.toDataUri();
}

export function createPersonAvatar(seed: string, gender: 'male' | 'female' = 'male'): string {
  const avatar = createAvatar(avataaars, {
    seed,
    radius: 50,
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
    // Gender-specific options
    top: gender === 'female'
      ? ['bob', 'bun', 'curly', 'curvy', 'straight01', 'straight02', 'longButNotTooLong', 'miaWallace', 'bigHair']
      : ['shortFlat', 'shortWaved', 'shortCurly', 'theCaesar', 'dreads01', 'frizzle'],
    facialHair: gender === 'male' 
      ? ['beardLight', 'beardMedium', 'moustacheFancy', 'beardMajestic']
      : undefined,
    facialHairProbability: gender === 'male' ? 30 : 0,
    accessories: ['prescription01', 'prescription02', 'round', 'sunglasses'],
    accessoriesProbability: 20,
  });
  return avatar.toDataUri();
}
