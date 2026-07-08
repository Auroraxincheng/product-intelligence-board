#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is required." >&2
  exit 1
fi

backup_file="${1:-}"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Usage: scripts/restore-db.sh backups/product-intelligence-board-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

case "$backup_file" in
  *.dump)
    if ! command -v pg_restore >/dev/null 2>&1; then
      echo "Error: pg_restore is not installed or not on PATH." >&2
      exit 1
    fi
    restore_command=(pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$backup_file")
    ;;
  *.sql)
    if ! command -v psql >/dev/null 2>&1; then
      echo "Error: psql is not installed or not on PATH." >&2
      exit 1
    fi
    restore_command=(psql "$DATABASE_URL" --file="$backup_file")
    ;;
  *)
    echo "Error: backup file must end with .dump or .sql." >&2
    exit 1
    ;;
esac

echo "WARNING: This restore may overwrite data in the target database."
echo "Test restores in a separate Supabase project before restoring production."
read -r -p "Type RESTORE to continue: " confirmation

if [[ "$confirmation" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

"${restore_command[@]}"
echo "Restore complete: $backup_file"
