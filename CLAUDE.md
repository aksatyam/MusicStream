# MusicStream Project

## Overview
Open-source cross-platform music streaming app. React Native frontend, Node.js/Fastify backend, Terraform-managed AWS infrastructure. Uses Invidious/Piped/NewPipe extractors instead of YouTube API.

## Project Structure
```
infrastructure/     - Terraform IaC (modules + environments)
backend/            - Node.js + Fastify API server (TypeScript)
docker/             - Docker configs for services
docker-compose.yml  - Local development environment
```

## Key Commands
- `docker compose up -d` — Start local dev environment
- `cd infrastructure/environments/dev && terraform init` — Init Terraform
- `cd backend && npm run dev` — Start API in dev mode
- `cd backend && npm test` — Run tests

## Tech Stack
- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL 16 + Redis 7
- **Extractors**: Invidious (primary), Piped (secondary)
- **Infrastructure**: Terraform + AWS (ECS Fargate, RDS, ElastiCache, ALB, S3)
- **Mobile**: React Native + TypeScript (to be set up in Phase 2)

## Conventions
- Use TypeScript strict mode everywhere
- Zod for request validation
- Fastify plugin pattern for routes
- Terraform modules in `infrastructure/modules/`, environments in `infrastructure/environments/`
- Dev values in terraform.tfvars per environment

## Architecture Notes
- Multi-extractor pipeline with circuit breaker failover (Invidious -> Piped -> NewPipe -> yt-dlp)
- All extractors return normalized response schema
- Redis caching: 30min for streams, 6h for search, 24h for metadata
- Security groups: ALB -> ECS only, ECS -> RDS/Redis only
