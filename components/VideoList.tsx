'use client';
import { useEffect, useState } from 'react';

interface Clip {
    id: number;
    file_path_16_9: string;
    file_path_9_16: string;
    title: string;
    start_time: number;
}
interface Video {
    id: number;
    original_name: string;
    status: string;
    clips: Clip[] | null; // clips can be null from left join if none
}

export default function VideoList({ refreshKey }: { refreshKey: number }) {
    const [videos, setVideos] = useState<Video[]>([]);

    const fetchVideos = async () => {
        try {
            const res = await fetch('/api/videos');
            if (res.ok) {
                const data = await res.json();
                setVideos(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchVideos();
        const interval = setInterval(fetchVideos, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [refreshKey]);

    return (
        <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold border-b pb-2">Your Projects</h2>
            <div className="grid gap-6">
                {videos.map((video) => (
                    <div key={video.id} className="p-6 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">{video.original_name}</h3>
                                <span className="text-xs text-gray-500">ID: {video.id}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${video.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                    video.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 animate-pulse'
                                }`}>
                                {video.status}
                            </span>
                        </div>

                        {video.status === 'completed' && video.clips && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-3 text-sm text-gray-600 dark:text-gray-400">Generated Clips</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {video.clips.filter(c => c).map((clip) => (
                                        <div key={clip.id} className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                                            <div className="bg-black aspect-video flex items-center justify-center">
                                                <video
                                                    src={clip.file_path_16_9}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    preload="metadata"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="font-medium text-sm mb-2 truncate" title={clip.title}>{clip.title}</p>
                                                <div className="flex gap-2 text-xs">
                                                    <a href={clip.file_path_16_9} download className="text-blue-500 hover:underline">Download 16:9</a>
                                                    <span className="text-gray-300">|</span>
                                                    <a href={clip.file_path_9_16} download className="text-blue-500 hover:underline">Download 9:16</a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(video.status === 'processing' || video.status === 'uploaded') && (
                            <div className="text-sm text-gray-500 italic">
                                AI is analyzing the transcript and creating clips... This may take a few minutes.
                            </div>
                        )}
                        {video.status === 'failed' && (
                            <div className="text-sm text-red-500">
                                Processing failed. Please check server logs.
                            </div>
                        )}
                    </div>
                ))}
                {videos.length === 0 && (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed">
                        No videos found. Upload one to get started!
                    </div>
                )}
            </div>
        </div>
    );
}
