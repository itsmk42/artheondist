# Artheon Energy dealer portal

Dealer ordering and warehouse administration for **Artheon Energy**, a unit of Artheon E-Commerce Pvt. Ltd.

## Included

- All 99 listed products, with no prices in product data or assets.
- Locally downloaded representative product photographs and the supplied logo.
- Search, category/brand filters, sorting, grid/list views, product detail dialogs.
- Persistent device-local cart, validated quantities and destination details.
- Sites-managed sign-in and dealer registration awaiting Main Admin approval.
- Server-saved orders, unique request keys to prevent duplicate retry orders, order history and change requests.
- Order confirmation, preparation, transport/consignment details, completion, decline and cancellation.
- Main Admin, Staff Admin and Dealer roles enforced in server handlers.
- Main Admin dealer approvals, suspension and role changes.
- Internal warehouse quantity adjustment, catalogue visibility and audit history.
- Price-free CSV order export.
- UPI/NEFT information placeholders only. No payment data, payment processing or screenshot uploads.

## Access and first Main Admin

The trusted Sites identity whose email is `ballery619@gmail.com` is bootstrapped as Main Admin on first authenticated visit. The identifier and role are saved in D1. New public registrations are always pending dealers; submitted role fields cannot elevate access. Existing Main Admins can grant other Main Admins and Staff Admins. An administrator cannot demote or suspend their own account.

Authentication is managed by Sites using ChatGPT sign-in. The application does not implement a separate password or OAuth service. A new hosted Site is owner-private for review: dealers must be granted supported site access before they can register. Do not expose the Worker directly outside Sites dispatch because it relies on the platform's trusted identity headers.

Production contains no seeded dealers, orders, or stock counts. The local test identity is `local_seedy` / `seedy@sites.test`; it is provided by the starter only on loopback development servers and is absent from production builds.

## Inventory and commercial process

Quantities are manually maintained available quantities. Null means unknown, zero means zero. Product stock numbers are returned only to approved admins. Orders never reserve or deduct quantities automatically. Check availability and reconcile inventory when approving and dispatching orders. Product packaging and ordering units are subject to confirmation with the dealer.

An order submission is a request pending your availability and commercial confirmation. Prices are agreed outside the portal. As payments are deferred, there is no payment gate between confirmation and dispatch. Confirmed / Declined / Cancelled transitions require a Main Admin note. Dispatch requires transporter and consignment details. Updates retain status history and use an optimistic version check.

## Development

Requires Node >=22.13.0 and the portable Sites runtime. Dependencies are locked in package-lock.json.

1. Install through the Sites `install-dependencies.mjs` helper.
2. Generate migrations after schema changes: `npm run db:generate`.
3. Build using the Sites `build-site.mjs` helper.
4. Apply local migrations using the starter's Wrangler D1 commands from README in the Sites skill.
5. `npm run dev` serves the local application on the printed loopback URL.
6. Sign in with `/signin-with-chatgpt?return_to=/` to use the portable test identity.

`npx tsc --noEmit` checks TypeScript. `python3 scripts/custom/check-portal.py` runs integration checks against a running local preview and its D1 database. Register the local test identity first. The script refuses to operate against an arbitrary remote URL and cleans up its own generated fixtures. Never copy local `.wrangler` state into a production deployment.

## Storage and deployment

`.openai/hosting.json` binds the structured data store as `DB`. Drizzle migrations live under `drizzle/`; do not modify an already-applied migration. Product data is in `lib/catalogue.json`; original commercial PDFs are outside the application and are not published. `scripts/custom/image-sources.json` records the origins of downloaded images.

Use the Sites source helper to build, synchronize source, package and publish. Keep `.wrangler/`, `.sites-runtime/`, local databases, credentials and outputs out of source control. Production migrations are applied by Sites during deployment.

## Operational notes

Supply sales contact details before opening the portal to dealers. Until then the ordering guide refers dealers to their Artheon Energy representative. Set up approved access for external dealers and verify a real Main Admin sign-in before onboarding. Order exports are available in the admin orders screen. Use hosting-managed D1 recovery/backups for database recovery; keep periodic price-free order exports as an operational fallback.

The initial implementation has no automatic notifications, tax invoices, accounting integration, payments, reservation engine, or multi-warehouse stock. Those are separate follow-on integrations.
