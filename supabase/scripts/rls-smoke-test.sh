#!/usr/bin/env bash
# Şemayı, seed'i ve RLS kurallarını geçici bir PostgreSQL veritabanında test eder.
# Gereken: psql, createdb, dropdb (yerel bir PostgreSQL sunucusu). Docker gerekmez.
#
#   supabase/scripts/rls-smoke-test.sh
#
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="stopscrolling_rls_test_$$"
# Tüm göçleri sırayla tek dosyada birleştir
migration="$(mktemp)"
cat "$here"/../migrations/*.sql > "$migration"

createdb "$db"
trap 'dropdb --if-exists "$db"; rm -f "$migration"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$db" \
  -v migration="$migration" -v seed="$here/../seed.sql" \
  -f "$here/rls-smoke-test.sql"
echo "RLS duman testi geçti."
