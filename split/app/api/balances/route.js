import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeBalances, suggestSettlements } from "@/lib/balances";

export async function GET(req) {
  const groupId = new URL(req.url).searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const [members, expenses, settlements] = await Promise.all([
    supabase.from("group_members").select("user_id, users(name)").eq("group_id", groupId),
    supabase.from("expenses").select("paid_by, amount_cents, expense_splits(user_id, share_cents)").eq("group_id", groupId),
    supabase.from("settlements").select("from_user, to_user, amount_cents").eq("group_id", groupId),
  ]);

  const failed = [members, expenses, settlements].find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  const memberIds = members.data.map((m) => m.user_id);
  const balances = computeBalances(memberIds, expenses.data, settlements.data);
  const names = Object.fromEntries(members.data.map((m) => [m.user_id, m.users.name]));

  return NextResponse.json({
    balances: memberIds.map((id) => ({
      userId: id,
      name: names[id],
      balanceCents: balances[id],
    })),
    suggestedPayments: suggestSettlements(balances),
  });
}