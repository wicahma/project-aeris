# Functional Specification: Data Utilities (F7)

## DU-001: Automated Backups & Snapshots
- **Description**: Scheduled and on-demand database snapshots with compression.
- **Requirements**:
    - DU-001.1: System shall allow scheduling backups (hourly, daily, weekly) via CRON expression.
    - DU-001.2: System shall provide "Snap Now" trigger for immediate compressed `.tar.gz` archive creation.
    - DU-001.3: Backups shall be stored in a configurable local directory or S3-compatible bucket.
    - DU-001.4: System shall maintain a retention policy (delete backups older than N days).
    - DU-001.5: System shall log success/failure of every backup attempt in `backup_history`.

## DU-002: Mock Data Generator (Seeding)
- **Description**: One-click population of tables with realistic dummy data for testing/development.
- **Requirements**:
    - DU-002.1: System shall detect column types and suggest appropriate generators (Name, Email, UUID, Lorem Ipsum, Date).
    - DU-002.2: Users shall specify the number of rows to generate per table (1 to 10,000).
    - DU-002.3: Generator shall respect foreign key constraints by sampling existing data from parent tables.
    - DU-002.4: System shall provide a dry-run mode to preview generated data before insertion.
    - DU-002.5: System shall support "Clear & Seed" to truncate table before population.

## DU-003: Built-in Full-Text Search (FTS)
- **Description**: Fast text search across database columns without external dependencies (Elasticsearch/Lucene).
- **Requirements**:
    - DU-003.1: System shall allow enabling FTS on specific `TEXT` columns via Web UI.
    - DU-003.2: System shall maintain a hidden `fts5` virtual table (SQLite-backed) for indexed columns.
    - DU-003.3: System shall provide a global search bar in the Data Explorer for FTS-enabled tables.
    - DU-003.4: Search results shall include snippet highlighting and ranking by relevance.
    - DU-003.5: System shall automatically sync the FTS index when data is inserted/updated/deleted in the source table.
