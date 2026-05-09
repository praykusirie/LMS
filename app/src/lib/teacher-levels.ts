export type SchoolLevel = 'primary' | 'secondary';

export const SCHOOL_LEVELS: SchoolLevel[] = ['primary', 'secondary'];

function toRawLevels(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((value) => String(value).split(','));
  }

  if (typeof input === 'string' && input.trim()) {
    return input.split(',');
  }

  return [];
}

export function normalizeAssignedLevels(input: unknown, fallbackLevel?: string | null): SchoolLevel[] {
  const rawLevels = toRawLevels(input);
  if (rawLevels.length === 0 && fallbackLevel) {
    rawLevels.push(fallbackLevel);
  }

  const selected = new Set<SchoolLevel>();
  for (const rawLevel of rawLevels) {
    const normalized = rawLevel.trim().toLowerCase();
    if (normalized === 'primary' || normalized === 'secondary') {
      selected.add(normalized);
    }
  }

  return SCHOOL_LEVELS.filter((level) => selected.has(level));
}

export function primaryAssignedLevel(levels: SchoolLevel[]): SchoolLevel | null {
  return levels[0] ?? null;
}

export function toggleAssignedLevel(levels: SchoolLevel[], level: SchoolLevel, checked: boolean): SchoolLevel[] {
  const next = checked
    ? Array.from(new Set([...levels, level]))
    : levels.filter((value) => value !== level);

  return SCHOOL_LEVELS.filter((value) => next.includes(value));
}

export function filterClassesByLevels<T extends { level?: string | null }>(classes: T[], levels: SchoolLevel[]): T[] {
  if (levels.length === 0) {
    return classes;
  }

  return classes.filter((classItem) => !classItem.level || levels.includes(classItem.level as SchoolLevel));
}