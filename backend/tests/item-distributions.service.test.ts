import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemDistributionService } from '../lib/item-distributions.service.js';
import { withTransaction, pool } from '../lib/db.js';

vi.mock('../lib/db', () => ({
    pool: {
        query: vi.fn(),
    },
    withTransaction: vi.fn(),
}));

describe('Item Distributions Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if input is invalid', async () => {
        await expect(
            createItemDistributionService('user-1', 'level-1', 'teacher', '', 'item-1', 0)
        ).rejects.toThrow('teacher_id, item_id and quantity are required');
    });

    it('should successfully create an item distribution', async () => {
        // Mock withTransaction behavior to just run the passed callback
        (withTransaction as any).mockImplementation(async (cb: any) => {
            const client = {
                query: vi.fn().mockImplementation((query: string) => {
                    if (query.includes('FROM teachers')) return { rows: [{ id: 'teacher-1' }] };
                    if (query.includes('FROM items WHERE')) return { rows: [{ id: 'item-1' }] };
                    if (query.includes('FROM stock_items')) return { rows: [{ id: 'stock-1', current_stock: 10 }] };
                    if (query.includes('UPDATE stock_items')) return { rows: [] };
                    if (query.includes('INSERT INTO item_distributions')) return { rows: [{ id: 'dist-1' }] };
                    return { rows: [] };
                })
            };
            return cb(client);
        });

        (pool.query as any).mockResolvedValue({
            rows: [{ id: 'dist-1', item_name: 'Pen', teacher_name: 'Mr. Smith' }]
        });

        const result = await createItemDistributionService('user-1', 'level-1', 'admin', 'teacher-1', 'item-1', 5);
        expect(result).toBeDefined();
        expect(result.id).toBe('dist-1');
        expect(withTransaction).toHaveBeenCalled();
    });
});