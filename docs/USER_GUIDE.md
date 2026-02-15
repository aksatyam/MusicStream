# MusicStream User Guide

A step-by-step guide for setting up, running, and testing the MusicStream application locally.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Start the Backend](#3-start-the-backend)
4. [Run the Mobile App](#4-run-the-mobile-app)
5. [Create an Account & Login](#5-create-an-account--login)
6. [Search & Play Music](#6-search--play-music)
7. [Playlists & Library](#7-playlists--library)
8. [Offline Downloads](#8-offline-downloads)
9. [Running Tests](#9-running-tests)
10. [Code Formatting](#10-code-formatting)
11. [API Reference](#11-api-reference)
12. [Dev Startup Script](#12-dev-startup-script)
13. [Project Structure](#13-project-structure)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

Install the following before proceeding:

| Tool               | Version              | Check              |
| ------------------ | -------------------- | ------------------ |
| **Node.js**        | 22+                  | `node -v`          |
| **npm**            | 10+                  | `npm -v`           |
| **Docker Desktop** | Latest               | `docker --version` |
| **yt-dlp**         | Latest               | `yt-dlp --version` |
| **Xcode**          | 15+ (macOS, for iOS) | `xcode-select -p`  |
| **CocoaPods**      | Latest               | `pod --version`    |
| **Android Studio** | Latest (for Android) | —                  |
| **Git**            | Latest               | `git --version`    |

### macOS-specific setup

```bash
# Install Xcode command line tools
xcode-select --install

# Install CocoaPods (if not already installed)
sudo gem install cocoapods

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 22 via Homebrew
brew install node@22

# Install yt-dlp (local music extractor fallback)
brew install yt-dlp
```

---

## 2. Clone & Install

### Step 1: Clone the repository

```bash
git clone <repository-url> MusicStream
cd MusicStream
```

### Step 2: Install backend dependencies

```bash
cd backend
npm ci
cd ..
```

### Step 3: Install mobile dependencies

```bash
cd mobile
npm ci
cd ..
```

### Step 4: Install iOS native pods

```bash
cd mobile/ios
pod install
cd ../..
```

> **Note:** If `pod install` fails, try `pod install --repo-update`.

---

## 3. Start the Backend

You have two options: the automated script or manual setup.

### Option A: Use the dev startup script (recommended)

```bash
./scripts/dev-start.sh
```

This single command will:

1. Check that Docker and Node.js are installed
2. Install any missing npm dependencies
3. Start PostgreSQL 16 and Redis 7 via Docker
4. Wait for databases to become healthy
5. Start the API server with hot-reload on `http://localhost:3000`

### Option B: Manual step-by-step

**Step 1: Start PostgreSQL and Redis**

```bash
docker compose up -d postgres redis
```

Wait for them to be healthy:

```bash
docker compose ps
```

Both should show `(healthy)` status.

**Step 2: Start the API server**

```bash
cd backend
export DATABASE_URL="postgresql://musicstream:localdev123@localhost:5432/musicstream"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="musicstream_dev_jwt_secret_key_change_in_production"
npm run dev
```

**Step 3: Verify the API is running**

Open a browser or use curl:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-15T...",
  "version": "0.1.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "extractors": [...]
}
```

### Music extractors

The app uses a multi-extractor pipeline to fetch music. There are three extraction backends, tried in order:

1. **Invidious** (Docker, port 3001) — primary extractor
2. **Piped** (Docker, port 3002) — secondary extractor
3. **yt-dlp** (local binary) — always-available fallback

**yt-dlp is installed locally and works without Docker extractors.** This means search and playback will work even if Invidious and Piped are not running, as long as `yt-dlp` is installed on your system.

```bash
# Verify yt-dlp is installed
yt-dlp --version

# Optionally start Docker-based extractors for better performance
./scripts/dev-start.sh --full

# Or manually
docker compose --profile extractors up -d
```

> **Apple Silicon note:** Invidious builds from source for ARM64. First build may take 5-10 minutes. Piped runs via Rosetta emulation.

---

## 4. Run the Mobile App

### iOS (macOS only)

**Step 1: Start the Metro bundler**

```bash
cd mobile
npm start
```

**Step 2: In a new terminal, build and run on simulator**

```bash
cd mobile
npx react-native run-ios
```

This will:

- Build the iOS app using Xcode
- Launch the iPhone simulator
- Install and open the app

### Android

**Step 1: Start an Android emulator** via Android Studio (AVD Manager).

**Step 2: Start Metro and run**

```bash
cd mobile
npm start
# In another terminal:
npx react-native run-android
```

### API connection on physical devices

The mobile app connects to `http://localhost:3000/api` in development mode. For physical devices:

- **iOS physical device:** Replace `localhost` with your Mac's local IP in `mobile/src/services/api.ts`
- **Android emulator:** Use `10.0.2.2` instead of `localhost`

---

## 5. Create an Account & Login

### Step 1: Open the app

When the app launches, you'll see the **Login** screen.

### Step 2: Register a new account

1. Tap **"Create Account"** below the login form
2. Enter:
   - **Email**: any valid email (e.g. `test@test.com`)
   - **Password**: minimum 8 characters
   - **Display Name**: your name
3. Tap **Register**

### Step 3: Automatic login

After registration, you are automatically logged in and redirected to the **Home** screen. The JWT tokens are stored securely in MMKV storage and will persist across app restarts.

### Alternatively, register via API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Login via API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response for authenticated API calls.

---

## 6. Search & Play Music

> **Requires:** yt-dlp installed locally, or at least one Docker extractor running (Invidious or Piped).

### In the app

1. Tap the **Search** tab in the bottom navigation
2. Type a song name or artist in the search bar
3. Wait for results to appear (searches are debounced by 500ms)
4. **Tap a track** to start playback
5. A **MiniPlayer** appears at the bottom showing the current track
6. Tap the MiniPlayer to open the **full-screen Now Playing** view

### Now Playing features

- **Seek bar** — drag to jump to any position
- **Play/Pause** — center button with green glow
- **Skip Next/Previous** — side buttons
- **Shuffle** — toggle shuffle mode (left of controls)
- **Repeat** — toggle repeat mode (right of controls)
- **Heart icon** — toggle favorite
- **Queue icon** — view and manage the playback queue
- **Add to playlist** — add the current track to any playlist

### Audio playback notes

- On **iOS**, the app selects MP4/AAC audio streams (iOS AVPlayer does not support WebM/OPUS)
- On **Android**, the app prefers OPUS streams for better quality at lower bitrates
- Stream URLs are resolved via the backend extractor pipeline and cached in Redis for 30 minutes

### Via API

```bash
# Search
curl "http://localhost:3000/api/search?q=never+gonna+give+you+up"

# Get stream URLs for a track
curl "http://localhost:3000/api/tracks/dQw4w9WgXcQ"

# Get trending tracks
curl "http://localhost:3000/api/trending"
```

---

## 7. Playlists & Library

### Creating a playlist

1. Go to the **Library** tab
2. Tap the **"+ New"** button in the Playlists section
3. Enter a name and optional description
4. Tap **Create**

### Adding tracks to a playlist

1. **Long-press** any track (in Search, Home, or Now Playing)
2. An **"Add to Playlist"** sheet appears at the bottom
3. Select an existing playlist or create a new one
4. A success toast confirms the addition

### Managing playlists

- **Tap a playlist** to see its tracks
- **Long-press a playlist** in the Library to delete it
- **Long-press a track** inside a playlist to remove it

### Liked Songs

- Tap the **heart icon** on the Now Playing screen to toggle favorite
- All liked songs appear in the **"Liked Songs"** card in the Library tab

### Via API (requires auth token)

```bash
TOKEN="your_access_token_here"

# Create playlist
curl -X POST http://localhost:3000/api/playlists \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Playlist", "description": "Favorite songs"}'

# List playlists
curl http://localhost:3000/api/playlists \
  -H "Authorization: Bearer $TOKEN"

# Add track to playlist
curl -X POST http://localhost:3000/api/playlists/<playlist_id>/tracks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 213,
    "thumbnailUrl": "https://..."
  }'

# Toggle favorite
curl -X POST http://localhost:3000/api/library/favorites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "duration": 213,
    "thumbnailUrl": "https://..."
  }'

# Get listening history
curl http://localhost:3000/api/library/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. Offline Downloads

1. Navigate to any track list (Search results, Playlist, etc.)
2. **Long-press** a track and choose **"Download"** (from Now Playing action)
3. The track audio is saved to the device's local storage
4. Go to **Library > Downloads** to view all downloaded tracks
5. Downloaded tracks can be played without an internet connection

### Managing downloads

- **Long-press** a downloaded track in the Downloads screen to delete it
- Tap **"Delete All"** in the Downloads header to clear all downloads
- The **Settings** screen shows total download size and has a "Clear All" option

---

## 9. Running Tests

### Backend tests (41 tests)

```bash
cd backend
npm test
```

Run with verbose output and coverage:

```bash
npm test -- --verbose --coverage
```

### Mobile tests (45 tests)

```bash
cd mobile
npm test
```

Run with verbose output:

```bash
npm test -- --verbose --coverage
```

### Run both from the project root

```bash
# Backend
(cd backend && npm test)

# Mobile
(cd mobile && npm test)
```

### What's tested

| Area        | Suite             | Tests                                                                       |
| ----------- | ----------------- | --------------------------------------------------------------------------- |
| **Backend** | Auth Service      | register, login, verifyToken, getUserById, AuthError                        |
| **Backend** | Extractor Service | search, cache hit, piped fallback, circuit breaker, getStreams, getTrending |
| **Backend** | Health Route      | /health endpoint, DB/Redis degraded states                                  |
| **Backend** | Auth Route        | Zod validation for register, login, refresh                                 |
| **Backend** | Search Route      | query validation, search results, 502 handling, suggestions, trending       |
| **Backend** | Track Route       | stream metadata, 502, placeholder endpoints                                 |
| **Mobile**  | Auth Store        | setAuth, setTokens, logout, hydrate from MMKV                               |
| **Mobile**  | Player Store      | playTrack, addToQueue, skip, togglePlayPause, clearQueue                    |
| **Mobile**  | Library Store     | playlists CRUD, optimistic favorites, isFavorite, history                   |
| **Mobile**  | TrackCard         | render, onPress, onLongPress, duration formatting                           |
| **Mobile**  | Toast             | success/error/info, dismiss, multiple messages                              |
| **Mobile**  | QueueView         | empty state, render tracks, clear, track press                              |

---

## 10. Code Formatting

The project uses **Prettier** for consistent code formatting across backend, mobile, and documentation.

### Format everything (code + markdown)

```bash
./scripts/format.sh
```

This single command formats:

- **Backend**: All TypeScript files in `backend/src/` and `backend/test/`
- **Mobile**: All TypeScript/TSX files in `mobile/src/`, `mobile/__tests__/`, and `mobile/App.tsx`
- **Docs**: All Markdown files in the project root, `docs/`, and `infrastructure/docs/`

### Check formatting (CI mode)

```bash
./scripts/format.sh --check
```

Returns exit code 1 if any files need formatting. Useful for CI pipelines.

### Format only code or only docs

```bash
./scripts/format.sh --code   # Format only TypeScript/TSX
./scripts/format.sh --docs   # Format only Markdown files
```

### Format individual packages

```bash
cd backend && npm run format        # Backend only
cd mobile && npm run format         # Mobile only
```

### Configuration

- Root config: `.prettierrc.json` (shared settings)
- Mobile override: `mobile/.prettierrc.js`
- Key settings: single quotes, trailing commas, 100-char print width

---

## 11. API Reference

All endpoints are prefixed with `/api`.

### Public endpoints

| Method | Path                            | Description                          |
| ------ | ------------------------------- | ------------------------------------ |
| `GET`  | `/health`                       | Health check (DB, Redis, extractors) |
| `GET`  | `/admin/extractors`             | Extractor circuit breaker status     |
| `POST` | `/auth/register`                | Create new account                   |
| `POST` | `/auth/login`                   | Login with email/password            |
| `POST` | `/auth/refresh`                 | Rotate JWT tokens                    |
| `GET`  | `/search?q=<query>`             | Search for tracks                    |
| `GET`  | `/search/suggestions?q=<query>` | Search autocomplete                  |
| `GET`  | `/trending`                     | Trending tracks                      |
| `GET`  | `/tracks/:videoId`              | Get track metadata + audio streams   |

### Authenticated endpoints (require `Authorization: Bearer <token>`)

| Method   | Path                             | Description                      |
| -------- | -------------------------------- | -------------------------------- |
| `GET`    | `/playlists`                     | List user's playlists            |
| `POST`   | `/playlists`                     | Create a playlist                |
| `GET`    | `/playlists/:id`                 | Get playlist with tracks         |
| `PUT`    | `/playlists/:id`                 | Update playlist name/description |
| `DELETE` | `/playlists/:id`                 | Delete a playlist                |
| `POST`   | `/playlists/:id/tracks`          | Add track to playlist            |
| `DELETE` | `/playlists/:id/tracks/:trackId` | Remove track from playlist       |
| `GET`    | `/library/favorites`             | List favorites                   |
| `POST`   | `/library/favorites`             | Add to favorites                 |
| `GET`    | `/library/favorites/:videoId`    | Check if favorited               |
| `DELETE` | `/library/favorites/:videoId`    | Remove from favorites            |
| `GET`    | `/library/history`               | Get listening history            |
| `POST`   | `/library/history`               | Record a play event              |

---

## 12. Dev Startup Script

The `scripts/dev-start.sh` script automates the full local setup:

```bash
# Start core (API + PostgreSQL + Redis)
./scripts/dev-start.sh

# Start everything (core + extractors + monitoring)
./scripts/dev-start.sh --full

# Stop all services
./scripts/dev-start.sh --stop

# Show running service status and endpoints
./scripts/dev-start.sh --status

# Tail all logs
./scripts/dev-start.sh --logs

# Wipe all data and restart fresh
./scripts/dev-start.sh --reset
```

### Ports after startup

| Service       | Port | URL                                   |
| ------------- | ---- | ------------------------------------- |
| API Server    | 3000 | http://localhost:3000                 |
| PostgreSQL    | 5432 | `psql -h localhost -U musicstream`    |
| Redis         | 6379 | `redis-cli`                           |
| Invidious     | 3001 | http://localhost:3001 (with `--full`) |
| Piped         | 3002 | http://localhost:3002 (with `--full`) |
| MinIO Console | 9001 | http://localhost:9001 (with `--full`) |
| Prometheus    | 9090 | http://localhost:9090 (with `--full`) |
| Grafana       | 3005 | http://localhost:3005 (with `--full`) |

---

## 13. Project Structure

```
MusicStream/
├── backend/                    # Node.js + Fastify API server
│   ├── src/
│   │   ├── config/env.ts       # Environment config (Zod validated)
│   │   ├── plugins/            # Fastify plugins (auth middleware)
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts         # POST /register, /login, /refresh
│   │   │   ├── health.ts       # GET /health, /admin/extractors
│   │   │   ├── playlists.ts    # Playlists, favorites, history CRUD
│   │   │   ├── search.ts       # GET /search, /trending
│   │   │   └── tracks.ts       # GET /tracks/:id
│   │   ├── services/           # Business logic
│   │   │   ├── auth.ts         # Argon2 hashing, JWT sign/verify
│   │   │   ├── cache.ts        # Redis wrapper with TTLs
│   │   │   ├── db.ts           # PostgreSQL pool + helpers
│   │   │   ├── extractor.ts    # Invidious/Piped/yt-dlp orchestrator
│   │   │   └── ytdlp.ts        # yt-dlp local extractor (search, streams, trending)
│   │   └── server.ts           # Fastify app entry point
│   ├── test/                   # Jest test suites
│   ├── migrations/             # SQL schema migrations
│   └── Dockerfile              # Production multi-stage build
│
├── mobile/                     # React Native mobile app
│   ├── src/
│   │   ├── app/Navigation.tsx  # React Navigation (tabs + stacks)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── TrackCard.tsx   # Track list item
│   │   │   ├── MiniPlayer.tsx  # Persistent bottom player bar
│   │   │   ├── Toast.tsx       # Toast notification system
│   │   │   ├── QueueView.tsx   # Playback queue display
│   │   │   ├── AddToPlaylistSheet.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── NetworkGuard.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── screens/            # Full screens
│   │   │   ├── Home.tsx        # Trending + recently played
│   │   │   ├── Search.tsx      # Debounced search + results
│   │   │   ├── NowPlaying.tsx  # Full-screen player
│   │   │   ├── Library.tsx     # Playlists + liked songs
│   │   │   ├── PlaylistDetail.tsx
│   │   │   ├── LikedSongs.tsx
│   │   │   ├── Downloads.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── services/           # API client, player setup, downloads
│   │   ├── stores/             # Zustand state (auth, player, library)
│   │   ├── theme/              # Colors, spacing, typography, shadows, icon sizes
│   │   └── types/              # TypeScript type definitions
│   ├── __tests__/              # Jest test suites
│   ├── ios/                    # Xcode project
│   └── android/                # Android project
│
├── infrastructure/             # Terraform IaC
│   ├── modules/                # Reusable Terraform modules
│   ├── environments/           # dev, staging, production configs
│   └── docs/RUNBOOK.md         # Infrastructure operations guide
│
├── docker/                     # Docker configs for services
├── docker-compose.yml          # Local development stack
├── scripts/dev-start.sh        # Automated local dev setup
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
└── CLAUDE.md                   # Project conventions
```

---

## 14. Troubleshooting

### Docker containers won't start

```bash
# Check if Docker is running
docker info

# Check container logs
docker compose logs postgres
docker compose logs redis
```

### API fails to connect to database

Ensure PostgreSQL is healthy:

```bash
docker compose exec postgres pg_isready -U musicstream
```

If you see a "relation does not exist" error, the migration hasn't run. The SQL migration at `backend/migrations/001_initial_schema.sql` is auto-applied by Docker (mounted into `/docker-entrypoint-initdb.d`). To reapply:

```bash
./scripts/dev-start.sh --reset
```

### Metro bundler errors

```bash
# Clear Metro cache
cd mobile
npx react-native start --reset-cache
```

### iOS build fails

```bash
# Re-install pods
cd mobile/ios
pod deintegrate
pod install --repo-update
```

### "Cannot find module" in tests

```bash
# Reinstall dependencies
cd backend && npm ci
cd ../mobile && npm ci
```

### Port already in use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or stop everything
./scripts/dev-start.sh --stop
```

### Search returns "All extractors failed"

This means Invidious, Piped, and yt-dlp all failed. Most commonly yt-dlp is not installed:

```bash
# Install yt-dlp
brew install yt-dlp

# Verify it works
yt-dlp --version

# Update to latest (fixes for site changes)
brew upgrade yt-dlp
```

If yt-dlp is installed but still failing, it may need an update (YouTube changes break older versions frequently).

### Docker extractors fail (ARM64 / Apple Silicon)

Invidious needs to build from source on Apple Silicon. This is handled by the custom Dockerfile at `docker/invidious/Dockerfile`. First build takes 5-10 minutes.

If Piped fails, it runs via Rosetta emulation (`platform: linux/amd64`). Ensure Rosetta is enabled in Docker Desktop settings.

> **Note:** Docker extractors are optional. The yt-dlp local fallback handles search and playback without them.

### MMKV storage issues

If the app crashes on startup with MMKV errors after an upgrade:

```bash
# iOS: Clear app data
xcrun simctl erase booted

# Android: Clear app data
adb shell pm clear com.musicstreamapp
```

### Redis connection errors (non-fatal)

Redis connection failures are non-fatal. The app works without Redis (caching is bypassed). If you see "Redis unavailable" in logs, ensure Redis is running:

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping
# Should return: PONG
```
