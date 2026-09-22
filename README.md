# Aeris

A lightweight, single-binary database management system. One executable gives you an embedded SQLite engine, a web-based SQL IDE, and auto-generated REST/GraphQL APIs for every table.

## Features

- Single static binary — no external runtime or dependencies
- Embedded web UI (SQL editor, visual schema builder, data grid, performance dashboard)
- Auto-generated REST and GraphQL endpoints per table
- Event webhooks on INSERT / UPDATE / DELETE
- Multi-database: attach and detach `.db` files at runtime, optional in-memory mode
- Session-based authentication

## Quick start

```sh
curl -fsSL https://get.diama.dev/aeris.sh | sh
aeris serve --port 8080
```

Then open http://localhost:8080.

## Building from source

Requirements: Go 1.22+, Node 20+.

```sh
# build frontend, then the binary (assets are embedded via go:embed)
make build
./aeris serve
```

## License

MIT
