#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is required." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is not installed or not on PATH." >&2
  exit 1
fi

mkdir -p backups

timestamp="$(date +%Y%m%d-%H%M%S)"
format="${1:-custom}"

case "$format" in
  custom)
    output="backups/product-intelligence-board-${timestamp}.dump"
    pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$output"
    ;;
  sql)
    output="backups/product-intelligence-board-${timestamp}.sql"
    pg_dump "$DATABASE_URL" --no-owner --no-acl --file="$output"
    ;;
  *)
    echo "Usage: scripts/backup-db.sh [custom|sql]" >&2
    exit 1
    ;;
esac

echo "Backup complete: $output"
