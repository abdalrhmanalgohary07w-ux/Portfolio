import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const isLocal = process.env.NODE_ENV === 'development';

export async function POST(request) {
    const newData = await request.json();

    if (isLocal) {
        // Running locally — write directly to the JSON file
        try {
            const filePath = path.join(process.cwd(), 'data', 'portfolioData.json');
            fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
            return NextResponse.json({ success: true, local: true, message: 'Saved to file!' });
        } catch (error) {
            console.error('Error saving data:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
    }

    // On Vercel — filesystem is read-only, client uses localStorage
    return NextResponse.json({ success: true, local: false, message: 'Use Export JSON to go live.' });
}

export async function GET() {
    return NextResponse.json({ success: false, message: 'Not available' }, { status: 404 });
}
