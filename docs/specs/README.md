# Project Aeris — Master Functional Specification Index

This document indexes the Functional Specification Documents (FSD) and Entity Relationship Diagrams (ERD) for every feature group in Project Aeris.

## Feature Groups (26 sub-features across 8 groups)

| Group | Feature | FSD | ERD | Reqs | Entities |
|-------|---------|-----|-----|------|----------|
| F1 | Query Engine | [fsd.md](f1-query-engine/fsd.md) | [erd.md](f1-query-engine/erd.md) | 15 | 6 |
| F2 | Schema & Data Management | [fsd.md](f2-schema-data/fsd.md) | [erd.md](f2-schema-data/erd.md) | 10 | 7 |
| F3 | Core Storage | [fsd.md](f3-core-storage/fsd.md) | [erd.md](f3-core-storage/erd.md) | 16 | 6 |
| F4 | Security & Auth | [fsd.md](f4-security-auth/fsd.md) | [erd.md](f4-security-auth/erd.md) | 29 | 8 |
| F5 | REST API & Integration | [fsd.md](f5-api-integration/fsd.md) | [erd.md](f5-api-integration/erd.md) | 18 | 4 |
| F6 | Observability | [fsd.md](f6-observability/fsd.md) | [erd.md](f6-observability/erd.md) | 15 | 3 |
| F7 | Data Utilities | [fsd.md](f7-data-utilities/fsd.md) | [erd.md](f7-data-utilities/erd.md) | 15 | 5 |
| F8 | UI/UX | [fsd.md](f8-ui-ux/fsd.md) | [erd.md](f8-ui-ux/erd.md) | 9 | 2 |

**Totals:** 127 functional requirements, 41 distinct entities.

## Master ERD

The consolidated system-wide ERD with all cross-feature relationships is available at [ERD.md](ERD.md).

## Specification Standards

- **Requirement Codes:** Each group uses a 2-letter prefix (QE, SD, CS, SEC, API, OBS, DU, UI) + 3-digit sequence.
- **Entity Types:** SQLite/bbolt compatible; UUIDv4 PKs; unix_ms timestamps; SHA-256/Argon2id for secrets.
- **No Dummy Data:** All schemas define production-ready columns, constraints, and indexes.
