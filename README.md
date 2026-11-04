# Cape Cod Tech Culinary Ordering

A static, mobile-friendly teacher ordering site and culinary staff dashboard for
Cape Cod Regional Technical High School. Teachers can browse a published menu,
customize their meal in an open-response request field, submit an order and pay
at pickup. Online payments are not collected.

The site requires a configured Supabase project for shared menus, real orders and
staff sign-in. **There is no demo mode, sample menu, local order storage or
hard-coded admin password.** If the live service isn't configured, the site
displays a setup message instead of accepting pretend orders.

## Features

- Searchable menus, categories, portions, availability, dietary labels and cart.
- Optional, free-response meal requests such as “no ketchup” or “no bacon.”
  Requests are shown to culinary staff but are not guaranteed. Allergy needs
  must be discussed directly with staff.
- Pickup dates, times and deadlines controlled by culinary staff.
- Staff sign-in, menu drafts, PDF/text menu import with review, publishing and
  order management.
- Kitchen prep totals, order status updates and CSV export.
- Supabase server-side validation of prices, item availability and order limits.
- Cape Cod Tech crimson, maroon, platinum, graphite and midnight brand palette.

## Run locally

Requires Node.js 22.13+ (Node.js 24 recommended) and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Configure both variables in `.env` before the site can load orders:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

To run checks and preview the production build:

```sh
npm test
npm run build
npm run preview
```

## Configure real ordering and culinary staff access

A static site cannot securely share orders or authenticate staff by itself. Use
a Supabase project approved by the school's IT/data-protection team:

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) **once**
   in the new project. It creates menus, orders, staff membership, permissions
   and the server-side order function. The script is an initial schema, not a
   repeatable migration.
3. In **Authentication → Providers → Email**, disable public user sign-ups.
4. Create a dedicated account in **Authentication → Users → Add user** using a
   school-controlled culinary email. Set its user metadata `full_name` to
   **Cape Cod Tech Culinary Team**; the admin dashboard displays this name.
   Establish its password through Supabase's secure invite/password setup, then
   share it only through the school's approved secure channel. If multiple staff
   need access, separate named accounts are safer than sharing a password. Do
   not put passwords or service-role keys in this repository or Render variables.
5. Add the user ID from that auth account to the staff list:

   ```sql
   insert into public.culinary_staff (user_id)
   values ('replace-with-the-staff-users-uuid');
   ```

   Creating an auth user alone does not grant culinary access. To remove access,
   delete the staff row and disable the auth account. Supabase owns password
   storage and reset; the site never exposes staff passwords.

6. Copy the Supabase project URL and **anon / publishable key** to the host's
   build-time environment as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   These keys are public browser configuration; **never use a secret or
   service-role key**.
7. Rebuild/redeploy. Sign in under **Culinary team** with the provisioned school
   email and password, create a menu and publish it. Verify an order submitted
   from another browser appears in the staff dashboard.

Teachers submit an open-response meal request on the final checkout step.
Examples include “no ketchup,” “no bacon,” or “dressing on the side.” The request
is stored with the order and displayed to staff as **Teacher meal request**.
Staff should confirm requests when needed. Requests are not guaranteed, do not
automatically alter recipes or prices, and this field must not be used for
allergy or medical information; teachers should discuss those needs directly
with culinary staff before ordering.

### Access and order handling

Visitors may read published menus and submit orders, but cannot read orders,
drafts or the staff list. Approved staff can edit menus, read orders and update
order statuses. The database checks menu status, deadline, availability, prices
and quantities (20 per item, 60 total). Amounts are integer US cents.
Order line names/prices are snapshots; later menu edits do not change orders.
Retries use the same request UUID to prevent duplicate orders after a lost
response.

Teacher checkout does not verify school email ownership. Five orders per email
per 10 minutes provides basic throttling, not strong abuse protection. For
school-only access, have IT restrict the site behind the school's SSO/access
gateway before distributing it.

Names, email, room and meal requests are stored in the school's Supabase project
and visible to approved staff. There is no analytics, online payment or outgoing
email service. Teachers receive an on-screen confirmation only and should save
the order reference. Contact culinary staff directly for changes or
cancellations. Review the school's privacy requirements and retention policy
before collecting real details.

## Import a menu

In the admin panel, choose **Create a menu** and either upload a PDF or paste:

```text
# Mains
Roasted chicken bowl | Rice, seasonal vegetables & lemon dressing | $8.50
Garden pesto pasta | Basil pesto, tomatoes & parmesan | $7.50
# Something sweet
Chocolate chip cookie | Fresh from the oven | $2.00
```

Use one item per line, ending with a price. Category headings can be `# Mains`
or `Mains:`. Descriptions are optional. The importer does not invent prices or
infer dietary/allergy claims. PDF text extraction runs in the browser; the
original file is not stored or uploaded. PDFs need selectable text (10 MB /
20-page limit). Scanned/image-only PDFs need OCR elsewhere first, or staff can
type the menu. Complex columns and wrapped lines may need manual correction.

Click **Review items** and inspect both detected items and unrecognized lines,
then click **Add items to menu**. Review dish names, prices, dietary labels,
pickup details and deadlines before **Save & publish**.

## Deploy to Render

Create/update a **Static Site** connected to this repository:

- Branch: `main`
- Root Directory: leave blank
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Node.js: **22.13.0 or newer**

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Render build
environment variables before deploying. Without both, the site shows an
informational setup screen; it does not display sample data or accept orders.
Redeploy after changing variables.

## Deploy to GitHub Pages

1. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
2. Add `ENABLE_PAGES=true`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   as repository Actions variables.
3. Push to `main` or run **Build and deploy Cove** from the Actions tab. Pull
   requests run the tests/build without deploying. Changing variables requires
   a new build.
4. Set Supabase's **Authentication → URL Configuration → Site URL** to the
   published website URL.

The Vite build uses relative asset URLs, so repository Pages subpaths work
without rewrites. Fonts and food illustrations are local assets. The default
currency is USD and dates use US formatting.

## Branding asset

The site uses Cape Cod Tech's published crimson `#941114`, maroon `#6A1817`,
platinum `#DFE1DF`, carbon `#878A8F`, graphite `#41474E`, midnight `#12283C`
and aqua `#1CB1D1` palette. The current header/favicon use a **CCT text
monogram**, not the school's official C-Shield artwork. Replace the monogram with
an approved school-provided SVG/PNG before representing it as the official logo.

## Structure

`src/Storefront.tsx` is the teacher experience; `src/Admin.tsx` is the staff
dashboard. `src/repository.ts` connects to Supabase, `src/model.ts` contains
validation and money/date helpers, and `src/import-menu.ts` handles menu parsing
and PDF extraction. `supabase/schema.sql` contains the data access policies and
order validation.
