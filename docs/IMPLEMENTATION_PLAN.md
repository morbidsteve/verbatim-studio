# Verbatim Studio — Complete Implementation Plan

## Project Overview

**Verbatim Studio** is a privacy-first transcription application for legal professionals, government agencies, and organizations requiring secure audio/video transcription with speaker diarization and voice analysis.

### Technical Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Desktop** | Electron 28+ |
| **Backend** | FastAPI (Python 3.11+) |
| **Database** | SQLite (Basic) / PostgreSQL 16 (Enterprise) |
| **Job Queue** | Celery + Redis (Enterprise) |
| **Transcription** | WhisperX, WhisperLive, whisper.cpp |
| **Diarization** | PyAnnote Audio |
| **AI/LLM** | Ollama (local) |
| **Auth** | JWT + RBAC (Enterprise) |
| **Monorepo** | Turborepo + pnpm |
| **Containers** | Docker + Docker Compose |

### Repository Structure

```
verbatim-studio/
├── apps/
│   ├── desktop/              # Electron app (Basic + Enterprise client)
│   ├── web/                  # React web app (Enterprise browser access)
│   └── server/               # FastAPI backend (Enterprise)
├── packages/
│   ├── ui/                   # Shared React component library
│   ├── core/                 # Shared business logic & types
│   ├── database/             # Database schemas & migrations
│   ├── transcription/        # Transcription engine wrappers
│   └── ai/                   # AI/LLM integration layer
├── services/
│   ├── whisper-service/      # WhisperX transcription service
│   ├── whisper-live/         # Real-time transcription service
│   ├── diarization/          # Speaker diarization service
│   └── ollama-proxy/         # Ollama management service
├── docker/
│   ├── basic/                # Docker configs for Basic tier
│   └── enterprise/           # Docker configs for Enterprise
├── docs/
├── scripts/
└── tools/
```

---

## Phase 1: Foundation & Project Scaffolding

**Goal**: Set up the monorepo structure, tooling, and development environment.

### 1.1 Repository Setup
- [ ] Initialize git repository
- [ ] Create `.gitignore` with comprehensive rules
- [ ] Set up branch protection rules documentation
- [ ] Create `LICENSE` file (proprietary + evaluation)
- [ ] Create initial `README.md`

### 1.2 Monorepo Configuration
- [ ] Initialize pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Configure Turborepo (`turbo.json`)
- [ ] Set up root `package.json` with scripts
- [ ] Configure TypeScript base config (`tsconfig.base.json`)
- [ ] Set up ESLint shared config
- [ ] Set up Prettier config
- [ ] Configure Husky + lint-staged for pre-commit hooks

### 1.3 App Scaffolds
- [ ] Create `apps/desktop` - Electron + React + Vite scaffold
- [ ] Create `apps/web` - React + Vite scaffold (shares components with desktop)
- [ ] Create `apps/server` - FastAPI project structure
  - [ ] Configure Poetry/uv for Python dependencies
  - [ ] Set up FastAPI with uvicorn
  - [ ] Configure Alembic for migrations
  - [ ] Set up pytest structure

### 1.4 Package Scaffolds
- [ ] Create `packages/ui` - React component library with Storybook
- [ ] Create `packages/core` - Shared TypeScript types and utilities
- [ ] Create `packages/database` - Drizzle ORM schemas (SQLite + PostgreSQL)
- [ ] Create `packages/transcription` - Transcription service interfaces
- [ ] Create `packages/ai` - AI/LLM integration interfaces

### 1.5 Docker Setup
- [ ] Create base Dockerfiles for services
- [ ] Create `docker/basic/docker-compose.yml` for local Basic tier
- [ ] Create `docker/enterprise/docker-compose.yml` for Enterprise
- [ ] Set up GPU-enabled container configs (NVIDIA CUDA)
- [ ] Create ARM-optimized container configs (Apple Silicon)

### 1.6 Development Environment
- [ ] Create `.env.example` files for all apps/services
- [ ] Set up VS Code workspace settings
- [ ] Create development scripts (`scripts/dev.sh`, `scripts/setup.sh`)
- [ ] Document local development setup

