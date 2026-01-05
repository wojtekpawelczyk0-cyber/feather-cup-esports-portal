
-- Create storage bucket for site assets
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true);

-- Allow anyone to view site assets (public bucket)
CREATE POLICY "Anyone can view site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow owners to upload site assets
CREATE POLICY "Owners can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND is_admin(auth.uid()));

-- Allow owners to update site assets
CREATE POLICY "Owners can update site assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND is_admin(auth.uid()));

-- Allow owners to delete site assets
CREATE POLICY "Owners can delete site assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND is_admin(auth.uid()));
