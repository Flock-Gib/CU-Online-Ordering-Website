# The Cove — culinary ordering

A static, mobile-friendly ordering site for teachers, with a culinary-staff dashboard.
Teachers browse a published menu, choose quantities, provide pickup details and get an
order reference. **No online payments:** the amount is due at the Cove.

## What is included

- Menu browsing, categories, search, availability, dietary labels, cart and checkout.
- Staff sign-in, menu drafts, publishing/unpublishing, pickup times and order deadlines.
- Typed-menu and text-based PDF import, with an explicit review step before adding items.
- Staff order board, new/ready/collected/cancelled statuses, kitchen prep totals and CSV export.
- A clearly labeled local demo with sample dishes. No account or service is required to try it.
- Supabase schema, row-level permissions and a server-validated order function for real use.
- GitHub Pages build/deployment workflow. The same `dist/` folder works on other static hosts.

## Run locally

Requires Node.js 22.13+ (Node.js 24 recommended) and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open the localhost URL. With both environment values blank, the app runs in **demo
mode**. Menus and orders are saved only in that browser's local storage. Use made-up
customer details. Click **Culinary staff → Explore demo admin** to try the dashboard.
Use **Reset demo** to clear local data. Demo mode is not a shared ordering system
and does not send orders to anyone. Sample menus are dated for the following day.

```sh
npm test
npm run build
npm run preview
```

## Enable real shared ordering

A static website alone cannot securely share orders or authenticate staff. This
project keeps the frontend static and uses **your school's Supabase project** for
the database and authentication. No custom server is required, but a live service
must be configured before real orders can be collected.

1. Create a Supabase project approved by your school's IT/data-protection team.
2. Run [`supabase/schema.sql`](supabase/schema.sql) **once in a new project** using
   the Supabase SQL Editor. It creates menus, orders, staff membership, permissions
   and the `place_order` function. It is an initial schema, not a repeatable migration.
3. In **Authentication → Providers → Email**, disable public sign-ups. Create each
   culinary staff user through **Authentication → Users → Add user**. Use an
   email-confirmed account with a strong password, communicated securely. The
   dashboard handles initial passwords and resets; public password reset and
   self-registration are deliberately not included in this site.
4. Add each approved user's UUID to the staff list using the SQL Editor:

   ```sql
   insert into public.culinary_staff (user_id)
   values ('replace-with-the-staff-users-uuid');
   ```

   Creating an authentication account alone does **not** grant culinary access.
   To remove access, delete their `culinary_staff` row and disable the auth account.
5. Copy the project URL and **anon / publishable key** from Supabase into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

   Never use a secret or service-role key. Vite variables are public browser code.
   Both values are required; a partial configuration displays an error, not demo mode.
6. Restart the dev server or rebuild. Sign in through **Culinary staff**, create a
   menu and publish it. Confirm an order from another browser appears in the staff
   order board. The order board uses its **Refresh** button, not real-time push.

### Permissions and order handling

Visitors can read published menus and call the order function, but cannot read
orders, drafts or the staff list. Approved staff can edit menus, read orders and
change order status; they cannot grant themselves staff membership from the site.
The database, not the browser, checks the published menu, deadline, availability,
prices and quantities (20 per item, 60 total). Amounts are integer US cents.
If a price changes during checkout, the teacher must refresh before submitting.
Order line names/prices are snapshots, so editing a menu does not change old orders.
Retried submissions use the same request UUID to avoid duplicate orders after a
lost response.

Teacher checkout does **not** verify school email ownership. The form is publicly
accessible unless the host is restricted. Five orders per email per 10 minutes
provides basic throttling, **not strong abuse protection**; someone can use other
addresses. For school-only access, have IT put the site behind a school SSO/access
gateway before distributing it. Add server-verified CAPTCHA if exposing it to
untrusted traffic. Client-side checks are not access controls.

Names, email, room and notes are stored in your Supabase project and visible to
approved staff. There is no analytics, online payment or outgoing email service.
Teachers see an on-screen confirmation only and should save the reference.
They must contact culinary staff for changes/cancellations. Review your school's
privacy requirements, publish its privacy notice, restrict staff accounts and
establish a retention period before collecting real details. Do not collect
medical information in order notes. Dietary labels are not allergen guarantees.

## Import a menu

In the admin panel, choose **Create a menu** and either upload a PDF or paste:

```text
# Mains
Roasted chicken bowl | Rice, seasonal vegetables & lemon dressing | $8.50
Garden pesto pasta | Basil pesto, tomatoes & parmesan | $7.50
# Something sweet
Chocolate chip cookie | Fresh from the oven | $2.00
```

Use one item per line, ending with a price. Category headings can be `# Mains` or
`Mains:`. Descriptions are optional. The importer is deterministic, not an AI
service: it does not invent missing prices or infer dietary/allergy claims.
PDF text extraction runs locally in the browser; the original file is not stored
or uploaded. PDFs must contain selectable text (10 MB / 20-page limit).
Scanned/image-only PDFs need OCR elsewhere first, or staff can type the menu.
Complex columns, wrapped lines and unusual formatting may need manual correction.

Click **Review items**. Inspect the detected items **and unrecognized lines**,
then click **Add items to menu**. Edit each dish, confirm prices, manually set any
dietary labels, choose pickup details and a deadline, then **Save & publish**.
Import adds to existing items rather than replacing them. Saving a published
menu as a draft takes it offline; existing orders are preserved. Unpublish is
also available on the menu list, including for expired menus.

## Deploy to GitHub Pages

1. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
2. Add `ENABLE_PAGES` with value `true` as a **repository Actions variable** under
   **Settings → Secrets and variables → Actions → Variables**. Deployment is
   deliberately opt-in so builds can pass before Pages is configured.
3. For shared ordering, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
   **repository Actions variables** under **Settings → Secrets and variables →
   Actions → Variables**. They are intentionally public configuration, not
   service credentials. Without them, the deployed site is a labeled local demo.
4. Push to `main` or run **Build and deploy Cove** from the Actions tab. Pull
   requests run the tests/build without deploying. Changing variables requires
   a new build.
5. Set Supabase's **Authentication → URL Configuration → Site URL** to the final
   website URL. If using a custom domain, use that URL.

   ## Deploy to Render

   Create or update a **Static Site** connected to this repository:

   - Branch: `main`
   - Root Directory: leave blank
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
   - Node.js: **22.13.0 or newer** (also declared in `package.json`)

   The site must be built with a supported Node version because the PDF menu importer
   uses PDF.js. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Render
   environment variables before building if you want shared menus and real orders;
   leave both unset for the browser-only demo. After changing environment variables,
   trigger a new deploy. For a blank page after these settings, check the latest
   Render deploy log and browser developer console for the failed build or asset
   request.

   The Vite build uses relative asset URLs, so repository Pages subpaths work without
   rewrites. There is no client-side routing requiring a server. Fonts are bundled
   locally with system/Georgia fallbacks; all food illustrations are local SVGs.
The default branding is "The Cove", currency is USD and dates use US formatting.
Staff-entered deadline inputs use the staff device's local timezone and are stored
as absolute timestamps; use a device set to the school's timezone. Service dates
and pickup times are school-local labels. Adjust branding/currency in the source
if your school's requirements differ.

## Structure

`src/Storefront.tsx` is the teacher experience; `src/Admin.tsx` is the staff
dashboard. `src/repository.ts` is the shared/demo data adapter, `src/model.ts`
contains validation and money/date helpers, and `src/import-menu.ts` handles
menu parsing/PDF extraction (PDF.js loads only when needed).
`supabase/schema.sql` is the authoritative access control and order validation.
