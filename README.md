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

Visit: `http://localhost:3000/en/admin/import?key=your-secret-key`

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
- variant (string, required: V1 or V2)
- productionDate (string, required, ISO date)
- notes (string, optional)

**components**
- brandSlug (string, required)
- colorCode (string, required)
- colorVariant (string, required: V1 or V2)
- tonerCode (string, required)
- tonerName (string, required)
- parts (number, required)

### Production date field

- `productionDate` is required for every color and stored as a database `DateTime`.
- For existing rows during migration, `variant` defaults to `V1` and `productionDate` defaults to `2024-01-01`.

Accepted import formats for `productionDate`:
- `YYYY-MM-DD` (preferred)
- ISO 8601 date-time strings

Additional rules:
- `productionDate` must be a valid date.
- `productionDate` cannot be in the future.

### Localization (i18n)

- Supported locales: `en`, `vi`.
- Dates are localized only in the UI using the active locale.
- API responses remain language-neutral and return ISO strings for dates.

## Generating the Excel test file

Binary files are not committed to the repository. Generate the Excel file locally from the CSV fixtures:

```bash
node scripts/generate-excel-from-csv.ts
```

This produces `paintmix-test.xlsx` with sheets named `brands`, `colors`, and `components` that match the CSV data exactly.

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
