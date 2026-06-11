-- Issue activity log: tracks status, priority, assignee, title changes
CREATE TABLE IF NOT EXISTS issue_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id    uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  from_value  text,
  to_value    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issue_activity_issue_id_idx ON issue_activity(issue_id);
CREATE INDEX IF NOT EXISTS issue_activity_created_at_idx ON issue_activity(created_at DESC);

ALTER TABLE issue_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_can_read_activity"   ON issue_activity;
DROP POLICY IF EXISTS "project_members_can_insert_activity" ON issue_activity;

CREATE POLICY "project_members_can_read_activity"
  ON issue_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN project_members pm ON pm.project_id = i.project_id
      WHERE i.id = issue_activity.issue_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_can_insert_activity"
  ON issue_activity FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM issues i
      JOIN project_members pm ON pm.project_id = i.project_id
      WHERE i.id = issue_activity.issue_id
        AND pm.user_id = auth.uid()
    )
  );
