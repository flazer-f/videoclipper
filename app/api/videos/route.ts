import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query(`
      SELECT 
        v.*, 
        json_agg(c.*) as clips
      FROM videos v
      LEFT JOIN clips c ON v.id = c.video_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Fetch videos error:', error);
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }
}
