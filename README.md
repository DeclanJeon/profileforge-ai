<div align="center">
  <img src="public/logo.svg" alt="ProfileForge AI logo" width="92" />

  <h1>ProfileForge AI</h1>

  <p><strong>AI profile-photo generator for professional, social, fantasy, cosplay, creator, sci-fi, and avatar concepts.</strong></p>

  <p>
    <a href="https://profileforge.ponslink.com"><img alt="Live Demo" src="https://img.shields.io/badge/Live-profileforge.ponslink.com-111827?style=for-the-badge&logo=vercel&logoColor=white"></a>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
    <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white">
    <img alt="Bun" src="https://img.shields.io/badge/Bun-1.3-000000?style=for-the-badge&logo=bun&logoColor=white">
    <img alt="Prisma" src="https://img.shields.io/badge/Prisma-SQLite-2D3748?style=for-the-badge&logo=prisma&logoColor=white">
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white">
  </p>
</div>

---

## Overview

ProfileForge AI transforms a user's source portrait into polished profile images across curated concepts. The app emphasizes identity preservation, concept variety, safe temporary storage, and a production-friendly generation pipeline backed by an external image-generation adapter.

The current product ships with **62 prompt-designed concepts** across:

| Category | Examples |
| --- | --- |
| Professional | Classic Corporate Navy, Executive Dark Studio, Founder PR Portrait |
| Social | Coffee Shop Lifestyle, Night Market Portrait, Autumn City |
| ID-style | Resume Clean, Badge Corporate, School Portrait Style |
| Editorial | Magazine Cover, Vogue Style Editorial, Mono Noir |
| Creator | Gaming Streamer, Podcast Host, Fitness Coach |
| Cosplay | Fantasy Mage, Steampunk Explorer, Cyber Warrior |
| Fantasy | Knight, Elf Archer, Noir Detective, Vintage Royal |
| Sci-Fi | Astronaut Portrait, Cyberpunk Executive, Mars Colonist |
| Art / Avatar | Watercolor, Oil Painting, 3D Animation, Pop Art |

## Product highlights

- **Identity-locked prompts**: every generation uses the uploaded image as the only face and identity reference.
- **Diverse direction system**: concepts specify outfit, background, lighting, expression, aspect ratio, creativity, and thumbnail prompt.
- **Prompt-based concept thumbnails**: each card displays a generated visual sample so users can predict the target style.
- **Async generation jobs**: the UI starts generation quickly, polls job status, and avoids long request timeouts.
- **Ephemeral result storage**: generated images are not kept as permanent server assets.
- **Download/delete flow**: users can download selected outputs and clear session assets.

## Privacy and retention model

Generated images are intentionally short-lived. The production design avoids storing generated outputs in public/static app folders.

| Asset | Storage | URL shape | TTL | Cache policy |
| --- | --- | --- | --- | --- |
| Uploaded source image | `public/uploads` runtime directory | `/uploads/{file}` | 30 minutes | temporary input only |
| Generated result image | `/tmp/profileforge-generated` | `/api/profileforge/image/{file}` | 10 minutes | `private, no-store, max-age=0` |

Cleanup is handled by `scripts/profileforge-cleanup.mjs`, which removes expired DB records and orphaned files. On production, a systemd timer runs the cleanup job every five minutes.

## Architecture

```mermaid
flowchart LR
  A[User uploads portrait] --> B[Upload API]
  B --> C[(SQLite via Prisma)]
  C --> D[Generate API creates async job]
  D --> E[Image generation adapter]
  E --> F[/tmp/profileforge-generated]
  F --> G[No-store image API]
  G --> H[Browser preview and download]
  F --> I[Cleanup timer]
  C --> I
```

## Tech stack

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **Styling/UI**: Tailwind CSS 4, shadcn-style Radix primitives, lucide-react
- **Data**: Prisma + SQLite
- **Runtime**: Bun for local development/build, Node-compatible standalone production server
- **Image generation**: external adapter, pinned operationally to the production image model
- **Deployment target**: `ponslink` systemd service behind `https://profileforge.ponslink.com`

## Getting started

### Prerequisites

- Bun 1.3+
- Node-compatible environment for Next.js standalone output
- SQLite
- A reachable image-generation adapter host if running real generation

### Install

```bash
bun install
cp .env.example .env
bun run db:generate
bun run db:push
```

### Run locally

```bash
bun run dev
```

Open `http://localhost:3000`.

### Build

```bash
bun run build
```

The build script copies static assets, public assets, and cleanup scripts into `.next/standalone` for deployment.

## Environment variables

| Variable | Purpose | Default / example |
| --- | --- | --- |
| `DATABASE_URL` | Prisma SQLite connection | `file:./db/custom.db` |
| `PROFILEFORGE_IMAGE_PROVIDER_HOST` | SSH host for the image-generation adapter | `ponslink` |
| `PROFILEFORGE_IMAGE_PROVIDER_BIN` | Image-generation adapter executable path | `$HOME/bin/image-adapter` |
| `PROFILEFORGE_IMAGE_PROVIDER_TIMEOUT_SECONDS` | Generation timeout | `900` |
| `PROFILEFORGE_GENERATED_IMAGE_DIR` | Ephemeral result directory | `/tmp/profileforge-generated` |
| `PROFILEFORGE_GENERATED_IMAGE_TTL_SECONDS` | Generated result TTL | `600` |
| `PROFILEFORGE_UPLOAD_TTL_SECONDS` | Source upload TTL | `1800` |

## Operational cleanup

Run cleanup manually:

```bash
bun scripts/profileforge-cleanup.mjs
```

Recommended production timer:

```ini
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s
Persistent=true
```

## Repository hygiene

Runtime files are intentionally ignored:

- `.env` and other local environment files
- `.gjc/` workflow state
- SQLite DB files under `db/`
- User uploads under `public/uploads/`
- Next.js build output and logs

## Project status

ProfileForge AI is deployed and operational on `https://profileforge.ponslink.com`. The generation path uses the production image adapter, async job polling, curated thumbnails, and short-lived generated-image retention.
