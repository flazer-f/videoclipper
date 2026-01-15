'use client';
import { useState } from 'react';

export default function UploadForm({ onUploadSuccess }: { onUploadSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            setFile(null);
            // Reset file input value
            const input = document.getElementById('file-input') as HTMLInputElement;
            if (input) input.value = '';

            onUploadSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleUpload} className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Upload New Video</h2>
            <div className="mb-4">
                <input
                    id="file-input"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
            cursor-pointer"
                />
                <p className="mt-2 text-xs text-gray-500">Supports MP4, MOV. Max size depends on server config.</p>
            </div>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <button
                type="submit"
                disabled={!file || uploading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? 'Uploading...' : 'Start Processing'}
            </button>
        </form>
    );
}
