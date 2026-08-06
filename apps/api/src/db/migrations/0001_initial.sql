CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS assets (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  ip_address text NOT NULL,
  zone text NOT NULL,
  status text NOT NULL,
  criticality integer NOT NULL,
  version text,
  last_seen_at timestamptz NOT NULL,
  baseline_behavior jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL,
  source_asset_id text REFERENCES assets(id),
  destination_asset_id text REFERENCES assets(id),
  source_ip text,
  destination_ip text,
  user_name text,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulated boolean NOT NULL DEFAULT true,
  scenario_id text
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  confidence real NOT NULL,
  risk_score integer NOT NULL,
  risk_explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_state text NOT NULL DEFAULT 'pending',
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident_events (
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, event_id)
);

CREATE TABLE IF NOT EXISTS detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL,
  asset_id text NOT NULL REFERENCES assets(id),
  confidence real NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  incident_id uuid REFERENCES incidents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vulnerabilities (
  id text PRIMARY KEY,
  source text NOT NULL,
  summary text NOT NULL,
  cvss_score real,
  kev_listed boolean NOT NULL DEFAULT false,
  vendor text,
  product text,
  version text,
  published_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS asset_vulnerabilities (
  asset_id text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  vulnerability_id text NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, vulnerability_id)
);

CREATE TABLE IF NOT EXISTS attack_scenarios (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id text NOT NULL REFERENCES attack_scenarios(id),
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS response_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  reason text NOT NULL,
  approval_state text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  model text NOT NULL,
  summary text NOT NULL,
  severity_assessment text NOT NULL,
  confidence real NOT NULL,
  likely_explanation text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  affected_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions_for_operator jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_zone_idx ON assets(zone);
CREATE INDEX IF NOT EXISTS assets_status_idx ON assets(status);
CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events(timestamp);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(event_type);
CREATE INDEX IF NOT EXISTS events_source_asset_idx ON events(source_asset_id);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents(severity);
CREATE INDEX IF NOT EXISTS detections_asset_idx ON detections(asset_id);
CREATE INDEX IF NOT EXISTS detections_severity_idx ON detections(severity);
CREATE INDEX IF NOT EXISTS vulnerabilities_kev_idx ON vulnerabilities(kev_listed);
CREATE INDEX IF NOT EXISTS vulnerabilities_source_idx ON vulnerabilities(source);
CREATE INDEX IF NOT EXISTS simulation_runs_scenario_idx ON simulation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS response_actions_incident_idx ON response_actions(incident_id);
CREATE INDEX IF NOT EXISTS audit_logs_incident_idx ON audit_logs(incident_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ai_analyses_incident_idx ON ai_analyses(incident_id);
