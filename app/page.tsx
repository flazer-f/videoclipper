'use client';
import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import VideoList from '@/components/VideoList';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
          Video Clipper AI
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Transform long videos into viral shorts automatically.
        </p>
      </header>

      <section className="mb-12">
        <UploadForm onUploadSuccess={() => setRefreshKey(prev => prev + 1)} />
      </section>

      <section>
        <VideoList refreshKey={refreshKey} />
      </section>
    </main>
  );
}
