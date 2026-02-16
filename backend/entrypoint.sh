#!/bin/sh
# Update yt-dlp to latest version on every container start
# This ensures YouTube extraction keeps working even if the Docker image is old
yt-dlp -U 2>/dev/null || echo "yt-dlp update skipped (non-root or no network)"

exec node dist/server.js
