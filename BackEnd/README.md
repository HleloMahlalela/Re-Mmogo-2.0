# RE-MMOGO Backend

Node/Express backend scaffold matching the frontend API in this workspace.

## Run

1. `cd re-mmogo-backend`
2. `npm install`
3. Copy `.env.example` to `.env` and update values (JWT + MySQL `remmogodb` connection).
4. `npm run dev`

Server starts on `http://localhost:5000` and exposes routes under `/api`.

## Database

Create database `remmogodb` (or your `DB_NAME`), then either:

- Import `schema.sql` for a fresh install, **or**
- Apply `migrations/001_motshelo_rules.sql` on an existing database (adds loan accrual columns and repayment tables).

If `ALTER TABLE Loans ADD COLUMN` fails because columns already exist, skip those lines.
