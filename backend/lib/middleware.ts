import type { Request, Response, NextFunction } from 'express';
import { getSessionUser, type SessionUser } from './session.js';
import { pool } from './db.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: SessionUser;
        }
    }
}

/**
 * Middleware that requires authentication.
 * Extracts the session user and attaches it to req.user.
 * Returns 401 if not authenticated.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await getSessionUser(req);
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// In-memory cache for role permissions: roleId -> { permissions: Set<string>, expiresAt: number }
const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getRolePermissions(roleName: string): Promise<Set<string>> {
    // Check cache first
    const cached = permissionCache.get(roleName);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions;
    }

    const result = await pool.query(
        `SELECT p.module, p.action
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN roles r ON r.id = rp.role_id
         WHERE r.name = $1`,
        [roleName]
    );

    const permissions = new Set<string>(
        result.rows.map((row: { module: string; action: string }) => `${row.module}:${row.action}`)
    );

    permissionCache.set(roleName, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
}

/**
 * Clears the permission cache. Call when roles/permissions are modified.
 */
export function clearPermissionCache(): void {
    permissionCache.clear();
}

/**
 * Middleware factory that checks if the authenticated user has a specific permission.
 * Must be used AFTER requireAuth middleware.
 * Admin role bypasses all permission checks.
 */
export function requirePermission(module: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Admin bypasses all permission checks
            if (user.role === 'admin') {
                next();
                return;
            }

            if (!user.role) {
                res.status(403).json({ error: 'Access denied: no role assigned' });
                return;
            }

            const permissions = await getRolePermissions(user.role);
            const requiredPermission = `${module}:${action}`;

            if (!permissions.has(requiredPermission)) {
                res.status(403).json({ error: `Access denied: missing permission '${requiredPermission}'` });
                return;
            }

            next();
        } catch {
            res.status(500).json({ error: 'Failed to verify permissions' });
        }
    };
}
