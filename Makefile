.PHONY: build test clean

build:
	cd web && npm run build
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o aeris ./cmd/aeris

test:
	go test ./...
	cd web && npx vitest run

clean:
	rm -f aeris
	rm -rf web/dist
