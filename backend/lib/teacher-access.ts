import type { Pool, PoolClient } from 'pg';
import type { SessionUser } from './session.js';

export const TEACHER_LEVEL_ORDER = ['primary', 'secondary'] as const;
export type TeacherLevel = (typeof TEACHER_LEVEL_ORDER)[number];

type Queryable = Pick<Pool, 'query'> | PoolClient;

interface TeacherAccessRow {
    id: string;
    teacher_id: string;
    level: string | null;
    assigned_levels: string[] | null;
    is_homeroom_teacher: boolean;
    homeroom_class_id: string | null;
}

export interface TeacherAccessContext {
    teacherDbId: string | null;
    teacherCode: string | null;
    assignedLevels: TeacherLevel[];
    isHomeroomTeacher: boolean;
    homeroomClassId: string | null;
}

export interface TeacherAccessibleClass {
    id: string;
    name: string;
    level: string | null;
}

function toRawLevels(input: unknown): string[] {
    if (Array.isArray(input)) {
        return input.flatMap((value) => String(value).split(','));
    }

    if (typeof input === 'string' && input.trim()) {
        return input.split(',');
    }

    return [];
}

export function normalizeTeacherAssignedLevels(
    input: unknown,
    fallbackLevel?: string | null,
): TeacherLevel[] {
    const rawLevels = toRawLevels(input);
    if (rawLevels.length === 0 && fallbackLevel) {
        rawLevels.push(fallbackLevel);
    }

    const selected = new Set<TeacherLevel>();
    for (const rawLevel of rawLevels) {
        const normalized = rawLevel.trim().toLowerCase();
        if (normalized === 'primary' || normalized === 'secondary') {
            selected.add(normalized);
        }
    }

    return TEACHER_LEVEL_ORDER.filter((level) => selected.has(level));
}

export function primaryTeacherAssignedLevel(levels: TeacherLevel[]): TeacherLevel | null {
    return levels[0] ?? null;
}

export function teacherHasAssignedLevel(
    levels: TeacherLevel[],
    level: string | null | undefined,
): boolean {
    return level === 'primary' || level === 'secondary'
        ? levels.includes(level)
        : false;
}

export async function getTeacherAccessContext(
    db: Queryable,
    user: SessionUser,
): Promise<TeacherAccessContext> {
    const result = await db.query<TeacherAccessRow>(
        `SELECT t.id,
                t.teacher_id,
                t.level,
                t.assigned_levels,
                t.is_homeroom_teacher,
                t.homeroom_class_id
         FROM teachers t
         WHERE t.user_id = $1
            OR (t.user_id IS NULL AND LOWER(t.name) = LOWER($2))
         ORDER BY CASE WHEN t.user_id = $1 THEN 0 ELSE 1 END
         LIMIT 1`,
        [user.id, user.name],
    );

    const row = result.rows[0];
    if (!row) {
        return {
            teacherDbId: null,
            teacherCode: null,
            assignedLevels: normalizeTeacherAssignedLevels([], user.level),
            isHomeroomTeacher: false,
            homeroomClassId: null,
        };
    }

    return {
        teacherDbId: row.id,
        teacherCode: row.teacher_id,
        assignedLevels: normalizeTeacherAssignedLevels(row.assigned_levels, row.level ?? user.level),
        isHomeroomTeacher: row.is_homeroom_teacher,
        homeroomClassId: row.homeroom_class_id,
    };
}

export async function validateHomeroomClassAssignment(
    db: Queryable,
    homeroomClassId: string | null,
    assignedLevels: TeacherLevel[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
    if (!homeroomClassId) {
        return { ok: true };
    }

    const classResult = await db.query<{ level: string | null }>(
        'SELECT level FROM classes WHERE id = $1',
        [homeroomClassId],
    );

    if (classResult.rows.length === 0) {
        return { ok: false, status: 404, error: 'Class not found' };
    }

    const classRow = classResult.rows[0];
    if (!classRow) {
        return { ok: false, status: 404, error: 'Class not found' };
    }

    const classLevel = classRow.level;
    if (classLevel && !assignedLevels.includes(classLevel as TeacherLevel)) {
        return {
            ok: false,
            status: 400,
            error: 'Homeroom class must match one of the assigned teacher levels',
        };
    }

    return { ok: true };
}

export async function getTeacherInstructionClasses(
    db: Queryable,
    user: SessionUser,
): Promise<TeacherAccessibleClass[]> {
    const teacherAccess = await getTeacherAccessContext(db, user);

    if (teacherAccess.assignedLevels.length > 0) {
        const result = await db.query<TeacherAccessibleClass>(
            `SELECT id, name, level
             FROM classes
             WHERE level = ANY($1::text[])
             ORDER BY name ASC`,
            [teacherAccess.assignedLevels],
        );

        return result.rows;
    }

    if (teacherAccess.homeroomClassId) {
        const result = await db.query<TeacherAccessibleClass>(
            'SELECT id, name, level FROM classes WHERE id = $1',
            [teacherAccess.homeroomClassId],
        );

        return result.rows;
    }

    return [];
}

export function buildTeacherLevelClause(
    column: string,
    levels: TeacherLevel[],
    startParamIndex: number = 1,
): { clause: string; params: unknown[]; paramOffset: number } {
    if (levels.length === 0) {
        return { clause: '', params: [], paramOffset: startParamIndex };
    }

    return {
        clause: `AND ${column} = ANY($${startParamIndex}::text[])`,
        params: [levels],
        paramOffset: startParamIndex + 1,
    };
}