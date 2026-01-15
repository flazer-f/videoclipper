CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    duration FLOAT,
    transcript TEXT,
    status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clips (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    title TEXT,
    file_path_16_9 TEXT,
    file_path_9_16 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
