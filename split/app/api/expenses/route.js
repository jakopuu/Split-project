import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Equal split in cents; the leftover cents go to the first participants
function equalSplit(amountCents, userIds) {
  const base = Math.floor(amountCents / userIds.length);
  const remainder = amountCents % userIds.length;
  return userIds.map((userId, i) => ({
    userId,
    shareCents: base + (i < remainder ? 1 : 0),
  }));
}

export async function GET(req) {
  const groupId = new URL(req.url).searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("expenses")
    .select("*, expense_splits(user_id, share_cents)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { groupId, paidBy, description, amountCents, participantIds, splits } =
    await req.json();

  if (!groupId || !paidBy || !description?.trim()) {
    return NextResponse.json(
      { error: "groupId, paidBy and description are required" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "amountCents must be a positive integer" },
      { status: 400 }
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }
  const memberIds = members.map((m) => m.user_id);
  if (!memberIds.includes(paidBy)) {
    return NextResponse.json({ error: "payer is not in the group" }, { status: 400 });
  }

  // Custom splits if given, otherwise equal split among participants (default: everyone)
  const finalSplits =
    splits ?? equalSplit(amountCents, participantIds?.length ? participantIds : memberIds);

  if (finalSplits.length === 0) {
    return NextResponse.json({ error: "no participants" }, { status: 400 });
  }
  if (!finalSplits.every((s) => memberIds.includes(s.userId) && Number.isInteger(s.shareCents) && s.shareCents >= 0)) {
    return NextResponse.json({ error: "invalid splits" }, { status: 400 });
  }
  const total = finalSplits.reduce((sum, s) => sum + s.shareCents, 0);
  if (total !== amountCents) {
    return NextResponse.json(
      { error: `splits add up to ${total}, expected ${amountCents}` },
      { status: 400 }
    );
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      paid_by: paidBy,
      description: description.trim(),
      amount_cents: amountCents,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: splitError } = await supabase.from("expense_splits").insert(
    finalSplits.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      share_cents: s.shareCents,
    }))
  );
  if (splitError) {
    // supabase-js has no transactions, so undo the expense manually
    await supabase.from("expenses").delete().eq("id", expense.id);
    return NextResponse.json({ error: splitError.message }, { status: 400 });
  }

  return NextResponse.json(expense, { status: 201 });
}