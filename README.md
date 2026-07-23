# GDT Organizational Chart

A React and Supabase application for creating organizational charts, managing
staff assignments, sharing charts, and maintaining reusable organizational
structure data.

## What the application includes

- Drag-and-drop organizational chart editor with automatic layout
- Multiple open chart tabs, search, image export, and version history
- Personal folders and chart sharing with view or edit access
- Public read-only or editable chart links
- Staff, position, and assignment records synchronized with chart nodes
- Immediate browser backup, debounced cloud saves, and a five-minute safety save
- Light and dark themes
- Organizational structure administration at `/admin/org-structure`

The admin route is intentionally easy for any authenticated user who knows the
URL to access. Its database policies also intentionally allow authenticated
users to maintain organizational units and offices.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. In the Supabase SQL Editor, run these migrations in order:

   1. `migration_core_schema.sql`
   2. `migration_org_structure.sql`

   Both migrations are transactional and designed to be safely rerun. Review
   their policies before applying them to an existing production project.

4. Start the development server:

   ```bash
   npm run dev
   ```

## Commands

```bash
npm run dev      # start the Vite development server
npm run build    # create a production build in dist/
npm run preview  # serve the production build locally
npm run lint     # run oxlint
npm test         # run the Node test suite
```

Before deployment, run `npm run lint`, `npm test`, and `npm run build`.

## Data and save behavior

The chart's `nodes` and `edges` JSON is the source of truth for what appears in
the editor. Relational HR tables provide durable staff, position, and assignment
records and fill missing legacy fields without overwriting newer chart edits.

Edits are:

1. copied to browser storage immediately;
2. saved to Supabase after a short debounce;
3. saved again every five minutes as a session safety check.

Cloud saves are serialized, so a slower older request cannot overwrite a newer
edit. When the app opens a chart, it offers recovery only when a newer local
backup differs from the server copy.

## Access model

- Owners can manage their charts, sharing, folders, and history.
- Accepted shares grant the selected view or edit permission.
- Pending invitations do not grant chart access.
- Public links work without signing in and obey the chart's public access level.
- Supabase row-level security is the enforcement layer; frontend checks provide
  the matching user experience.
- Account deletion is deliberately unavailable until a secure server-side
  deletion function is configured.

## Deployment

The included `vercel.json` sends application routes to `index.html`, allowing
React Router URLs such as `/chart/:id` to work when opened directly.

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment
environment, run the two database migrations, and deploy the output of
`npm run build`.
