# DataStream Cloud

> Real-time streaming analytics dashboard with a client-side event and pipeline simulation.

![DataStream Cloud preview](public/images/hero-stream.png)

## Overview

Real-time streaming analytics dashboard with a client-side event and pipeline simulation. The repository contains a React + TypeScript application built with Vite. This README describes the code that is actually included, distinguishes demo behavior from live integrations, and documents local development and deployment.

## Highlights

- Shared client-side stream engine that keeps dashboard metrics and charts in sync.
- Pipeline and architecture views for exploring a streaming-data workflow.
- Dataset views, anomaly monitoring, and a console for interacting with simulated telemetry.
- CSV/JSON-oriented product concepts and responsive dashboard visualizations.

## Technology stack

- **UI:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4 and project-specific CSS
- **Motion and icons:** Framer Motion and Lucide React
- **Routing / visualization:** React Router where applicable, with custom charts and simulation components
- **Optional service components:** See the project-specific notes below; a static frontend deployment does not automatically run backend code.

## Application areas

| `/` | Product landing page |
| `/console` | Live simulated stream console |
| `/pipeline` | Pipeline builder/overview |
| `/datasets` | Dataset views |
| `/anomalies` | Anomaly monitoring |
| `/architecture` | Architecture overview |
| `/pricing` | Pricing page |

## Requirements

- Node.js 20.19+ or 22.12+ recommended for Vite 7
- npm (the lockfile is committed)
- Git, if you plan to publish the repository

## Run locally

```bash
# 1. Open the project root (the folder containing package.json)
npm ci

# 2. Start the Vite development server
npm run dev

# 3. Create a production build
npm run build

# 4. Optional: serve the production build locally
npm run preview
```

The development server prints its local URL in the terminal. Keep the terminal open while using the app.

## Quality checks

```bash
npm run lint
npm run build
```

`npm run build` runs the TypeScript project build before Vite creates the production assets. A successful local build is the final check to perform after installing dependencies.

## Deployment

### Render Static Site

- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Root directory:** leave blank when `package.json` is at the repository root.

This project uses hash-based client routing, so deep-link rewrites are not normally required.

## Architecture and operational boundaries

The current implementation is a **front-end simulation**. It does not connect to a production message broker, database, or real streaming ingress. Treat displayed metrics as simulated unless you integrate real services.

## Repository structure

```text
.
├── public/                 # Static assets served as-is by Vite
├── src/
│   ├── components/         # Reusable interface components
│   ├── pages/              # Route-level screens (where used)
│   ├── lib/                # Shared logic, state, or simulation helpers
│   ├── App.tsx             # Application composition and routes
│   └── main.tsx            # React entry point
├── index.html              # HTML shell and metadata
├── package.json            # Dependencies and npm scripts
├── package-lock.json       # Reproducible npm dependency tree
├── tsconfig*.json          # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

Some projects also contain `api/`, `server/`, `services/`, `ml/`, `shared/`, or test/artifact folders. These are described in the notes below and are not executed by a static host unless separately deployed.

## Security and data handling

- Never commit `.env`, API tokens, cloud credentials, database passwords, or private keys. Use `.env.example` for variable names and safe placeholders only.
- Any secret required by a backend belongs in the backend service's environment settings—not in a `VITE_*` variable or browser bundle.
- Use only data and accounts you are authorized to access.
- Demo records, simulated metrics, and forecast estimates must not be represented as verified production telemetry or guarantees.

## License

No license file is included. Add a license only after choosing the terms under which you want others to use this project.