### 1.7 Phase 1 Verification (MANDATORY)
- [x] Run `pnpm install` - must complete without errors
- [x] Run `pnpm build` - all 5 packages must build successfully
- [x] Test desktop app: `cd apps/desktop && pnpm dev` - Electron window must open
- [x] Test web app: `cd apps/web && pnpm preview` - must return HTTP 200
- [x] Test API server: `curl localhost:8000/api/health` - must return healthy status

---

## Phase 2: Core Transcription Engine

**Goal**: Build the transcription pipeline that powers both tiers.

### 2.1 WhisperX Service (File Transcription)
- [x] Create `services/whisper-service/` Python project
- [x] Implement WhisperX wrapper with model management
- [x] Add support for multiple model sizes (tiny → large-v3)
- [x] Implement batch transcription endpoint
- [x] Add word-level timestamp support
- [x] Implement language detection
- [x] Add GPU/CPU auto-detection and optimization
- [x] Create health check endpoint
- [ ] Write unit tests
- [x] Create Dockerfile with CUDA support
- [x] Create ARM-optimized Dockerfile (CPU variant)

### 2.2 WhisperLive Service (Real-time GPU)
- [x] Create `services/whisper-live/` Python project
- [x] Implement WebSocket server for streaming audio
- [x] Integrate faster-whisper for real-time inference
- [x] Implement voice activity detection (VAD)
- [x] Add partial transcript streaming
- [x] Implement final transcript assembly
- [x] Add multi-client session management
- [x] Create Dockerfile with CUDA support
- [ ] Write integration tests

### 2.3 whisper.cpp Service (Real-time CPU/ARM)
- [ ] Create `services/whisper-cpp/` project
- [ ] Build whisper.cpp with appropriate optimizations
- [ ] Create Python/Node bindings wrapper
- [ ] Implement streaming audio interface
- [ ] Add CoreML support for Apple Silicon
- [ ] Implement Metal acceleration
- [ ] Create ARM64 Dockerfile
- [ ] Create x86_64 Dockerfile

### 2.4 Speaker Diarization Service
- [x] Create `services/diarization/` Python project
- [x] Implement PyAnnote Audio pipeline
- [x] Add speaker embedding extraction
- [x] Implement speaker clustering
- [x] Create speaker identification persistence
- [x] Add "who is speaking" labeling
- [x] Integrate with transcription services
- [x] Implement speaker profile management (name speakers)
- [x] Create Dockerfile
- [ ] Write unit tests

### 2.5 Audio Processing Pipeline
- [x] Create audio format normalization utilities
- [x] Implement audio chunking for long files
- [x] Add audio quality analysis
- [x] Implement noise reduction preprocessing (optional)
- [x] Create audio extraction from video files (FFmpeg)
- [x] Add support for multiple audio formats (WAV, MP3, M4A, FLAC, OGG)
- [x] Add support for multiple video formats (MP4, MOV, AVI, MKV, WEBM)

### 2.6 Voice Inflection Analysis

**Prosodic Features (Core)**:
- [x] Implement pitch (F0) extraction and tracking
- [x] Implement speech rate analysis (syllables/second)
- [x] Add volume/intensity (dB) tracking
- [x] Create pause detection and duration analysis
- [x] Implement pitch contour visualization
- [x] Add prosodic feature aggregation per segment

**Emotion Detection (ML-based)**:
- [x] Research and select emotion detection model (Wav2Vec2-based: `ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition`)
- [x] Implement emotion classification (happy, sad, angry, neutral, fearful, surprised)
- [x] Add confidence scores for predictions
- [x] Create fallback to prosodic heuristics when confidence is low
- [x] Implement model caching for performance

**Integration**:
- [x] Create unified inflection metadata schema
- [x] Integrate with transcript timeline (per-segment annotations)
- [ ] Add inflection visualization in UI (color coding, icons)
- [ ] Implement inflection export in transcript formats
- [ ] Create inflection summary statistics per recording

### 2.7 Transcription Package (`packages/transcription`)
- [x] Define TypeScript interfaces for transcription results
- [x] Create service client abstractions
- [x] Implement transcription job management
- [x] Add progress tracking utilities
- [x] Create export formatters (JSON, SRT, VTT, TXT)
- [ ] Add DOCX/PDF export formatters
- [ ] Write unit tests

