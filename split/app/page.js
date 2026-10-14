"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userName, setUserName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [u, g] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/groups").then((r) => r.json()),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setGroups(Array.isArray(g) ? g : []);
  }

  useEffect(() => {
    load();
  }, []);

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

  async function addUser(e) {
    e.preventDefault();
    if (await post("/api/users", { name: userName })) setUserName("");
  }

  async function addGroup(e) {
    e.preventDefault();
    if (await post("/api/groups", { name: groupName, memberIds: selected })) {
      setGroupName("");
      setSelected([]);
    }
  }

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <main style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Split</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section>
        <h2>People</h2>
        <form onSubmit={addUser}>
          <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Name" />
          <button type="submit">Add</button>
        </form>
        <ul>
          {users.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>New group</h2>
        <form onSubmit={addGroup}>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
          <div>
            {users.map((u) => (
              <label key={u.id} style={{ display: "block" }}>
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} /> {u.name}
              </label>
            ))}
          </div>
          <button type="submit">Create group</button>
        </form>
      </section>

      <section>
        <h2>Groups</h2>
        <ul>
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`}>{g.name}</Link> ({g.group_members.length} members)
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}