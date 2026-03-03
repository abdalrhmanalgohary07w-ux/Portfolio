import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const BLOB_FILENAME = 'portfolioData.json';

export async function GET() {
    try {
        const { blobs } = await list({ prefix: BLOB_FILENAME });

        if (blobs.length === 0) {
            return NextResponse.json({ success: false, message: 'No data found' }, { status: 404 });
        }

        // Get the most recent blob
        const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        const res = await fetch(latest.url);
        const data = await res.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return NextResponse.json({ success: false, message: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const newData = await request.json();
        const json = JSON.stringify(newData, null, 2);

        // Overwrite by using the same pathname each time (addRandomSuffix: false)
        const blob = await put(BLOB_FILENAME, json, {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
        });

        return NextResponse.json({ success: true, message: 'Data saved successfully', url: blob.url });
    } catch (error) {
        console.error('Error saving data:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