---

## Phase 3: Database & Data Layer

**Goal**: Implement the data persistence layer for both tiers.

### 3.1 Schema Design
- [x] Design core entities:
  - [x] `users` (Enterprise only)
  - [x] `organizations` (Enterprise only)
  - [x] `workspaces` (Enterprise only)
  - [x] `projects`
  - [x] `recordings`
  - [x] `transcripts`
  - [x] `transcript_segments`
  - [x] `speakers`
  - [x] `speaker_profiles`
  - [x] `templates` (project & recording)
  - [x] `custom_metadata_fields`
  - [x] `metadata_values`
  - [x] `exports`
  - [x] `audit_logs` (Enterprise only)
- [x] Design relationships and indexes
- [ ] Document schema in ERD

### 3.2 SQLite Implementation (Basic Tier)
- [x] Set up Drizzle ORM for SQLite in `packages/database`
- [x] Implement all schemas for Basic tier
- [x] Create migration system for Electron app updates
- [x] Implement data encryption at rest (via Storage layer)
- [x] Add database backup/restore utilities
- [ ] Write integration tests

### 3.3 PostgreSQL Implementation (Enterprise)
- [x] Set up Drizzle ORM for PostgreSQL
- [x] Implement full schema with multi-tenancy support
- [ ] Set up Alembic migrations in FastAPI
- [ ] Implement row-level security policies
- [ ] Add database connection pooling
- [ ] Write integration tests

### 3.4 File Storage
- [x] Design file storage abstraction layer
- [x] Implement local filesystem storage
- [x] Implement S3-compatible storage (Enterprise)
- [x] Add encryption for stored files (AES-256-GCM)
- [ ] Implement file cleanup/retention policies
- [ ] Add file integrity verification

---

## Phase 4: Basic Tier — Electron Desktop App

**Goal**: Build the complete standalone desktop application.

### 4.1 Electron Main Process
- [ ] Set up Electron Forge or electron-builder
- [ ] Implement secure IPC communication
- [ ] Create window management
- [ ] Implement system tray integration
- [ ] Add auto-updater (connects to license server)
- [ ] Implement deep linking support
- [ ] Add crash reporting
- [ ] Set up secure storage (electron-store encrypted)

### 4.2 Docker Service Management (Invisible to User)

The Docker layer should be completely transparent to users. They see "Verbatim Studio" — not containers.

- [ ] Create Docker service orchestrator in main process
- [ ] Implement automatic Docker Desktop detection/installation prompt
- [ ] Add automatic container image pulling on first launch
- [ ] Implement automatic container startup on app launch
- [ ] Add graceful container shutdown on app quit
- [ ] Create health monitoring with auto-restart on failure
- [ ] Implement resource monitoring (CPU, RAM, GPU) — internal only
- [ ] Add intelligent resource allocation based on system specs
- [ ] Create log aggregation for debugging (hidden from user)
- [ ] Implement model download with user-friendly progress UI
- [ ] Create GPU detection and automatic CUDA/Metal allocation
- [ ] Add fallback to CPU when GPU unavailable (seamless)
- [ ] Implement container update mechanism (silent background updates)

### 4.3 React Frontend — Core UI
- [ ] Set up React Router for navigation
- [ ] Implement global state management (Zustand)
- [ ] Create application layout/shell
- [ ] Implement dark/light theme support
- [ ] Create responsive design system
- [ ] Set up i18n infrastructure

### 4.4 React Frontend — Project Management
- [ ] Create project list view
- [ ] Implement project creation wizard
- [ ] Add project settings panel
- [ ] Create folder/hierarchy management
- [ ] Implement project templates
- [ ] Add project search/filter
- [ ] Create project dashboard with statistics

### 4.5 React Frontend — Recording Interface
- [ ] Create recording control panel
- [ ] Implement audio input device selection
- [ ] Add audio level visualization
- [ ] Create video preview (for video recordings)
- [ ] Implement recording timer
- [ ] Add pause/resume functionality
- [ ] Create recording templates
- [ ] Implement real-time transcription display
- [ ] Add speaker identification during recording

