import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      include: {
        clips: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to match key names expected by frontend if needed, 
    // BUT frontend expects snake_case from raw SQL.
    // Prisma returns camelCase.
    // We should either update frontend or transform here.
    // Let's transform here to keep frontend changes minimal.

    const transformed = videos.map(v => ({
      id: v.id,
      original_name: v.originalName,
      status: v.status,
      clips: v.clips.map(c => ({
        id: c.id,
        file_path_16_9: c.filePath169,
        file_path_9_16: c.filePath916,
        title: c.title,
        start_time: c.startTime
      }))
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Fetch videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
