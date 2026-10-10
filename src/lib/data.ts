import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Booking = {
  id: string;
  crib: string;
  tenant_name: string;
  tenant_contact: string | null;
  check_in: string;
  check_out: string;
  amount_due: number;
  notes: string | null;
};

export type Payment = {
  id: string;
  booking_id: string;
  amount: number;
  paid_on: string;
  notes: string | null;
};

export type Expense = {
  id: string;
  crib: string;
  category: string;
  amount: number;
  spent_on: string;
  is_recurring: boolean;
  frequency: string | null;
  notes: string | null;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("check_in", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => ({ ...b, amount_due: Number(b.amount_due) })) as Booking[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("paid_on", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) as Payment[];
    },
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("spent_on", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Expense[];
    },
  });
}

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useSaveBooking() {
  const invalidate = useInvalidate(["bookings"]);
  return useMutation({
    mutationFn: async (input: Record<string, unknown> & { id?: string | undefined }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("bookings").update(rest as never).eq("id", id);
        if (error) throw error;
        return id;
      }
      const user_id = await currentUserId();
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...(input as unknown as Booking), user_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBooking() {
  const invalidate = useInvalidate(["bookings", "payments"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: payErr } = await supabase.from("payments").delete().eq("booking_id", id);
      if (payErr) throw payErr;
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAddPayment() {
  const invalidate = useInvalidate(["payments"]);
  return useMutation({
    mutationFn: async (input: { booking_id: string; amount: number; paid_on: string; notes?: string | null | undefined }) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("payments").insert({
        booking_id: input.booking_id,
        amount: input.amount,
        paid_on: input.paid_on,
        notes: input.notes ?? null,
        user_id,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidate(["payments"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveExpense() {
  const invalidate = useInvalidate(["expenses"]);
  return useMutation({
    mutationFn: async (input: Record<string, unknown> & { id?: string | undefined }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("expenses").update(rest as never).eq("id", id);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await supabase.from("expenses").insert({ ...(input as unknown as Expense), user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidate(["expenses"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
