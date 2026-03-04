import { NextResponse } from 'next/server';
import { getPool, createSchema, readPortfolioData, writePortfolioData } from '@/lib/db';
import { emptyPortfolioData } from '@/lib/fallback';

export async function GET() {
    try {
        const pool = await getPool();
        await createSchema(pool);
        const data = await readPortfolioData(pool);
        return NextResponse.json(data);
    } catch (error) {
        console.error('DB read error:', error);
        return NextResponse.json(emptyPortfolioData);
    }
}

export async function POST(request) {
    try {
        const newData = await request.json();
        const pool = await getPool();
        await createSchema(pool);
        await writePortfolioData(pool, newData);
        return NextResponse.json({ success: true, message: 'Saved to database!' });
    } catch (error) {
        console.error('DB write error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
