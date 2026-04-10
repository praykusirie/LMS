import type { Request } from 'express';
import { auth } from './auth.js';
import { fromNodeHeaders } from 'better-auth/node';

export interface SessionUser {
    id: string;
    role: string | null;
    level: string | null;
}

/**
 * Extracts the current user from the request session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });
        if (!session?.user) return null;
        return {
            id: session.user.id,
            role: (session.user as any).role ?? null,
            level: (session.user as any).level ?? null,
        };
    } catch {
        return null;
    }
}

/**
 * Returns a SQL WHERE clause fragment for level filtering.
 * - Admin (or no user): no filter (sees everything)
 * - Librarian with a level: sees records matching their level OR NULL (shared)
 * - Others: no filter
 *
 * @param user - The session user
 * @param alias - Optional table alias (e.g., 'c' for categories)
 * @returns { clause: string, params: any[], paramOffset: number }
 */
export function getLevelFilter(
    user: SessionUser | null,
    alias?: string,
    startParamIndex: number = 1,
): { clause: string; params: any[]; paramOffset: number } {
    const col = alias ? `${alias}.level` : 'level';

    if (!user || user.role === 'admin') {
        return { clause: '', params: [], paramOffset: startParamIndex };
    }

    if (user.level) {
        return {
            clause: `AND (${col} = $${startParamIndex} OR ${col} IS NULL)`,
            params: [user.level],
            paramOffset: startParamIndex + 1,
        };
    }

    return { clause: '', params: [], paramOffset: startParamIndex };
}