### 4.6 React Frontend — File Upload
- [ ] Create drag-and-drop upload zone
- [ ] Implement file format validation
- [ ] Add upload progress tracking
- [ ] Create batch upload support
- [ ] Implement transcription queue display
- [ ] Add upload history

### 4.7 React Frontend — Transcript Viewer/Editor
- [ ] Create synchronized transcript display
- [ ] Implement media player integration
- [ ] Add click-to-seek functionality
- [ ] Create speaker label editing
- [ ] Implement text correction/editing
- [ ] Add confidence highlighting
- [ ] Create find/replace functionality
- [ ] Implement undo/redo
- [ ] Add keyboard shortcuts
- [ ] Create inflection/sentiment visualization
- [ ] Implement custom highlight/annotations

### 4.8 React Frontend — Export
- [ ] Create export dialog
- [ ] Implement DOCX generation
- [ ] Implement PDF generation
- [ ] Implement SRT/VTT generation
- [ ] Add export templates
- [ ] Create batch export
- [ ] Add export history

### 4.9 React Frontend — Settings
- [ ] Create settings panel
- [ ] Implement model selection/download UI
- [ ] Add transcription preferences
- [ ] Create storage management
- [ ] Implement backup/restore UI
- [ ] Add performance settings (GPU allocation, etc.)
- [ ] Create keyboard shortcuts customization

### 4.10 Licensing System (Basic)
- [ ] Design license key format
- [ ] Implement license validation endpoint (server-side)
- [ ] Create license check in Electron app
- [ ] Add offline grace period
- [ ] Implement license activation flow
- [ ] Create license status display
- [ ] Add trial mode support

---

## Phase 5: Enterprise Backend

**Goal**: Build the FastAPI server for Enterprise deployments.

### 5.1 FastAPI Core
- [ ] Set up project structure with routers
- [ ] Implement dependency injection
- [ ] Configure CORS
- [ ] Set up request validation (Pydantic v2)
- [ ] Implement error handling middleware
- [ ] Add request logging
- [ ] Create OpenAPI documentation
- [ ] Set up health check endpoints

### 5.2 Authentication & Authorization
- [ ] Implement JWT token generation/validation
- [ ] Create user registration endpoint
- [ ] Implement login/logout endpoints
- [ ] Add refresh token rotation
- [ ] Implement password hashing (argon2)
- [ ] Create password reset flow
- [ ] Add email verification
- [ ] Implement RBAC middleware
- [ ] Define permission system
- [ ] Create role management endpoints
- [ ] Add user approval workflow
- [ ] Implement session management

### 5.3 SSO Integration (Enterprise)
- [ ] Implement SAML 2.0 support
- [ ] Add OAuth 2.0/OIDC support
- [ ] Create SSO configuration endpoints
- [ ] Implement JIT user provisioning
- [ ] Add IdP metadata management

### 5.4 Organization & Workspace Management
- [ ] Create organization CRUD endpoints
- [ ] Implement workspace management
- [ ] Add team membership management
- [ ] Create invitation system
- [ ] Implement workspace permissions
- [ ] Add organization settings

### 5.5 Project & Recording APIs
- [ ] Create project CRUD endpoints
- [ ] Implement recording upload endpoints
- [ ] Add streaming upload support
- [ ] Create transcription job endpoints
- [ ] Implement transcript CRUD
- [ ] Add speaker profile management
- [ ] Create template endpoints
- [ ] Implement metadata field endpoints
- [ ] Add export endpoints

### 5.6 Job Queue System
- [ ] Set up Celery with Redis broker
- [ ] Create transcription task definitions
- [ ] Implement priority queue
- [ ] Add job status tracking
- [ ] Create job cancellation
- [ ] Implement retry logic
- [ ] Add dead letter queue handling
- [ ] Create job scheduling

### 5.7 Real-time Features
- [ ] Set up WebSocket support
- [ ] Implement live transcription streaming
- [ ] Add collaborative editing (operational transforms or CRDT)
- [ ] Create notification system
- [ ] Implement presence indicators

