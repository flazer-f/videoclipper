import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { openai } from './openai';
import { pool } from './db';

// Ensure uploads and clips directories exist
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const CLIPS_DIR = path.join(process.cwd(), 'public', 'clips');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

interface ClipSegment {
    start: string; // "00:01:30"
    end: string;   // "00:02:45"
    title: string;
    topic: string;
}

export async function processVideo(videoId: number, inputPath: string) {
    try {
        console.log(`Starting processing for video ${videoId}...`);
        await updateVideoStatus(videoId, 'processing');

        // 1. Extract Audio
        const audioPath = await extractAudio(inputPath);
        console.log('Audio extracted:', audioPath);

        // 2. Transcribe
        const transcriptText = await transcribeAudio(audioPath);
        console.log('Transcript generated.');

        // Save transcript to DB
        await pool.query('UPDATE videos SET transcript = $1 WHERE id = $2', [transcriptText, videoId]);

        // 3. Analyze Transcript to find clips
        const clips = await analyzeTranscript(transcriptText);
        console.log(`Identified ${clips.length} clips.`);

        // 4. Generate Clips
        for (const clip of clips) {
            await generateClip(videoId, inputPath, clip);
        }

        await updateVideoStatus(videoId, 'completed');
        console.log(`Processing complete for video ${videoId}`);

        // Cleanup temp audio?
        fs.unlinkSync(audioPath);

    } catch (error) {
        console.error(`Error processing video ${videoId}:`, error);
        await updateVideoStatus(videoId, 'failed');
    }
}

async function updateVideoStatus(videoId: number, status: string) {
    await pool.query('UPDATE videos SET status = $1 WHERE id = $2', [status, videoId]);
}

async function extractAudio(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(path.extname(videoPath), '.mp3');
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .save(audioPath)
            .on('end', () => resolve(audioPath))
            .on('error', (err) => reject(err));
    });
}

async function transcribeAudio(audioPath: string): Promise<string> {
    // Use OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
    });
    return transcription.text;
}

async function analyzeTranscript(transcript: string): Promise<ClipSegment[]> {
    const prompt = `
    Analyze the following transcript of a video. Identify 3-5 key moments that would make good short clips (viral, interesting, or informative).
    Return the result as a JSON array of objects with keys: "start" (HH:MM:SS format), "end" (HH:MM:SS format), "title", "topic".
    Ensure the segments are between 30 seconds and 90 seconds.
    
    Transcript:
    ${transcript.substring(0, 50000)} ... (truncated if too long)
  `;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // or gpt-3.5-turbo
        messages: [
            { role: 'system', content: 'You are a video editor assistant.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) return [];

    // Parse JSON
    try {
        const result = JSON.parse(content);
        return result.clips || result; // Handle { clips: [...] } or [...]
    } catch (e) {
        console.error('Failed to parse AI response', e);
        return [];
    }
}

async function generateClip(videoId: number, videoPath: string, clip: ClipSegment) {
    const safeTitle = clip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    const out16_9 = path.join(CLIPS_DIR, `v${videoId}_${safeTitle}_16_9.mp4`);
    const out9_16 = path.join(CLIPS_DIR, `v${videoId}_${safeTitle}_9_16.mp4`);

    // Convert "HH:MM:SS" to seconds for fluent-ffmpeg if needed, but it accepts strings too usually.
    // Actually ffmpeg -ss accepts HH:MM:SS.
    // But fluent-ffmpeg .setStartTime() works.

    // 1. Horizontal Clip (Direct cut)
    await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
            .setStartTime(clip.start)
            .setDuration(calculateDuration(clip.start, clip.end)) // Duration in seconds
            .output(out16_9)
            .on('end', () => resolve())
            .on('error', reject)
            .run();
    });

    // 2. Vertical Clip (Crop to center 9:16)
    // ffmpeg -i clip.mp4 -vf "crop=ih*9/16:ih" vertical.mp4
    // We can do it from source to save generation time, or from the cut clip.
    // From source is better quality, but slower if we do 2 passes.
    // Let's just crop the 16:9 we just made, simpler.
    await new Promise<void>((resolve, reject) => {
        ffmpeg(out16_9)
            .videoFilters('crop=ih*(9/16):ih') // Crop the center
            .output(out9_16)
            .on('end', () => resolve())
            .on('error', reject)
            .run();
    });

    // Store in DB
    const sql = `
    INSERT INTO clips (video_id, start_time, end_time, title, file_path_16_9, file_path_9_16)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
    // We need to convert start/end string to seconds float for DB or just store string?
    // Schema said Float. Let's parse.

    await pool.query(sql, [
        videoId,
        parseTime(clip.start),
        parseTime(clip.end),
        clip.title,
        `/clips/${path.basename(out16_9)}`,
        `/clips/${path.basename(out9_16)}`
    ]);
}

function parseTime(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}

function calculateDuration(start: string, end: string): number {
    return parseTime(end) - parseTime(start);
}
