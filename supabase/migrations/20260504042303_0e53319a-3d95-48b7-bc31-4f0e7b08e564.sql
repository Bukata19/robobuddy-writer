DROP POLICY "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);