$env:DATABASE_URL="postgresql://postgres:Pass%40123@localhost:5432/videoclipper"
npx prisma db push
Write-Host "Database sync complete."
