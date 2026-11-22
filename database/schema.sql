-- TravelOS PostgreSQL schema v2. Run with scripts/db-migrate.cjs or psql.
-- Business services keep their existing snapshots, stored transactionally in PostgreSQL JSONB.
CREATE TABLE IF NOT EXISTS travelos_schema_migrations (
 version integer PRIMARY KEY,
 applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS travelos_workspaces (
 id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,80}$'),
 data jsonb NOT NULL CHECK (coalesce(jsonb_typeof(data)='object' AND data->>'version'='1' AND jsonb_typeof(data->'bookings')='array', false)),
 revision bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS travelos_imports (
 workspace_id text PRIMARY KEY REFERENCES travelos_workspaces(id),
 fingerprint text NOT NULL CHECK (length(fingerprint)=64),
 imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS travelos_auth_users (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES travelos_workspaces(id),
 email text NOT NULL UNIQUE CHECK (email=lower(email)),
 name text NOT NULL,
 password_hash text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS travelos_auth_sessions (
 token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
 user_id uuid NOT NULL REFERENCES travelos_auth_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS travelos_session_user ON travelos_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS travelos_session_expiry ON travelos_auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS travelos_login_limits (
 bucket text NOT NULL,
 window_start timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 1,
 PRIMARY KEY(bucket,window_start)
);
CREATE INDEX IF NOT EXISTS travelos_limit_window ON travelos_login_limits(window_start);
-- Read-only SQL views for inspection/export without unpacking the whole workspace manually.
CREATE OR REPLACE VIEW travelos_bookings WITH (security_invoker = true) AS
 SELECT w.id AS workspace_id, b->>'id' AS id, b->>'unitId' AS unit_id,
 b->>'customerId' AS customer_id, b->>'status' AS status,
 b->>'start' AS starts_at, b->>'end' AS ends_at,
 (b->>'total')::numeric AS total, (b->>'paid')::numeric AS paid, b AS data
 FROM travelos_workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.data->'bookings') b;
CREATE OR REPLACE VIEW travelos_vehicles WITH (security_invoker = true) AS
 SELECT w.id AS workspace_id, u->>'id' AS id, u->>'name' AS name, u->>'plate' AS plate, u AS data
 FROM travelos_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'units','[]'::jsonb)) u;
CREATE OR REPLACE VIEW travelos_customers WITH (security_invoker = true) AS
 SELECT w.id AS workspace_id, c->>'id' AS id, c->>'name' AS name, c AS data
 FROM travelos_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'customers','[]'::jsonb)) c;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='travelos_app') THEN
  GRANT USAGE ON SCHEMA public TO travelos_app;
  GRANT SELECT,INSERT,UPDATE,DELETE ON travelos_workspaces,travelos_imports,travelos_auth_users,travelos_auth_sessions,travelos_login_limits TO travelos_app;
  GRANT SELECT ON travelos_bookings,travelos_vehicles,travelos_customers,travelos_schema_migrations TO travelos_app;
 END IF;
END $$;
INSERT INTO travelos_schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;

-- Tenant isolation for the non-owner runtime role. Migration/admin connections
-- remain privileged; HTTP requests never choose a tenant from client input.
ALTER TABLE travelos_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelos_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS travelos_workspace_isolation ON travelos_workspaces;
CREATE POLICY travelos_workspace_isolation ON travelos_workspaces
 USING(id=current_setting('travelos.workspace_id',true))
 WITH CHECK(id=current_setting('travelos.workspace_id',true));
DROP POLICY IF EXISTS travelos_import_isolation ON travelos_imports;
CREATE POLICY travelos_import_isolation ON travelos_imports
 USING(workspace_id=current_setting('travelos.workspace_id',true))
 WITH CHECK(workspace_id=current_setting('travelos.workspace_id',true));
INSERT INTO travelos_schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
