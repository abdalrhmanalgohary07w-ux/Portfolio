import { NextResponse } from 'next/server';
import { getPool, createSchema, writePortfolioData, sql } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const IMAGE_MIME = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp',
};

function findAndReplacePaths(obj, mapping) {
    if (typeof obj === 'string') return mapping[obj] ?? obj;
    if (Array.isArray(obj)) return obj.map(v => findAndReplacePaths(v, mapping));
    if (obj && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, findAndReplacePaths(v, mapping)]));
    }
    return obj;
}

export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only runs locally (npm run dev)' }, { status: 403 });
    }

    try {
        const pool = await getPool();
        await createSchema(pool);

        // Read current JSON
        const jsonPath = path.join(process.cwd(), 'data', 'portfolioData.json');
        let data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // Find all local image paths (e.g. /profile.png)
        const allStrings = new Set();
        const traverse = (v) => {
            if (typeof v === 'string' && v.startsWith('/') && !v.startsWith('/api/')) {
                const ext = path.extname(v).toLowerCase();
                if (IMAGE_MIME[ext]) allStrings.add(v);
            } else if (Array.isArray(v)) v.forEach(traverse);
            else if (v && typeof v === 'object') Object.values(v).forEach(traverse);
        };
        traverse(data);

        const migrated = [];
        const failed = [];
        const pathMapping = {};

        for (const localPath of allStrings) {
            const filePath = path.join(process.cwd(), 'public', localPath);
            if (!fs.existsSync(filePath)) {
                failed.push({ path: localPath, reason: 'Not found in public/' });
                continue;
            }
            try {
                const buffer = fs.readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mimeType = IMAGE_MIME[ext] || 'image/png';

                const result = await pool.request()
                    .input('img', sql.VarBinary(sql.MAX), buffer)
                    .input('mime', sql.NVarChar(50), mimeType)
                    .query('INSERT INTO portfolio_images (image_data, mime_type) OUTPUT INSERTED.id VALUES (@img, @mime)');

                const newId = result.recordset[0].id;
                const newUrl = `/api/images/${newId}`;
                pathMapping[localPath] = newUrl;
                migrated.push({ from: localPath, to: newUrl });
            } catch (err) {
                failed.push({ path: localPath, reason: err.message });
            }
        }

        // Replace all old paths in data
        data = findAndReplacePaths(data, pathMapping);

        // Save to DB (relational) + update local JSON
        await writePortfolioData(pool, data);
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

        return NextResponse.json({
            success: true,
            migrated_count: migrated.length,
            failed_count: failed.length,
            migrated,
            failed,
            message: failed.length === 0
                ? 'All images migrated! You can now delete image files from public/.'
                : `Done with ${failed.length} failures. Check failed[] for details.`
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
