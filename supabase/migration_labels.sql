-- Issue labels stored as a text array on the issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';

-- Project-level label definitions
CREATE TABLE IF NOT EXISTS project_labels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

ALTER TABLE project_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_read_labels"   ON project_labels;
DROP POLICY IF EXISTS "project_members_manage_labels" ON project_labels;

CREATE POLICY "project_members_read_labels"
  ON project_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_labels.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_manage_labels"
  ON project_labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_labels.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'member')
    )
  );
