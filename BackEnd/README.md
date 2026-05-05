# RE-MMOGO Backend

Node/Express backend scaffold matching the frontend API in this workspace.

## Run

1. `cd BackEnd`
2. `npm install`
3. Copy `.env.example` to `.env` and update values (JWT + MySQL `remmogodb` connection).
4. `npm run dev`

Server starts on `http://localhost:5000` and exposes routes under `/api`.

## Deployment env

For Render deployment, set at least:

- `JWT_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `CORS_ORIGIN=https://re-mmogo-2-0.vercel.app`

You can use `CORS_ORIGINS` for multiple frontend origins (comma separated).

## Database

Create database `remmogodb` (or your `DB_NAME`), then either:

- Import `schema.sql` for a fresh install, **or**
- Apply `migrations/001_motshelo_rules.sql` on an existing database (adds loan accrual columns and repayment tables).

If `ALTER TABLE Loans ADD COLUMN` fails because columns already exist, skip those lines.
