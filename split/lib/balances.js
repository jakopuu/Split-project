// Positive balance = the group owes this person; negative = this person owes the group.
export function computeBalances(memberIds, expenses, settlements) {
  const balances = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const e of expenses) {
    balances[e.paid_by] += e.amount_cents;
    for (const s of e.expense_splits) balances[s.user_id] -= s.share_cents;
  }
  // A settlement from A to B: A paid off some debt, B received money
  for (const s of settlements) {
    balances[s.from_user] += s.amount_cents;
    balances[s.to_user] -= s.amount_cents;
  }
  return balances;
}

// Greedy matching: the biggest debtor pays the biggest creditor, repeat.
export function suggestSettlements(balances) {
  const creditors = [];
  const debtors = [];
  for (const [userId, cents] of Object.entries(balances)) {
    if (cents > 0) creditors.push({ userId, cents });
    if (cents < 0) debtors.push({ userId, cents: -cents });
  }

  const payments = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.cents - a.cents);
    debtors.sort((a, b) => b.cents - a.cents);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.cents, d.cents);

    payments.push({ from: d.userId, to: c.userId, amountCents: amount });
    c.cents -= amount;
    d.cents -= amount;
    if (c.cents === 0) creditors.shift();
    if (d.cents === 0) debtors.shift();
  }
  return payments;
}