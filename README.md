# Artheon Energy dealer portal

A Next.js dealer ordering application for **Artheon Energy**, a unit of Artheon E-Commerce Pvt. Ltd.

## Features

- 99 products from the supplied GoRewatt lists, with downloaded representative photographs.
- No catalogue prices. Dealers contact the team for pricing and availability.
- Clerk email/Google sign-in, business registration, and Main Admin approval.
- A device-local draft cart, server-saved orders, order history and change requests.
- Main Admin approvals, Staff Admin warehouse operations, and dealer data isolation.
- Internal available quantity adjustment, catalogue visibility and stock adjustment audit history.
- Confirmation, preparation, transporter/LR details, dispatch, completion and cancellation.
- Price-free order CSV export.
- UPI/NEFT placeholders only: no payment collection or screenshot uploads.

## Hosting and services

- GitHub source: https://github.com/itsmk42/artheondist
- Vercel project: itsmk42s-projects/artheondist
- Framework: Next.js App Router with Node.js functions in Singapore.
- Database: Neon Postgres, provisioned through the Vercel Marketplace on its Free plan.
- Authentication: Clerk, provisioned through the Vercel Marketplace on its Hobby plan.

The Vercel copy replaces the original Cloudflare/Vinext runtime. It does not trust the old `oai-authenticated-user-*` headers. The original Sites deployment is separate and remains unchanged. The Postgres database starts empty; existing Sites records are not automatically copied.

## First Main Admin

Sign in or sign up through Clerk using **ballery619@gmail.com**, and complete email verification. The verified identity is bootstrapped as Main Admin on its first portal visit. New dealer registrations are always pending; role values supplied by the browser are ignored during registration. Main Admins can approve dealers, suspend access, and grant Main Admin or Staff Admin roles. They cannot demote or suspend their own account.

Clerk currently supplies a **development instance** because no production custom domain has been configured. It supports testing sign-in on the Vercel URL and displays the development-mode banner. Before external dealer launch, configure the production Clerk instance and its required domain/DNS, replace the Vercel production environment keys through the integration, redeploy, and verify a real sign-in. Development and production Clerk identities are distinct: plan any account migration before onboarding real dealers. Do not disable verification or bypass the account approval process.

## Stock and fulfilment

Quantities are manually maintained internal available quantities, not a live warehouse integration. Null means unknown. Order submission does not automatically reserve or subtract stock. Confirm availability and reconcile quantities when accepting or dispatching an order. Dealers never receive internal stock counts from the API.

Prices and commercial terms are agreed directly with the dealer. A submitted order remains pending confirmation. Confirmed, Declined and Cancelled transitions require a Main Admin note. Dispatch requires transporter and consignment details. UPI/NEFT integration is deferred, so this version has no payment gate before dispatch.

## Local setup

Use Node.js >=22.13.0 and npm.

1. `npm ci`
2. Link the intended Vercel project: `vercel link --project artheondist --scope itsmk42s-projects`
3. Pull development configuration: `vercel env pull .env.local --environment=development`
4. Verify the keys listed in `.env.example` are configured. Never commit real credentials.
5. `npm run db:migrate`
6. `npm run dev`

The sign-in and sign-up paths are `/sign-in` and `/sign-up`. No ChatGPT account is required for this version.

## Schema and migrations

Drizzle defines the Postgres schema in `db/schema.ts`. After a schema change, run `npm run db:generate`, review the generated migration, then use `npm run db:migrate`. The migration runner loads `.env.local` by default and prefers the direct `DATABASE_URL_UNPOOLED` connection. Set `ARTHEON_ENV_FILE` to an explicit, ignored environment file when targeting another environment.

Apply reviewed migrations before deploying dependent code. The build does not mutate the database. Never modify a previously applied migration. Production and preview resource separation should be reviewed before real dealer onboarding; the initial Marketplace setup supplied the same database to development and production.

## Verification

- `npm run typecheck`
- `npm run build`
- Start a local build with `npm start -- --port 3037` (use the default hostname).
- `npm run test:integration`

The integration script requires a Clerk **test** key, creates two temporary test identities, exercises the local HTTP API and real database, and deletes only its own fixtures. It does not print credentials. The checks cover verified sessions, rejection of old platform identity headers, registration privilege protection, approval, persistence, idempotency, isolation, permissions, transport validation, stale updates and audit history.

The test script is for a controlled development database. It temporarily assigns an administrative role only to its newly created fixture identity. Do not use it against an instance with real customers without an isolated test database and authentication instance.

## Deployment

GitHub is linked to Vercel. A push to the configured production branch can trigger a deployment. Use `vercel deploy` for a preview, and explicitly review the target before production release. Configure secrets in Vercel; `.env.local`, `.env.production.local`, `.vercel`, generated build files, local state and screenshots are ignored.

Product information is in `lib/catalogue.json`; source image references are in `scripts/custom/image-sources.json`. Original commercial PDFs are not part of the repository or deployment. No seeded dealers, warehouse quantities or sample orders are included.

Before dealer launch, supply sales contact details, configure production Clerk authentication and domain, verify the first Main Admin, review stock units/minimums, and enable the intended audience. Keep backups through the database provider and periodically export orders. Payments, invoicing, automatic notifications, stock reservation and accounting integrations are separate follow-on work.
