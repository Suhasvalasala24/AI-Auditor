# AI Auditor Dashboard

A comprehensive monitoring and auditing platform for AI models. The application tracks PII leaks, model drift, bias detection, hallucinations, and compliance across multiple AI systems.

## Overview

AI Auditor provides enterprise-grade tools for:
- **Dashboard**: Main overview with metrics cards and trend charts for PII, Drift, Bias, and Hallucination monitoring
- **Model Manager**: Manage custom AI models with full CRUD operations
- **Audits**: Both Model Auditing (active testing) and Log Auditing (passive analysis) with configurable categories
- **Analytics Pages**: Detailed views for Drift, Bias, Hallucination, PII, and Compliance monitoring
- **Settings**: Configure notifications, audit thresholds, and model integrations

## Evidence-Driven Architecture (v2.0)

The system is now **evidence-driven and real-time**. Key design principles:

1. **No Demo Data**: All seed data and random generators have been removed
2. **Real Evidence Only**: Metrics are computed only from actual evidence sources
3. **Explicit Baselines**: Baseline metrics stored in `metrics_snapshot` field, never fabricated
4. **Nullable Scores**: drift_score, bias_score, risk_score are nullable - only populated when real data exists
5. **Empty State Handling**: Dashboard shows appropriate status messages when no data available

### Audit Results
- `AUDIT_PASS`: All metrics within thresholds
- `AUDIT_WARN`: Some metrics exceed warning thresholds
- `AUDIT_FAIL`: Critical findings detected
- `BASELINE_CREATED`: First audit with real data, establishes baseline
- `NO_EVIDENCE`: No evidence sources configured or no data found

### Finding Severities
- `INFO`: System messages (e.g., "No evidence sources configured")
- `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`: Issue severity levels

## Project Architecture

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: wouter
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS with dark/light theme support
- **Charts**: Recharts (PieChart, BarChart with time range selection)

### Node.js Proxy (`server/`)
- **Framework**: Express.js
- **Function**: Proxies `/api` requests to Python backend on port 8000
- **Features**: Spawns Python backend as child process with auto-restart

### Python Backend (`backend/`)
- **Framework**: FastAPI with uvicorn
- **Database**: SQLite with SQLAlchemy ORM
- **Scheduler**: APScheduler for automated audits (hourly checks, daily/weekly/monthly execution)
- **Audit Engine**: Evidence-driven with passive (baseline comparison) and active (security rules) audits
- **API Endpoints**:
  - `GET/POST /api/models` - AI model management
  - `DELETE /api/models/:id` - Delete model
  - `GET /api/audits` - Audit history with filtering
  - `POST /api/audits/trigger/:model_id` - Manual audit trigger
  - `GET /api/findings` - Audit findings with severity filtering
  - `GET /api/dashboard/overview` - Dashboard metrics summary with empty state handling

### Database Models
- **AIModel**: AI model definitions with connection type and audit frequency
- **EvidenceSource**: Data sources for each model (with last_data_snapshot for caching)
- **AuditPolicy**: Audit thresholds and configuration
- **AuditRun**: Individual audit execution records
- **AuditSummary**: Aggregated results with metrics_snapshot for baseline storage
- **AuditFinding**: Specific issues found during audits

## Key Files

- `client/src/App.tsx` - Main app with routing and layout
- `client/src/components/app-sidebar.tsx` - Collapsible navigation sidebar
- `client/src/components/theme-provider.tsx` - Dark/light theme support
- `client/src/pages/dashboard.tsx` - Main metrics dashboard
- `client/src/pages/model-manager.tsx` - Custom and system model management
- `client/src/pages/audits.tsx` - Model and log auditing interface
- `client/src/pages/settings.tsx` - Notifications, thresholds, integrations
- `client/src/pages/analytics/*.tsx` - Drift, Bias, Hallucination, PII, Compliance pages
- `server/routes.ts` - API endpoints
- `server/storage.ts` - In-memory storage implementation
- `backend/main.py` - FastAPI application entry point
- `backend/models.py` - SQLAlchemy ORM models
- `backend/routes.py` - Python API endpoints
- `backend/audit_engine.py` - Evidence-driven passive and active audit logic
- `backend/scheduler.py` - APScheduler configuration

## Design System

- **Typography**: Inter font family
- **Theme**: Material Design with Linear influences
- **Colors**: Professional color scheme with semantic tokens
- **Components**: Shadcn/ui components with custom elevation utilities

## User Preferences

- Dark mode support via theme toggle in header
- Collapsible sidebar with nested Dashboard navigation
- Time range toggles (1M, 6M, 1Y) on trend charts

## Running the Project

The application runs on port 5000 using `npm run dev` which starts both the Express backend and Vite frontend.

### Environment Variables
- `ENABLE_SCHEDULER`: Set to `true` to enable automated audit scheduling. Disabled by default in development.

## Dashboard API Contract

Dashboard endpoints return explicit status states with nullable metrics:

```json
// When no audits exist or all audits are NO_EVIDENCE:
{
  "status": "NO_DATA",
  "message": "No audits have been executed yet",
  "metrics": null
}

// When only baselines exist without comparison audits:
{
  "status": "BASELINE_NOT_ESTABLISHED", 
  "message": "Baseline has been created but no comparison audits exist yet",
  "metrics": null
}

// When real comparison audits exist (PASS/WARN/FAIL):
{
  "status": "OK",
  "message": "Real-time metrics computed from audit data",
  "metrics": { /* actual metrics */ }
}
```

## Recent Changes (December 2025)

- Removed all seed data and demo model generation
- Rewrote audit engine to be evidence-driven
- Added NO_EVIDENCE audit result type
- Made all metric scores nullable
- **Implemented strict NO_DATA dashboard states**
- Dashboard returns `status` + `message` + nullable `metrics`
- Metrics computed ONLY from database - no fallback values
- Added `ENABLE_SCHEDULER` environment variable (default: false)
- Scheduler no longer runs audits on startup
