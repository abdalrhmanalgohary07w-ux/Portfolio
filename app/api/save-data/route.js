import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const newData = await request.json();
        const filePath = path.join(process.cwd(), 'data', 'portfolioData.json');

        fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');

        return NextResponse.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        return NextResponse.json({ success: false, message: 'Failed to save data' }, { status: 500 });
    }
}
