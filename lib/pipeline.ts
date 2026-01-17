import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { execSync } from 'child_process';
import { genAI } from './ai';
import { prisma } from './db';
ffmpeg.setFfmpegPath('C:\\ffmpeg-2026-01-14-git-6c878f8b82-full_build\\ffmpeg-2026-01-14-git-6c878f8b82-full_build\\bin\\ffmpeg.exe');
// Ensure uploads and clips directories exist
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const CLIPS_DIR = path.join(process.cwd(), 'public', 'clips');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

// Check if FFmpeg is available (only called at runtime, never at build time)
function checkFFmpeg(): void {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore', timeout: 2000 });
    } catch {
        throw new Error(
            'FFmpeg is not installed or not found in PATH. ' +
            'Please install FFmpeg:\n' +
            '  Windows: Download from https://ffmpeg.org/download.html or use: choco install ffmpeg\n' +
            '  macOS: brew install ffmpeg\n' +
            '  Linux: sudo apt-get install ffmpeg (Debian/Ubuntu) or sudo yum install ffmpeg (RHEL/CentOS)'
        );
    }
}

interface ClipSegment {
    start: string; // "00:01:30"
    end: string;   // "00:02:45"
    title: string;
    topic: string;
}

export async function processVideo(videoId: number, inputPath: string) {
    try {
        console.log(`Starting processing for video ${videoId}...`);
        
        // Check FFmpeg availability before starting
        checkFFmpeg();
        
        await prisma.video.update({ where: { id: videoId }, data: { status: 'processing' } });

        // 1. Extract Audio
        const audioPath = await extractAudio(inputPath);
        console.log('Audio extracted:', audioPath);

        // 2. Transcribe & Analyze with Gemini
        // We can do both at once! Pass audio to Gemini and ask for clips.
        // However, we want to save transcript too.

        // Read audio file
        const audioData = fs.readFileSync(audioPath);
        const AudioBase64 = audioData.toString('base64');

        // Check API key before making request
        if (!process.env.GEMINI_API_KEY) {
            throw new Error(
                'GEMINI_API_KEY environment variable is not set. ' +
                'Please set it in your .env.local file. ' +
                'Get your API key from: https://aistudio.google.com/app/apikey'
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      Listen to this audio.
      1. Provide a verbatim transcript.
      2. Identify 3-5 key moments that would make good short clips (viral, interesting, or informative).
      
      Return JSON with this structure:
      {
        "transcript": "Full transcript text...",
        "clips": [
           { "start": "HH:MM:SS", "end": "HH:MM:SS", "title": "Catchy Title", "topic": "Topic Name" }
        ]
      }
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/mp3",
                    data: AudioBase64
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Try to extract the first valid JSON block from Gemini response
        let jsonStr = '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            // Fallback: Clean markdown
            jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (err) {
            console.error("Failed to parse Gemini response", text);
            // Store raw response for debugging
            await prisma.video.update({
                where: { id: videoId },
                data: {
                    status: 'failed',
                    transcript: `Gemini raw response: ${text}`
                }
            });
            throw new Error("AI Logic failed");
        }

        const transcriptText = data.transcript || "No transcript generated";
        const clips: ClipSegment[] = data.clips || [];

        console.log('Gemini analysis complete.');

        // Save transcript to DB
        await prisma.video.update({
            where: { id: videoId },
            data: { transcript: transcriptText }
        });

        // 3. Generate Clips with FFmpeg
        for (const clip of clips) {
            await generateClip(videoId, inputPath, clip);
        }

        await prisma.video.update({ where: { id: videoId }, data: { status: 'completed' } });
        console.log(`Processing complete for video ${videoId}`);

        // Cleanup temp audio
        try { fs.unlinkSync(audioPath); } catch {
            // Ignore cleanup errors
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing video ${videoId}:`, errorMessage);
        
        // Store error message in transcript field for debugging
        await prisma.video.update({ 
            where: { id: videoId }, 
            data: { 
                status: 'failed',
                transcript: `Processing failed: ${errorMessage}`
            } 
        });
    }
}

async function extractAudio(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(path.extname(videoPath), '.mp3');
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .save(audioPath)
            .on('end', () => resolve(audioPath))
            .on('error', (err) => {
                const errorMessage = err.message || String(err);
                if (errorMessage.includes('Cannot find ffmpeg') || errorMessage.includes('ffmpeg was not found')) {
                    reject(new Error(
                        'FFmpeg is not installed or not found in PATH. ' +
                        'Please install FFmpeg and ensure it is in your system PATH.'
                    ));
                } else {
                    reject(new Error(`Failed to extract audio: ${errorMessage}`));
                }
            });
    });
}

async function generateClip(videoId: number, videoPath: string, clip: ClipSegment) {
    const safeTitle = (clip.title || 'clip').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const out16_9 = path.join(CLIPS_DIR, `v${videoId}_${safeTitle}_16_9.mp4`);
    const out9_16 = path.join(CLIPS_DIR, `v${videoId}_${safeTitle}_9_16.mp4`);

    // 1. Horizontal Clip
    await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
            .setStartTime(clip.start)
            .setDuration(calculateDuration(clip.start, clip.end))
            .output(out16_9)
            .on('end', () => resolve())
            .on('error', (err) => {
                const errorMessage = err.message || String(err);
                if (errorMessage.includes('Cannot find ffmpeg') || errorMessage.includes('ffmpeg was not found')) {
                    reject(new Error('FFmpeg is not installed or not found in PATH.'));
                } else {
                    reject(new Error(`Failed to generate 16:9 clip: ${errorMessage}`));
                }
            })
            .run();
    });

    // 2. Vertical Clip (Crop)
    await new Promise<void>((resolve, reject) => {
        ffmpeg(out16_9)
            .videoFilters('crop=ih*(9/16):ih')
            .output(out9_16)
            .on('end', () => resolve())
            .on('error', (err) => {
                const errorMessage = err.message || String(err);
                if (errorMessage.includes('Cannot find ffmpeg') || errorMessage.includes('ffmpeg was not found')) {
                    reject(new Error('FFmpeg is not installed or not found in PATH.'));
                } else {
                    reject(new Error(`Failed to generate 9:16 clip: ${errorMessage}`));
                }
            })
            .run();
    });

    // Store in DB
    await prisma.clip.create({
        data: {
            videoId: videoId,
            startTime: parseTime(clip.start),
            endTime: parseTime(clip.end),
            title: clip.title,
            filePath169: `/clips/${path.basename(out16_9)}`,
            filePath916: `/clips/${path.basename(out9_16)}`
        }
    });
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
