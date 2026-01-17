
# Video Clipper AI

A Next.js application that automatically transforms long-form videos into short, shareable clips using AI and FFmpeg.

## Features
- **Video Upload**: Upload MP4/files to the server.
- **AI Processing**: 
  - Extracts audio using FFmpeg.
  - Generates transcript using Google Gemini 1.5 Flash.
  - Identifies viral moments using Gemini 1.5 Flash.
- **Automated Clipping**: Cuts video segments using FFmpeg.
- **Multi-Format**: Generates both 16:9 (Landscape) and 9:16 (Vertical) cropped versions.
- **Dashboard**: View status and download generated clips.

## Architecture
- **Frontend**: Next.js App Router, Tailwind CSS.
- **Backend**: Next.js API Routes, Server-Side Processing.
- **Database**: PostgreSQL (Metadata for videos and clips).
- **Video Engine**: `fluent-ffmpeg` (Requires FFmpeg installed on system).
- **AI**: Google Gemini API.

## Setup

1. **Prerequisites**:
   - Node.js (v18+)
   - PostgreSQL Database
   - FFmpeg installed and in system PATH.
   - Google Gemini API Key.

2. **Environment Variables**:
   Create a `.env.local` file in the root:
   ```bash
   DATABASE_URL=postgresql://user:pass@localhost:5432/videoclipper
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Initialize Database**:
   Run Prisma migrations to create tables:
   ```bash
   npx prisma migrate dev --name init
   ```
   Or use Prisma db push (for development):
   ```bash
   npx prisma db push
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Database Schema

- **Video**
  - `id` (Int, PK)
  - `filePath` (String)
  - `originalName` (String)
  - `duration` (Float, optional)
  - `transcript` (Text, optional)
  - `status` (String, default: 'uploaded')
  - `createdAt` (DateTime)
  - `clips` (Relation to Clip[])

- **Clip**
  - `id` (Int, PK)
  - `videoId` (Int, FK)
  - `startTime` (Float)
  - `endTime` (Float)
  - `title` (String, optional)
  - `filePath169` (String, optional)
  - `filePath916` (String, optional)
  - `createdAt` (DateTime)

## AI & System Design
- **System Design**: The system uses a specialized pipeline:
  1. **Ingest**: File is saved to disk and DB record created.
  2. **Job Trigger**: Processing is triggered asynchronously (fire-and-forget for demo purposes).
  3. **Analysis**: Gemini 1.5 Flash transcribes the audio and analyzes content to find timestamped "moments".
  4. **Processing**: FFmpeg cuts the video at timestamps. A second FFmpeg pass crops it to 9:16 for minimal latency/complexity.
  5. **Storage**: Files stored in `public/clips`. Metadata in Postgres.

- **AI Usage**:
  - **Gemini 1.5 Flash**: Transcription and context-aware content selection.

## Notes
- Large video uploads may require configuring `bodySizeLimit` in `next.config.mjs` or server configuration.
- Video processing is CPU intensive. In production, this should be offloaded to a worker queue (e.g., BullMQ + Redis).

## License
MIT
