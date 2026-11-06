export default function StaffGuide({
  createMenu,
  openOrders,
}: {
  createMenu: () => void;
  openOrders: () => void;
}) {
  return (
    <section className="staff-guide" aria-labelledby="staff-guide-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">KEEP THIS HANDY</div>
          <h2 id="staff-guide-title">Culinary quick guide</h2>
          <p>
            Thank you for feeding our school. Here’s the shortest path to
            service.
          </p>
        </div>
      </div>
      <section className="admin-card">
        <h3>Your daily checklist</h3>
        <ol>
          <li>
            <strong>Prepare:</strong> Create a menu, upload or enter dishes, and
            check names and prices.
          </li>
          <li>
            <strong>Schedule:</strong> Set the service date, order deadline,
            pickup times and location.
          </li>
          <li>
            <strong>Publish:</strong> Choose <strong>Save &amp; publish</strong>
            . Drafts are not visible to teachers.
          </li>
          <li>
            <strong>Serve:</strong> Open Orders, choose the correct menu, press
            Refresh and check meal requests.
          </li>
          <li>
            <strong>Finish:</strong> Update orders as ready, collected or
            cancelled. Payment happens at the Cove.
          </li>
        </ol>
        <div className="setup-actions">
          <button className="button primary" onClick={createMenu}>
            Create a menu
          </button>
          <button className="button secondary" onClick={openOrders}>
            Open orders
          </button>
        </div>
      </section>

      <section className="admin-card" aria-labelledby="two-menu-title">
        <h3 id="two-menu-title">Two menus on the same day</h3>
        <ol>
          <li>
            Create a menu titled <strong>Grab &amp; Go</strong>. Add only its
            dishes, set its schedule and location, then publish.
          </li>
          <li>
            Create another menu titled <strong>Restaurant / Sit-Down</strong>.
            Add its dishes, set its own cutoff and service details, then
            publish.
          </li>
          <li>
            Use the <strong>same service date</strong> for both if they run on
            the same day. Each menu can have different prices, cutoff times and
            locations.
          </li>
          <li>
            Teachers use <strong>Choose a menu</strong> when more than one menu
            is published. Orders belong to one menu; switching menus clears the
            cart.
          </li>
          <li>
            In <strong>Orders → Menu</strong>, select one menu before checking
            prep totals or exporting its orders.
          </li>
        </ol>
        <p className="staff-guide-note">
          Sit-down menus currently collect meal orders, not table reservations.
          The form still uses pickup labels; explain dining arrangements in the
          menu’s notes and location. Seating times and party sizes are not
          booked here.
        </p>
      </section>

      <details className="admin-card">
        <summary>Upload a menu, paste text or enter dishes manually</summary>
        <p>
          Choose <strong>Create a menu</strong>, then use one of these options:
        </p>
        <ul>
          <li>
            <strong>Google Docs:</strong> File → Download → PDF Document (.pdf),
            then choose the downloaded file. A Drive link is not an upload.
          </li>
          <li>
            <strong>PDF:</strong> Use selectable text, up to 10 MB and 20 pages.
            For image-only PDFs, export a PNG instead.
          </li>
          <li>
            <strong>PNG:</strong> Use a sharp, upright English-language image,
            up to 10 MB and 16 million pixels. Choose the matching PNG layout if
            columns get mixed, then select the file again.
          </li>
          <li>
            <strong>Type or paste:</strong> Put one dish on each line using the
            example below. Or enter dishes directly in the menu editor.
          </li>
        </ul>
        <pre>
          {
            "# Mains\nChicken bowl | Rice and vegetables | $8.50\n# Desserts\nCookie | $2.00"
          }
        </pre>
        <p>
          Choose <strong>Review items</strong>, correct mistakes and check
          unrecognized lines for missing dishes. For PNG imports, confirm that
          you checked every dish and price against the original before adding
          items. Then use <strong>Add items to menu</strong> and review the
          editor before publishing.
        </p>
        <p className="staff-guide-note">
          OCR is not perfect. Lines marked [Needs review] are excluded.
          Descriptions may need copying manually. Set up salad add-ons and other
          choices manually, and verify dietary labels yourself—never infer
          allergy safety from the imported text.
        </p>
      </details>

      <details className="admin-card">
        <summary>Set a cutoff, save a draft or change a published menu</summary>
        <p>
          Under <strong>Set the table</strong>, enter the service date and
          <strong> Order deadline (your local time)</strong>. Use the correct
          time on your device. Choose a future deadline before pickup begins,
          then set pickup start, end and location.
        </p>
        <p>
          Teachers see an <strong>Order by</strong> time. Ordering closes at the
          deadline, including for teachers who left the page open. Each menu has
          its own cutoff.
        </p>
        <ul>
          <li>
            <strong>Save draft:</strong> Save without making the menu orderable.
            Saving a published menu as a draft also takes it offline.
          </li>
          <li>
            <strong>Edit menu → Save &amp; publish:</strong> Apply changes
            online. To publish again after a cutoff, set a future deadline and
            check the service date.
          </li>
          <li>
            <strong>Sold out:</strong> Uncheck the dish’s{" "}
            <strong>Available to order</strong> box, then save and publish.
          </li>
          <li>
            <strong>Unpublish:</strong> Stop new orders for that menu. Existing
            orders are kept.
          </li>
        </ul>
        <p>
          Changing a menu does not rewrite orders already placed. Contact
          affected teachers directly about substitutions or cancellations.
        </p>
      </details>

      <details className="admin-card">
        <summary>
          Read orders, meal requests, kitchen totals and exports
        </summary>
        <ul>
          <li>
            Open <strong>Orders</strong> and press <strong>Refresh</strong>{" "}
            regularly. The board does not update automatically.
          </li>
          <li>
            Use <strong>Menu</strong> and <strong>Status</strong> filters to
            focus on the service you are preparing.
          </li>
          <li>
            Check each card’s <strong>Teacher meal request</strong> for notes
            such as “no bacon.” Requests are not guaranteed; clarify anything
            the kitchen cannot accommodate directly.
          </li>
          <li>
            Use <strong>New → Ready for pickup → Collected</strong> as food
            moves through service. Use <strong>Cancelled</strong> when an order
            will not be fulfilled.
          </li>
          <li>
            <strong>Kitchen prep</strong> counts new and ready orders in the
            current filtered view, excluding collected and cancelled orders.
          </li>
          <li>
            <strong>Export CSV</strong> downloads the currently filtered orders,
            including meal requests. Clear filters if you need all orders.
          </li>
        </ul>
        <p className="staff-guide-note">
          No online payments or automatic email notifications are sent.
          “Collected” is a service status, not a payment record. Keep exported
          teacher information on school-approved devices and follow school
          privacy rules.
        </p>
      </details>

      <details className="admin-card">
        <summary>Quick fixes when something looks wrong</summary>
        <ul>
          <li>
            <strong>Teachers cannot see a menu:</strong> Check that it is
            published, the service date is correct and the cutoff has not
            passed. Ask them to refresh the menu.
          </li>
          <li>
            <strong>Import looks wrong:</strong> Do not add incorrect items.
            Correct the text, retry with the right layout, use a selectable-text
            PDF, or enter dishes manually.
          </li>
          <li>
            <strong>No orders showing:</strong> Press Refresh and check both
            filters. A different menu or status may be selected.
          </li>
          <li>
            <strong>Save failed:</strong> Read the error, correct the
            highlighted fields and try again. A failed save is not published.
          </li>
          <li>
            <strong>Cannot sign in:</strong> Use your school-provided culinary
            account. Ask the site administrator for access or a password reset;
            there is no public staff signup.
          </li>
        </ul>
        <p>
          For a new day, create a new menu rather than changing the date on an
          old service. This keeps menus and their order history easy to
          distinguish.
        </p>
      </details>
    </section>
  );
}
