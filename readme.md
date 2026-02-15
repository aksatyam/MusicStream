# MusicStream Project

## Overview

Open-source cross-platform music streaming app. React Native frontend, Node.js/Fastify backend, Terraform-managed AWS infrastructure. Uses Invidious/Piped extractors with yt-dlp local fallback instead of YouTube API.

## Project Structure

```
infrastructure/     - Terraform IaC (modules + environments)
backend/            - Node.js + Fastify API server (TypeScript)
mobile/             - React Native mobile app (iOS + Android)
docker/             - Docker configs for services
docker-compose.yml  - Local development environment
scripts/            - Dev automation scripts
docs/               - Product docs and user guide
```

## Key Commands

- `docker compose up -d` — Start local dev environment (Postgres, Redis, MinIO)
- `./scripts/dev-start.sh` — Automated full local setup
- `cd backend && npm run dev` — Start API in dev mode (port 3000)
- `cd backend && npm test` — Run backend tests (41 tests)
- `cd mobile && npm start` — Start Metro bundler (port 8081)
- `cd mobile && npx react-native run-ios` — Build and run iOS app
- `cd mobile && npm test` — Run mobile tests (45 tests)
- `cd infrastructure/environments/dev && terraform init` — Init Terraform

## Tech Stack

- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL 16 + Redis 7
- **Extractors**: Invidious (primary), Piped (secondary), yt-dlp (local fallback)
- **Infrastructure**: Terraform + AWS (ECS Fargate, RDS, ElastiCache, ALB, S3)
- **Mobile**: React Native 0.84 + TypeScript
  - Navigation: React Navigation v7 (bottom tabs + native stacks)
  - State: Zustand + MMKV (persistent storage)
  - Audio: react-native-track-player
  - Icons: react-native-vector-icons (Ionicons)
  - HTTP: Axios

## Conventions

- Use TypeScript strict mode everywhere
- Zod for request validation
- Fastify plugin pattern for routes
- Terraform modules in `infrastructure/modules/`, environments in `infrastructure/environments/`
- Dev values in terraform.tfvars per environment
- Platform-aware stream selection: iOS uses MP4/AAC, Android uses OPUS/WebM

## Architecture Notes

- Multi-extractor pipeline with circuit breaker failover (Invidious -> Piped -> yt-dlp)
- yt-dlp runs locally via `child_process.execFile` as final fallback
- All extractors return normalized response schema
- Redis caching: 30min for streams, 6h for search, 1h for trending
- Audio streams sorted MP4/AAC first for iOS compatibility
- Security groups: ALB -> ECS only, ECS -> RDS/Redis only
