# Paint Mix Finder

A production-ready Paint Mix Finder built with Next.js App Router, TypeScript, Prisma (SQLite), Tailwind, Zod, and TanStack Query.

## Setup

```bash
npm install
```

Create a local SQLite database and Prisma client:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

Run the app:

```bash
npm run dev
```

## Environment variables

Create a `.env` file:

```bash
DATABASE_URL="file:./dev.db"
ADMIN_IMPORT_KEY="your-secret-key"
```

## Admin import instructions

Visit: `http://localhost:3000/admin/import?key=your-secret-key`

Supported formats:

### Excel
- Upload one `.xlsx` file.
- Sheets must be named exactly: `brands`, `colors`, `components`.

### CSV
Upload **exactly three** files:
- `brands.csv`
- `colors.csv`
- `components.csv`

### Required columns

**brands**
- slug (string, required)
- name (string, required)

**colors**
- brandSlug (string, required)
- code (string, required)
- name (string, required)
- variant (string, optional)
- notes (string, optional)

**components**
- brandSlug (string, required)
- colorCode (string, required)
- colorVariant (string, optional)
- tonerCode (string, required)
- tonerName (string, required)
- parts (number, required)

## Responsive QA checklist

Test the user page at:
- 390x844 (iPhone)
- 360x800 (Android)
- 768x1024 (iPad)

Check:
- Brand selector, search input, and results list are scrollable.
- Bottom sheet opens on mobile and is draggable.
- Formula cards show toner code, name, parts, percent, grams.
- No horizontal scrolling on mobile.
- Table header sticks on desktop/tablet.