### 5.8 Audit Logging
- [ ] Design audit log schema
- [ ] Implement audit middleware
- [ ] Create audit log query endpoints
- [ ] Add log retention policies
- [ ] Implement log export

### 5.9 Analytics Dashboard
- [ ] Design analytics data models
- [ ] Implement usage tracking
- [ ] Create analytics aggregation jobs
- [ ] Build dashboard API endpoints
- [ ] Add export functionality

---

## Phase 6: AI Features

**Goal**: Implement AI-powered features using local Ollama.

### 6.1 Ollama Integration Service
- [ ] Create `services/ollama-proxy/` service
- [ ] Implement Ollama API wrapper
- [ ] Add model management (pull, list, delete)
- [ ] Create model health monitoring
- [ ] Implement request queuing
- [ ] Add response streaming
- [ ] Create centralized model config (Enterprise)

### 6.2 AI Package (`packages/ai`)
- [ ] Define AI service interfaces
- [ ] Create prompt template system
- [ ] Implement response parsing utilities
- [ ] Add retry/fallback logic
- [ ] Create token counting utilities

### 6.3 Transcript Summarization
- [ ] Design summarization prompts
- [ ] Implement chunk-based summarization for long transcripts
- [ ] Add summary length options
- [ ] Create summary caching
- [ ] Implement summary regeneration
- [ ] Add custom summary templates

### 6.4 AI Chat Assistant
- [ ] Design chat interface
- [ ] Implement RAG pipeline for transcript Q&A
- [ ] Add conversation history management
- [ ] Create context window management
- [ ] Implement citation linking (jump to transcript segment)
- [ ] Add multi-transcript querying

### 6.5 Semantic Search
- [ ] Set up vector database (Chroma or similar, embedded)
- [ ] Implement transcript embedding pipeline
- [ ] Create search API endpoints
- [ ] Add hybrid search (keyword + semantic)
- [ ] Implement search result ranking
- [ ] Create search filters (date, project, speaker)

### 6.6 Additional AI Features
- [ ] Implement action item extraction
- [ ] Add key points/highlights detection
- [ ] Create speaker analysis (talk time, interruptions)
- [ ] Implement topic segmentation
- [ ] Add custom prompt templates

---

## Phase 7: Meeting Bots (Enterprise)

**Goal**: Implement automated meeting recording bots.

### 7.1 Bot Framework
- [ ] Design bot architecture
- [ ] Create bot orchestration service
- [ ] Implement bot scheduling
- [ ] Add bot status monitoring
- [ ] Create bot logs/diagnostics

### 7.2 Zoom Bot
- [ ] Implement Zoom SDK integration
- [ ] Create meeting join flow
- [ ] Implement audio capture
- [ ] Add participant tracking
- [ ] Create recording management
- [ ] Implement error handling/reconnection

### 7.3 Microsoft Teams Bot
- [ ] Implement Teams Bot Framework integration
- [ ] Create meeting join flow
- [ ] Implement audio capture via Graph API
- [ ] Add participant tracking
- [ ] Create recording management

### 7.4 Google Meet Bot
- [ ] Research Google Meet integration options
- [ ] Implement browser-based bot (Puppeteer/Playwright)
- [ ] Create audio capture pipeline
- [ ] Add participant detection
- [ ] Implement recording management

### 7.5 Calendar Integration
- [ ] Implement Google Calendar integration
- [ ] Add Microsoft Outlook/365 integration
- [ ] Create automatic bot scheduling
- [ ] Add meeting detection
- [ ] Implement calendar sync

---

## Phase 8: Enterprise Web Application

**Goal**: Build the browser-based interface for Enterprise users.

### 8.1 Web App Setup
- [ ] Configure `apps/web` for production builds
- [ ] Set up authentication flow
- [ ] Implement API client layer
- [ ] Add service worker for offline support
- [ ] Configure CDN deployment

### 8.2 Shared Components
- [ ] Extract shared components from desktop to `packages/ui`
- [ ] Create web-specific adaptations
- [ ] Implement responsive layouts
- [ ] Add accessibility compliance (WCAG 2.1 AA)
- [ ] Create component documentation

