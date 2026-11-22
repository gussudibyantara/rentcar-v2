#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v app_password="$TRAVELOS_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE travelos_app WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='travelos_app')
\gexec
GRANT CONNECT ON DATABASE travelos TO travelos_app;
SQL
