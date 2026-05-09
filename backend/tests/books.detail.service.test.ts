import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDetailTrendPeriod, getActivityWindowClause } from '../lib/books.detail.service.js';

describe('Books Detail Service Utilities', () => {
    describe('readDetailTrendPeriod', () => {
        it('should default to week for invalid values', () => {
            expect(readDetailTrendPeriod('invalid')).toBe('week');
            expect(readDetailTrendPeriod(null)).toBe('week');
        });

        it('should return valid values matching types', () => {
            expect(readDetailTrendPeriod('month')).toBe('month');
            expect(readDetailTrendPeriod('6months')).toBe('6months');
        });
    });

    describe('getActivityWindowClause', () => {
        it('should format sql query clause for week', () => {
            const clause = getActivityWindowClause('week', 'col');
            expect(clause).toContain("col >= date_trunc('day', NOW()) - interval '6 days'");
        });

        it('should format sql query clause for month', () => {
            const clause = getActivityWindowClause('month', 'col');
            expect(clause).toContain("col >= date_trunc('day', NOW()) - interval '29 days'");
        });

        it('should return empty for all', () => {
            const clause = getActivityWindowClause('all', 'col');
            expect(clause).toBe('');
        });
    });
});