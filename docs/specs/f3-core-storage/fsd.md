# Functional Specification: Core Storage (F3)

## CS-001: Modular Database (Plug & Play)
- **Description**: Support independent `.db` files managed via Web UI.
- **Requirements**:
  - CS-001.1: System shall attach/detach `.db` files at runtime without restart.
  - CS-001.2: Each database must reside in a separate file on disk.
  - CS-001.3: Web UI shall list all attached databases and their metadata.
  - CS-001.4: System shall validate file integrity before attaching.

## CS-002: In-Memory Mode
- **Description**: RAM-only storage for high-throughput, non-persistent data.
- **Requirements**:
  - CS-002.1: Users shall create databases with `storage_type="memory"`.
  - CS-002.2: Memory databases must never write to disk (no WAL/checkpointing).
  - CS-002.3: System shall enforce memory limits per-database to prevent OOM.
  - CS-002.4: Memory databases shall be wiped on process termination.

## CS-003: Connection Pooling & Concurrency
- **Description**: Efficient resource management for multiple concurrent clients.
- **Requirements**:
  - CS-003.1: System shall maintain a pool of reusable connections per database.
  - CS-003.2: System shall use reader-writer locks to allow concurrent reads.
  - CS-003.3: Pool shall be configurable (min/max connections, idle timeout).
  - CS-003.4: System shall provide real-time pool metrics (active, idle, wait time).

## CS-004: Plugin & Extension System
- **Description**: Interface-driven architecture for extensibility.
- **Requirements**:
  - CS-004.1: Support dynamic loading of export formatters (CSV, JSON, XML).
  - CS-004.2: Support custom query dialect translation via plugins.
  - CS-004.3: System shall provide a standard Go interface for plugin development.
  - CS-004.4: Web UI shall allow enabling/disabling plugins at runtime.
