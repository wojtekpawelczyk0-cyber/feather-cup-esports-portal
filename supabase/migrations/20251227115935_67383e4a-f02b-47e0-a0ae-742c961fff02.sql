-- Add paid_at column to teams table to track payment date
ALTER TABLE public.teams 
ADD COLUMN paid_at timestamp with time zone;