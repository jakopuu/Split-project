# Split

A shared-expense tracker for roommates and trips. Create groups, record who paid for what, and see who owes whom, with a minimal set of suggested payments to settle up.

Built with Next.js (App Router, JavaScript) and Supabase (PostgreSQL).

## Features

- Create people and groups
- Add expenses, split equally between selected members
- Balances per member, computed from expenses and settlements
- Suggested payments that minimize the number of transfers
- Record settlements with one click

## Setup

1. Clone the repo and install dependencies:
```bash
   npm install
```
2. Create a Supabase project and run `schema.sql` in the SQL Editor.
3. Create `.env.local` in the project root:
```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your secret key>
```
   The secret key is only used in server-side route handlers. Never commit it.
4. Start the dev server:
```bash
   npm run dev
```
   The app runs at http://localhost:3000.

## Database

Tables: `users`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`. The full schema is in `schema.sql`. Row Level Security is enabled on all tables with no policies, so all access goes through the API routes using the service role key.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET, POST | `/api/users` | List users, create a user |
| GET, POST | `/api/groups` | List groups with members, create a group |
| GET, POST | `/api/expenses?groupId=` | List a group's expenses, add an expense |
| GET, POST | `/api/settlements?groupId=` | List a group's settlements, record a payment |
| GET | `/api/balances?groupId=` | Balances per member and suggested payments |

## Design decisions

- **Money is stored as integer cents** to avoid floating-point rounding errors.
- **Balances are computed, not stored**, so they can never get out of sync with the expenses and settlements.
- **Equal splits distribute leftover cents**: 10.00 € between 3 people becomes 3.34 / 3.33 / 3.33, so the shares always add up exactly.
- **Split validation happens in the API**: shares must sum to the expense amount, and the payer and participants must belong to the group.
- **Settle-up uses greedy matching**: the biggest debtor pays the biggest creditor, repeated until everyone is at zero (`lib/balances.js`).

## Possible future work

- Authentication with Supabase Auth
- Custom and percentage-based splits in the UI
- Deleting expenses, adding members to existing groups
- Settlement history view