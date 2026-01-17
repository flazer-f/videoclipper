import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/db';
import { processVideo } from '@/lib/pipeline';

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
        
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);

        // Save file
        fs.writeFileSync(filePath, buffer);

        // Insert into DB using Prisma
        const video = await prisma.video.create({
            data: {
                filePath: `/uploads/${filename}`,
                originalName: file.name,
                status: 'uploaded'
            }
        });

        // Trigger processing (async)
        processVideo(video.id, filePath).catch(err => console.error('Background processing failed', err));

        return NextResponse.json({ success: true, videoId: video.id });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
