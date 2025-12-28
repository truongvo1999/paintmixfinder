# Paint Mix Finder

A production-ready Paint Mix Finder built with Next.js App Router, TypeScript, Prisma (PostgreSQL), Tailwind, Zod, and TanStack Query.

## Setup

```bash
npm install
```

## Local development with Postgres

### Option 1: Docker Compose (recommended)

Start Postgres locally:

```bash
npm run db:up
```

Create a `.env` file:

```bash
DATABASE_URL="postgresql://paintmix:paintmix@localhost:5432/paintmix?schema=public"
ADMIN_IMPORT_KEY="your-secret-key"
PRISMA_CLIENT_ENGINE_TYPE="binary"
```

Bootstrap the database from schema:

```bash
npx prisma generate
npx prisma migrate dev
```

Run the app:

```bash
npm run dev
```

### Reset workflow (local dev)

```bash
npm run db:reset
```

### Option 2: Connect to Cloud SQL from local (optional)

Use the Cloud SQL Auth Proxy to connect locally:

```bash
gcloud sql instances describe INSTANCE_NAME
gcloud sql connect INSTANCE_NAME --user=paintmix --database=paintmix
```

Or start the Auth Proxy and point `DATABASE_URL` at localhost:

```bash
cloud-sql-proxy PROJECT:REGION:INSTANCE --port 5432
```

```bash
DATABASE_URL="postgresql://paintmix:YOUR_PASSWORD@localhost:5432/paintmix?schema=public"
```

## Environment variables

Create a `.env` file (see `.env.example`):

```bash
DATABASE_URL="postgresql://paintmix:paintmix@localhost:5432/paintmix?schema=public"
ADMIN_IMPORT_KEY="your-secret-key"
PRISMA_CLIENT_ENGINE_TYPE="binary"
```

## Staging/production database workflow

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
npx prisma migrate deploy
```

Start the app after migrations finish.

## Deployment: Cloud Run + Cloud SQL (staging)

### 1) Create a Cloud SQL Postgres instance

Choose the smallest shared-core tier (e.g. `db-f1-micro` / `db-g1-small` where available) in the same region as Cloud Run.

```bash
gcloud sql instances create paintmix-staging \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=REGION
```

### 2) Create the database and user

```bash
gcloud sql databases create paintmix --instance=paintmix-staging
gcloud sql users create paintmix --instance=paintmix-staging --password=YOUR_PASSWORD
```

### 3) Deploy Cloud Run with Cloud SQL attached

Attach the Cloud SQL instance when deploying:

```bash
gcloud run deploy paintmix-staging \
  --image=IMAGE_URL \
  --region=REGION \
  --add-cloudsql-instances=PROJECT:REGION:paintmix-staging
```

### 4) Set DATABASE_URL using the Cloud SQL Unix socket

```bash
DATABASE_URL="postgresql://paintmix:YOUR_PASSWORD@/paintmix?host=/cloudsql/PROJECT:REGION:paintmix-staging&schema=public"
```

### 5) Run Prisma migrations for staging

Run migrations from CI/CD or locally against the staging `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

> Note: do not run `prisma migrate dev` in the Docker build.

## Admin instructions

Visit: `http://localhost:3000/en/admin?key=your-secret-key`

### Import flow (CSV only, sequential)

Import must follow the sequence:
1. `brands.csv`
2. `colors.csv`
3. `components.csv`

### Required columns

**brands**
- slug (string, required)
- name (string, required)

**colors**
- brandSlug (string, required)
- code (string, required)
- name (string, required)
- productionDate (string, optional, ISO date)
- colorCar (string, optional)
- notes (string, optional)

**components**
- brandSlug (string, required)
- colorCode (string, required)
- variant (string, required: V1 or V2)
- tonerCode (string, required)
- tonerName (string, required)
- parts (number, required)

### Production date field

- `productionDate` is optional and stored as a database `DateTime` when provided.

Accepted import formats for `productionDate`:
- `YYYY-MM-DD` (preferred)
- ISO 8601 date-time strings

Additional rules:
- `productionDate` must be a valid date.
- `productionDate` cannot be in the future.

## Admin QA checklist

- Import sequence enforced.
- Preview shows row errors.
- Commit writes correct counts.
- Display tables show correct data.
- CRUD validates and persists.
- Autocomplete works and is keyboard-friendly.
- Mobile layouts usable.

## Variant data model

- Color records are unique by `(brandSlug, code)` and do **not** store a variant.
- Component/formula rows store `variant` (`V1` or `V2`) and belong to a color.
- Search results return one color per `(brandSlug, code)` and include `formulas[]`.
- Variant labels are localized only in the UI (`variant.V1`, `variant.V2`).

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

## Variant QA checklist

- Searching a code with multiple variants returns exactly one result.
- No Color object contains a `variant` field.
- Variant appears only in the formula/component UI.
- Switching variants updates components and gram calculation.
- Import works with variant only in `components.csv`.
- API responses remain language-neutral (variants are not localized).

## Color car brand QA checklist

- Import works with and without `colorCar`.
- Existing colors without `colorCar` remain valid.
- API returns `colorCar` as string or null.
- UI shows `colorCar` only when present.
