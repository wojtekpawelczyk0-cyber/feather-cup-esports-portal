-- Create page_visits table for tracking daily visits
CREATE TABLE public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  page_path text NOT NULL DEFAULT '/',
  visitor_id text
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can insert visits" 
ON public.page_visits 
FOR INSERT 
WITH CHECK (true);

-- Only owners can view visits
CREATE POLICY "Owners can view visits" 
ON public.page_visits 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));