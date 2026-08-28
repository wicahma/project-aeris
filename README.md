# 🚀 Project Aeris — Lightweight Single-Binary DBMS

> **Zero-Dependency Drop-in Database Engine with an Embedded Web IDE and Auto-Generated APIs. Powered by Go & React Vite.**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.22+-blue.svg)](https://golang.org/)
[![React Version](https://img.shields.io/badge/React-18.3+-indigo.svg)](https://react.dev/)
[![Build Status](https://img.shields.io/badge/CI-Woodpecker-green.svg)](https://ci.diama.dev)

Project Aeris is a high-throughput, ultra-lightweight Database Management System (DBMS) packaged as a **single, zero-dependency executable** (< 18.5MB). It combines a pure Go SQL engine with an embedded CodeMirror 6 Web Console, auto-generated REST/GraphQL APIs, and real-time performance diagnostics.

---

## ✨ Key Features

* **⚡ Single-Binary Packaging:** Web UI assets (`frontend/dist`) are embedded directly into the compiled Go binary using `//go:embed`. Zero CGO or external runtime required.
* **🔌 Pure Go SQLite Engine:** Multi-tenant database storage powered by `modernc.org/sqlite` with `PRAGMA journal_mode=WAL` for concurrent read/write operations and ephemeral In-Memory mode.
* **💻 Embedded Web IDE:** CodeMirror 6 query console with real-time SQL syntax highlighting, schema autocomplete, multi-query execution, and execution timer.
* **🏗️ Visual Schema Builder:** Interactive GUI for creating tables, columns, constraints, foreign keys, and DDL query preview.
* **🗃️ CRUD Data Explorer:** Spreadsheet-like data grid with inline cell editing, sorting, filtering, and batch updates.
* **🚀 Auto-Generated REST/GraphQL APIs:** Instant CRUD REST and GraphQL endpoints for every user table, turning Aeris into a Backend-as-a-Service (BaaS).
* **🪝 Event Webhooks:** Asynchronous HTTP POST triggers on `ON_INSERT`, `ON_UPDATE`, and `ON_DELETE` table events.
* **📊 Real-time Performance Dashboard:** Live WebSockets/SSE streaming of CPU, RAM, QPS, and active connection metrics.
* **⏱️ Slow Query Profiler:** Execution plan visualizer (`EXPLAIN QUERY PLAN`) to detect query bottlenecks.
* **⌨️ Command Palette (`Cmd+K`):** Global fuzzy search and keyboard navigation across schemas, tables, and system actions.

---

## 🚀 Quick Start & Installation

### **1. Shortened Shell Installer (Linux / macOS)**
```bash
curl -fsSL https://get.diama.dev/dbms.sh | sh
```

### **2. Homebrew Tap (macOS & Linux)**
```bash
brew install wicahma/tap/dbms
```

### **3. Debian / Ubuntu APT Repository**
```bash
curl -fsSL https://apt.diama.dev/gpg.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/dbms.gpg
echo "deb [signed-by=/etc/apt/trusted.gpg.d/dbms.gpg] https://apt.diama.dev/ stable main" | sudo tee /etc/apt/sources.list.d/dbms.list
sudo apt update && sudo apt install dbms
```

### **4. Windows Winget**
```powershell
winget install wicahma.dbms
```

---

## ⌨️ CLI Subcommands (`aeris <command>`)

| Subcommand | Flags | Description |
| :--- | :--- | :--- |
| `aeris serve` | `--port 8080`, `--data-dir ./data` | Launches server daemon & web console |
| `aeris init [db]` | `--in-memory`, `--wal-mode` | Initializes a new `.db` database file |
| `aeris config` | `set`, `get`, `show`, `reset` | Manages global `config.yaml` settings |
| `aeris user` | `add`, `list`, `reset-password` | Emergency admin & RBAC user recovery |
| `aeris backup` | `create`, `restore`, `list` | Database snapshot & restoration |
| `aeris service` | `install`, `start`, `status` | Registers native OS systemd daemon |

---

## 📁 Repository Structure (Clean Architecture)

```
project-aeris/
├── .woodpecker.yml                    # Woodpecker CI Pipeline
├── landing-page/                      # Astro + React + Tailwind Landing Page & Docs
└── applications/
    ├── backend/                       # Golang Engine
    │   ├── cmd/server/main.go         # Entrypoint & //go:embed mounting
    │   ├── internal/
    │   │   ├── delivery/http/         # REST Handlers & Middleware
    │   │   ├── domain/                # Core Interfaces & Entities
    │   │   ├── engine/                # SQLite Engine & Parser
    │   │   ├── repository/            # Multi-tenant Storage
    │   │   └── usecase/               # Business Logic Services
    │   └── go.mod
    └── frontend/                      # React + TypeScript + Vite UI
        ├── src/
        │   ├── features/              # Modular UI Features
        │   └── shared/                # Store & UI Components
        ├── package.json
        └── vite.config.ts
```

---

## 🛠️ Building from Source

```bash
# 1. Build Frontend Static Bundle
cd applications/frontend
npm install
npm run build

# 2. Compile Single Executable Binary
cd ../backend
go mod tidy
go build -o aeris ./cmd/server

# 3. Launch Server
./aeris serve --port 8080
```

---

## 🌐 Active Live Endpoints

* **Landing Page & Docs:** [https://aeris.diama.dev/](https://aeris.diama.dev/)
* **Main Web Application:** [https://aeris-app.diama.dev/](https://aeris-app.diama.dev/)
* **Notion Command Center:** [🚀 Aeris Command Center](https://app.notion.com/p/3c9955456c7a8136b8a7dcb0bdcec9de)

---

## 📜 License

Distributed under the [MIT License](LICENSE). Copyright © 2026 diama.dev.