### 8.3 Web-specific Features
- [ ] Implement browser-based audio recording
- [ ] Add file upload with chunked uploads
- [ ] Create real-time collaboration UI
- [ ] Implement notifications (push + in-app)
- [ ] Add organization management UI
- [ ] Create user management UI
- [ ] Implement audit log viewer
- [ ] Create analytics dashboards

---

## Phase 9: Deployment & DevOps

**Goal**: Create deployment infrastructure and processes.

### 9.1 CI/CD Pipeline
- [ ] Set up GitHub Actions workflows
- [ ] Create build pipeline for all apps
- [ ] Implement automated testing
- [ ] Add code quality checks
- [ ] Create security scanning
- [ ] Implement semantic versioning
- [ ] Add changelog generation

### 9.2 Electron Distribution
- [ ] Configure code signing (macOS, Windows)
- [ ] Set up notarization (macOS)
- [ ] Create installer packages
- [ ] Implement auto-update server
- [ ] Add update channels (stable, beta)
- [ ] Create distribution CDN

### 9.3 Enterprise Self-Host Package
- [ ] Create installation documentation
- [ ] Build Helm charts for Kubernetes
- [ ] Create Docker Compose production configs
- [ ] Implement configuration management
- [ ] Add health check/monitoring configs
- [ ] Create backup/restore scripts
- [ ] Build upgrade procedures

### 9.4 Cloud Hosting (Managed)
- [ ] Design multi-tenant architecture
- [ ] Set up cloud infrastructure (AWS/GCP)
- [ ] Implement tenant isolation
- [ ] Create scaling policies
- [ ] Set up monitoring/alerting
- [ ] Implement disaster recovery
- [ ] Add geographic redundancy

### 9.5 Security Hardening
- [ ] Implement network security policies
- [ ] Add secrets management
- [ ] Create security audit logging
- [ ] Implement intrusion detection
- [ ] Add vulnerability scanning
- [ ] Create incident response procedures

---

## Phase 10: Licensing & Billing

**Goal**: Implement the licensing and billing infrastructure.

### 10.1 License Server
- [ ] Design license server architecture
- [ ] Implement license generation
- [ ] Create license validation API
- [ ] Add license activation/deactivation
- [ ] Implement usage metering
- [ ] Create license portal

### 10.2 Billing Integration
- [ ] Integrate Stripe for payments
- [ ] Implement subscription management
- [ ] Create pricing tiers
- [ ] Add usage-based billing options
- [ ] Implement invoicing
- [ ] Create billing portal

### 10.3 Trial & Evaluation
- [ ] Implement trial license generation
- [ ] Create trial limitations
- [ ] Add trial-to-paid conversion flow
- [ ] Implement evaluation tracking

---

## Phase 11: Documentation & Polish

**Goal**: Create comprehensive documentation and polish the product.

### 11.1 User Documentation
- [ ] Create user guide
- [ ] Write quick start guides
- [ ] Add video tutorials
- [ ] Create FAQ
- [ ] Write troubleshooting guide

### 11.2 Technical Documentation
- [ ] Create API documentation
- [ ] Write deployment guides
- [ ] Add architecture documentation
- [ ] Create integration guides
- [ ] Write security documentation

### 11.3 Quality Assurance
- [ ] Conduct usability testing
- [ ] Perform security audit
- [ ] Complete accessibility audit
- [ ] Conduct performance testing
- [ ] Create test automation suite

### 11.4 Launch Preparation
- [ ] Create marketing website
- [ ] Set up support system
- [ ] Implement analytics
- [ ] Create onboarding flow
- [ ] Set up feedback collection

---

## Implementation Strategy: Enterprise-First

**Key Insight**: Build the full Enterprise feature set first. The Basic tier becomes a feature-gated subset running locally, not a separate codebase. This approach:

- Avoids code duplication
- Ensures feature parity where applicable
- Simplifies maintenance
- Makes upgrades seamless (unlock features, no reinstall)

### Deployment Modes

