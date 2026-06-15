-- Metadata table tracking dynamically created spare-parts sheet tables
CREATE TABLE IF NOT EXISTS public.uploaded_spare_parts_sheets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    display_name TEXT NOT NULL,
    table_name TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.uploaded_spare_parts_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploaded sheets"
ON public.uploaded_spare_parts_sheets
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create own uploaded sheets"
ON public.uploaded_spare_parts_sheets
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own uploaded sheets"
ON public.uploaded_spare_parts_sheets
FOR DELETE
USING (auth.uid() = created_by);

-- Tightly-scoped DDL helper for the create-and-insert-spare-parts edge function.
-- Only allows CREATE TABLE / DROP TABLE on public."<expected_table>", and only
-- when expected_table looks like a safe identifier and matches the table name
-- embedded in the statement. This prevents the function from being used to
-- run arbitrary SQL even if called with the service role key.
CREATE OR REPLACE FUNCTION public.execute_ddl(ddl_statement TEXT, expected_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF expected_table IS NULL OR expected_table !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'Invalid table name: %', expected_table;
  END IF;

  IF ddl_statement ~ '^CREATE TABLE public\."' || expected_table || '" \(' THEN
    EXECUTE ddl_statement;
  ELSIF ddl_statement = format('DROP TABLE IF EXISTS public.%I;', expected_table) THEN
    EXECUTE ddl_statement;
  ELSE
    RAISE EXCEPTION 'DDL statement not permitted';
  END IF;
END;
$$;

-- Only the service role (used by the edge function) may call this.
REVOKE ALL ON FUNCTION public.execute_ddl(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_ddl(TEXT, TEXT) TO service_role;
