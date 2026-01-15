import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pool } from '@/lib/db';
import { processVideo } from '@/lib/pipeline';

// This is necessary to prevent Next.js from limiting the request body size unexpectedly in some environments
export const config = {
    api: {
        bodyParser: false, // We use formData which parses it, but actually App Router route handlers don't use this config export.
    },
};
// In App Router, we don't use the config export for bodyParser. We just read the stream.
// However, formData() reads the whole body.

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filePath = path.join(uploadDir, filename);

        // Save file
        fs.writeFileSync(filePath, buffer);

        // Insert into DB
        const result = await pool.query(
            'INSERT INTO videos (file_path, original_name, status) VALUES ($1, $2, $3) RETURNING id',
            [`/uploads/${filename}`, file.name, 'uploaded']
        );
        const videoId = result.rows[0].id;

        // Trigger processing (async, don't await)
        // In a real app, use a queue. Here we use setImmediate/Promise to detach.
        processVideo(videoId, filePath).catch(err => console.error('Background processing failed', err));

        return NextResponse.json({ success: true, videoId });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