| Mode | Description | Backend | Storage | Use Case |
|------|-------------|---------|---------|----------|
| **Local-Only** | Everything runs on user's machine | Embedded (Docker) | SQLite + Local FS | Basic tier, air-gapped Enterprise |
| **Self-Hosted** | Client connects to org's internal servers | Org's Docker/K8s | PostgreSQL + Org's S3 | Enterprise self-managed |
| **Cloud-Hosted** | Client connects to your managed cloud | Your infrastructure | PostgreSQL + Your S3 | Enterprise SaaS |

The Electron app detects its mode from configuration:

```typescript
type DeploymentMode = 'local-only' | 'self-hosted' | 'cloud-hosted';

interface AppConfig {
  mode: DeploymentMode;
  apiUrl?: string;        // undefined for local-only
  licenseServerUrl: string;
  features: FeatureFlags;
}
```

### Feature Gating Strategy

The Electron app contains the full codebase. Feature availability is controlled by:

1. **License type** (Basic vs Enterprise)
2. **Deployment mode** (local-only vs connected)
3. **Runtime feature flags**

```typescript
// Example feature gate
const features = {
  multiUser: license.tier === 'enterprise',
  teamWorkspaces: license.tier === 'enterprise',
  sso: license.tier === 'enterprise' && deployment.mode !== 'local-only',
  auditLogs: license.tier === 'enterprise',
  browserAccess: license.tier === 'enterprise' && deployment.mode !== 'local-only',
  // Basic features always available
  transcription: true,
  diarization: true,
  aiFeatures: true,
  export: true,
};
```

## Implementation Order (Recommended)

Build in this order for maximum efficiency:

1. **Phase 1** — Foundation & Scaffolding
2. **Phase 2** — Core Transcription Engine
3. **Phase 3** — Database Layer (PostgreSQL first, SQLite adapter second)
4. **Phase 5** — Enterprise Backend (full API)
5. **Phase 4** — Electron Desktop App (full UI, feature-gated)
6. **Phase 6** — AI Features
7. **Phase 8** — Enterprise Web App (share components with Electron)
8. **Phase 7** — Meeting Bots
9. **Phase 9** — Deployment & DevOps
10. **Phase 10** — Licensing & Billing
11. **Phase 11** — Documentation & Polish

---

## Verification Strategy

**IMPORTANT**: Every phase must include verification before moving on. Testing is mandatory, not optional.

### Mandatory Build & Test Steps

After completing any code changes, run:

```bash
# 1. Install dependencies (if changed)
pnpm install

# 2. Build all packages
pnpm build

# 3. Fix any TypeScript errors before proceeding

# 4. Test applications
# Desktop:
cd apps/desktop && pnpm dev  # Verify Electron launches
# Web:
cd apps/web && pnpm preview  # Verify web app runs (HTTP 200)
# Server:
cd apps/server && source .venv/bin/activate && uvicorn src.main:app --reload
curl http://localhost:8000/api/health  # Should return {"status":"healthy"}
```

### Phase-Specific Verification

1. **Unit Tests**: Run `pnpm test` in affected packages
2. **Integration Tests**: Run `pnpm test:integration`
3. **E2E Tests**: Run `pnpm test:e2e` for UI flows
4. **Manual Testing**:
   - Basic Tier: Launch Electron app, record audio, verify transcription
   - Enterprise: Deploy Docker stack, test API endpoints, verify web UI
5. **Performance Testing**: Benchmark transcription speed, API response times

### Quick Health Checks

| Component | Command | Expected Result |
|-----------|---------|-----------------|
| Build | `pnpm build` | 5/5 tasks successful |
| Desktop Dev | `cd apps/desktop && pnpm dev` | Electron window opens |
| Web Preview | `cd apps/web && pnpm preview` | HTTP 200 on localhost:4173 |
| API Server | `curl localhost:8000/api/health` | `{"status":"healthy"}` |
| API Docs | `open http://localhost:8000/api/docs` | Swagger UI loads (debug mode) |

---

## How to Continue

When ready to implement, prompt:

> "Continue with Phase [X]: [Phase Name]"

Or for specific tasks:

> "Implement Phase [X], Section [X.Y]: [Section Name]"

The assistant will work through each task, marking items complete as they're finished.
