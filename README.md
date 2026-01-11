# Verbatim Studio

Privacy-first transcription platform for legal professionals, government agencies, and organizations requiring secure audio/video transcription with speaker diarization and voice analysis.

## Features

- **Core Transcription**: Upload files or record live with real-time transcription
- **Speaker Diarization**: Automatically identify and label different speakers
- **Voice Inflection Analysis**: Track pitch, speech rate, volume, and emotion
- **AI-Powered**: Summarization, semantic search, and chat assistant (via local Ollama)
- **Export Formats**: DOCX, PDF, SRT, VTT
- **Privacy-First**: All processing can run locally on your machine

## Architecture

```
verbatim-studio/
├── apps/
│   ├── desktop/          # Electron desktop application
│   ├── web/              # React web application (Enterprise)
│   └── server/           # FastAPI backend (Enterprise)
├── packages/
│   ├── ui/               # Shared React components
│   ├── core/             # Shared types and utilities
│   ├── database/         # Database schemas (Drizzle ORM)
│   ├── transcription/    # Transcription service interfaces
│   └── ai/               # AI/LLM integration
├── services/
│   ├── whisper-service/  # WhisperX file transcription
│   ├── whisper-live/     # Real-time transcription (GPU)
│   ├── whisper-cpp/      # Real-time transcription (CPU/ARM)
│   ├── diarization/      # Speaker diarization (PyAnnote)
│   └── ollama-proxy/     # Ollama management
└── docker/
    ├── basic/            # Docker Compose for Basic tier
    └── enterprise/       # Docker Compose for Enterprise
```

## License Tiers

### Basic
- Single-user desktop application
- All core transcription features
- Local AI features via Ollama
- SQLite database (local storage)

### Enterprise
- Multi-user with role-based access control
- Team workspaces and collaboration
- Browser access + Desktop app
- Meeting bots (Zoom/Teams/Meet)
- SSO/SAML integration
- Audit logging
- PostgreSQL database

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+
- Python 3.11+
- Docker Desktop
- CUDA toolkit (optional, for GPU acceleration)

### Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript |
| Desktop | Electron 28+ |
| Backend | FastAPI, Python 3.11+ |
| Database | SQLite (Basic) / PostgreSQL 16 (Enterprise) |
| Queue | Celery + Redis (Enterprise) |
| Transcription | WhisperX, WhisperLive, whisper.cpp |
| Diarization | PyAnnote Audio |
| AI/LLM | Ollama |
| Auth | JWT + RBAC |
| Monorepo | Turborepo + pnpm |

## Security

Verbatim Studio is designed for security-sensitive environments:

- **Local-only mode**: All processing on your machine, no data leaves
- **Self-hosted Enterprise**: Deploy on your own infrastructure
- **Encryption**: Data encrypted at rest and in transit
- **Audit logging**: Complete activity tracking (Enterprise)
- **RBAC**: Fine-grained access control (Enterprise)

## License

Proprietary software. See [LICENSE](./LICENSE) for details.
