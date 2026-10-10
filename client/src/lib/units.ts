import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRIBS } from "@/lib/domain";

export type Unit = { uuid: string; id: string; name: string; floor: string; label: string; sort_order: number };

let unitsCache: Unit[] = [];
export const unitCount = () => CRIBS.length;

function sync(units: Unit[]) {
  unitsCache = units;
  CRIBS.splice(0, CRIBS.length, ...units.map((u) => ({ id: u.id, name: u.name, floor: u.floor, label: u.label })));
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async (): Promise<Unit[]> => {
      const load = () => supabase.from("units").select("*").order("sort_order").order("created_at");
      let { data, error } = await load();
      if (error) throw error;
      if (!data?.length) {
        await supabase.rpc("ensure_default_units");
        ({ data, error } = await load());
        if (error) throw error;
      }
      const units = (data ?? []).map((u) => ({
        uuid: u.id,
        id: u.key,
        name: u.name,
        floor: u.floor ?? "",
        label: u.floor ? `${u.name} — ${u.floor}` : u.name,
        sort_order: u.sort_order,
      }));
      sync(units);
      return units;
    },
    staleTime: 60_000,
  });
}

/** Units in the shape the rest of the app uses ({ id, name, floor, label }). */
export function useCribs() {
  const { data } = useUnits();
  if (data && data !== unitsCache) sync(data);
  return CRIBS;
}

export function useSaveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uuid?: string; name: string; floor: string; sort_order: number }) => {
      if (input.uuid) {
        const { error } = await supabase
          .from("units")
          .update({ name: input.name, floor: input.floor || null, sort_order: input.sort_order })
          .eq("id", input.uuid);
        if (error) throw error;
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const key = `unit-${Date.now().toString(36)}`;
      const { error } = await supabase.from("units").insert({
        user_id: u.user.id,
        key,
        name: input.name,
        floor: input.floor || null,
        sort_order: input.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      const { error } = await supabase.from("units").delete().eq("id", uuid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}
