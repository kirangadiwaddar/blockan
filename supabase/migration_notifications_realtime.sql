-- Enable realtime for notifications table
-- Required for the notification bell's postgres_changes subscription to fire
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
