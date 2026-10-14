import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req) {
  const groupId = new URL(req.url).searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { groupId, fromUser, toUser, amountCents } = await req.json();

  if (!groupId || !fromUser || !toUser || fromUser === toUser) {
    return NextResponse.json(
      { error: "groupId, fromUser and a different toUser are required" },
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
  const ids = members.map((m) => m.user_id);
  if (!ids.includes(fromUser) || !ids.includes(toUser)) {
    return NextResponse.json({ error: "both users must be in the group" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("settlements")
    .insert({ group_id: groupId, from_user: fromUser, to_user: toUser, amount_cents: amountCents })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}