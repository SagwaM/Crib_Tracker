CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  floor text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own units" ON public.units FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_default_units()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.units WHERE user_id = auth.uid()) THEN RETURN; END IF;
  INSERT INTO public.units (user_id, key, name, floor, sort_order) VALUES
    (auth.uid(), 'crib-1', 'Crib 1', '6th floor', 1),
    (auth.uid(), 'crib-2', 'Crib 2', '8th floor', 2),
    (auth.uid(), 'crib-3', 'Crib 3', '4th floor', 3),
    (auth.uid(), 'crib-4', 'Crib 4', '4th floor', 4)
  ON CONFLICT DO NOTHING;
END; $$;
REVOKE EXECUTE ON FUNCTION public.ensure_default_units() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_units() TO authenticated;