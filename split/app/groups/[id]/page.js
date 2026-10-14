"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const euro = (cents) => `${(cents / 100).toFixed(2)} €`;

export default function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ balances: [], suggestedPayments: [] });
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [participants, setParticipants] = useState([]);

  const members = group?.group_members.map((m) => m.users) ?? [];
  const nameOf = (userId) => members.find((m) => m.id === userId)?.name ?? "?";

  async function load() {
    const [groups, exp, bal] = await Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch(`/api/expenses?groupId=${id}`).then((r) => r.json()),
      fetch(`/api/balances?groupId=${id}`).then((r) => r.json()),
    ]);
    const g = groups.find((x) => x.id === id);
    setGroup(g ?? null);
    setExpenses(Array.isArray(exp) ? exp : []);
    if (bal.balances) setBalances(bal);
    if (g && !paidBy) {
      setPaidBy(g.group_members[0]?.users.id ?? "");
      setParticipants(g.group_members.map((m) => m.users.id));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function post(url, body) {
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong");
      return false;
    }
    await load();
    return true;
  }

  async function addExpense(e) {
    e.preventDefault();
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
    const ok = await post("/api/expenses", {
      groupId: id,
      paidBy,
      description,
      amountCents,
      participantIds: participants,
    });
    if (ok) {
      setDescription("");
      setAmount("");
    }
  }

  function toggle(userId) {
    setParticipants((p) => (p.includes(userId) ? p.filter((x) => x !== userId) : [...p, userId]));
  }

  if (!group) return <main style={{ margin: "2rem" }}>Loading...</main>;

  return (
    <main style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <Link href="/">← Back</Link>
      <h1>{group.name}</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section>
        <h2>Balances</h2>
        <ul>
          {balances.balances.map((b) => (
            <li key={b.userId}>
              {b.name}: {b.balanceCents > 0 ? "is owed " : b.balanceCents < 0 ? "owes " : "settled "}
              {b.balanceCents !== 0 && euro(Math.abs(b.balanceCents))}
            </li>
          ))}
        </ul>

        <h3>Suggested payments</h3>
        {balances.suggestedPayments.length === 0 && <p>All settled up.</p>}
        <ul>
          {balances.suggestedPayments.map((p, i) => (
            <li key={i}>
              {nameOf(p.from)} → {nameOf(p.to)}: {euro(p.amountCents)}{" "}
              <button
                onClick={() =>
                  post("/api/settlements", {
                    groupId: id,
                    fromUser: p.from,
                    toUser: p.to,
                    amountCents: p.amountCents,
                  })
                }
              >
                Settle
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Add expense</h2>
        <form onSubmit={addExpense}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (€)" />
          <label>
            Paid by{" "}
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            Split between:
            {members.map((m) => (
              <label key={m.id} style={{ display: "block" }}>
                <input type="checkbox" checked={participants.includes(m.id)} onChange={() => toggle(m.id)} /> {m.name}
              </label>
            ))}
          </div>
          <button type="submit">Add expense</button>
        </form>
      </section>

      <section>
        <h2>Expenses</h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description}: {euro(e.amount_cents)} (paid by {nameOf(e.paid_by)})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}