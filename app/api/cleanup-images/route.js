import { NextResponse } from 'next/server';
import { getPool, readPortfolioData, sql } from '@/lib/db';

export async function DELETE() {
    try {
        const pool = await getPool();

        // Get all referenced image IDs from the actual data
        const data = await readPortfolioData(pool);
        const allUrls = JSON.stringify(data);
        const usedIds = [...allUrls.matchAll(/\/api\/images\/(\d+)/g)].map(m => parseInt(m[1]));

        // Get all image IDs in DB
        const allImgsResult = await pool.request().query('SELECT id FROM portfolio_images');
        const allIds = allImgsResult.recordset.map(r => r.id);

        // Find orphans
        const orphanIds = allIds.filter(id => !usedIds.includes(id));

        for (const id of orphanIds) {
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM portfolio_images WHERE id = @id');
        }

        return NextResponse.json({
            success: true,
            deleted: orphanIds.length,
            remaining: usedIds.length,
            message: `Deleted ${orphanIds.length} orphan images. ${usedIds.length} images in use.`
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
