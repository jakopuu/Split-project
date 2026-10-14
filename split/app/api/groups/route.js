import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("groups")
    .select("*, group_members(user_id, users(id, name))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { name, memberIds = [] } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (memberIds.length > 0) {
    const { error: memberError } = await supabase
      .from("group_members")
      .insert(memberIds.map((user_id) => ({ group_id: group.id, user_id })));
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }
  }
  return NextResponse.json(group, { status: 201 });
}