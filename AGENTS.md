# TravelOS rental app

This is the standalone TravelOS application authorized by the user, built with Next.js App Router, TypeScript, React and CSS. The ancestor CHAMBERS WordPress instructions concern a different website. For this application follow PRD.md, design.md and the original Travel Agent HTML prototype. Do not publish or change the WordPress site.

Before any UI change, re-read `design.md` as the authoritative design reference. External screenshots guide interaction/layout only; keep the palette, typography, spacing and component treatment from `design.md`. Use existing CSS tokens: neutral surfaces, orange selection/focus, and dark primary actions. Do not introduce a new accent color from a reference image. Preserve the existing neutral, orange-accented TravelOS design. Keep Indonesian copy. Dashboard, Bookings, Calendar, Vehicles, Maintenance, Inspections, Reports, Customers, Expenses, Invoices, Partners and Settlements are the current implementation scope. Label sample data and unfinished modules honestly. Local JSON persistence is for single-process local development only. VPS deployment uses PostgreSQL via DATABASE_URL, native authentication, and a persistent upload directory; see docs/DEPLOY-VPS.md. PostgreSQL business snapshots use JSONB protected by a workspace row lock. Never bypass authentication or fall back to JSON on database errors.

Run typecheck, focused business-rule tests and a production build after implementation. Check desktop and mobile UI, keyboard dialogs, saving/reloading and error handling. Never overwrite user local data or use real customer PII as seed data.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Responsive requirement for every page

Dashboard, Bookings, Calendar and every future page must use the shared application shell and responsive primitives in `src/app/globals.css` and follow `docs/RESPONSIVE.md`. Never hard-code a desktop-only page width. Verify phone (320, 360, 390, 430), tablet (768, 820, 1024) and desktop (1280, 1440, 1920), including immediately above and below layout breakpoints. No document-level horizontal overflow. Wide schedules may scroll only inside a labeled region; provide a usable mobile agenda. Tables need a mobile card or stacked-row representation. Test open drawers, filters, navigation and empty/error states, not only the initial page. Preserve reduced-motion behavior, keyboard operation and touch targets. Record actual tested widths in the handoff; never claim every device was tested.

## Form and dropdown consistency
Keep labels above their controls with an 8px label-to-control gap; use 16px grid gaps and clear spacing between fields. Wrapped labels must stack vertically; preserve checkbox, upload and filter layouts. Use the shared select chevron in globals.css (the same Lucide ChevronDown path as the booking date trigger), 16px with 14px trailing inset and reserved text padding. Preserve native select keyboard behavior. Do not add a second dropdown icon or change navigation arrow meaning.

## Shared calendar requirement
Use `src/components/date-picker.tsx` for every calendar popup. `DateField` adapts date/date-time fields and `BookingDatePicker` configures rental ranges using the same component. Do not introduce native date/datetime-local inputs or duplicate calendar markup on new pages. Keep optional clearing, required-field validation, min/max bounds, WITA, keyboard focus, Escape/outside cancellation, and explicit Selesai confirmation. Calendar popups must remain in the top layer and within the viewport.

## Invoice consistency
Invoice source snapshots and numbering become immutable on issue. Only one active draft/issued invoice per booking. Issuance reconciles booking.paid exactly once as an opening balance without an invented cash date; issued totals and payments synchronize booking totals for existing customer/dashboard/report views. Issued invoices lock direct booking edits. Deposit is separate. Manual payment corrections preserve the original entry and reason and do not constitute money movement or refunds. Use the shared DateField/DatePicker and design.md styling. PDF is generated server-side through pdf-lib with embedded Inter fonts, never a renamed HTML response.

## Partner margin and settlements
Use partner-report.ts as the shared operational margin engine. Freeze agreement terms per booking; do not invent terms for old partner rentals. Cross-month allocation uses cumulative rounding on contract duration and excludes invoice tax/deposit. Monthly fixed fees accrue on calendar contract days even when idle. Owner-borne costs reduce owner payable; operator costs reduce margin. Allocate common expenses by revenue and keep unallocatable amounts visible. Profit is accrual-based and provisional for current/unconfirmed activity.
Final owner documents lock the included booking/unit period sources. Owner PDFs must whitelist owner fields and never expose internal revenue, costs or margin. Settlement payments synchronize Expenses and are not second costs. Reconcile historical transfers explicitly. Credits offset the same owner's final documents without cash/expense duplication and remain auditable. Do not auto-send statements.

## Single operational workspace
Branch management has been removed at the user's request. Do not add branch pages, navigation, form fields, filters, validation, or branch-dependent access. All vehicles, staff and transactions are managed together. Legacy branch keys and finalized document snapshots may remain as historical metadata; never use them to filter active records or require a registry. See `docs/SINGLE-WORKSPACE.md`.

## Multi-company isolation
Each company owns a separate workspace. Resolve the workspace only from the verified native session, never TRAVELOS_WORKSPACE_ID or request headers/body/query. All business reads/writes must use store.ts; use transaction-local RLS context and a non-owner, non-BYPASSRLS runtime database role. Read/write files through tenant-scoped helpers, including PDF logos. Public signup is gated by TRAVELOS_ALLOW_SIGNUP and creates an empty company atomically. Do not reintroduce branches; the single operational workspace rule above applies within each company. See docs/MULTI-COMPANY.md.
