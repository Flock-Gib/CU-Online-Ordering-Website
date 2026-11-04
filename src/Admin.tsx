import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { z } from "zod";
import { extractPdf, parseMenu } from "./import-menu";
import type { ImportResult } from "./import-menu";
import {
  deadlineInput,
  displayDate,
  displayTime,
  money,
  newMenu,
  ordersCsv,
} from "./model";
import type { Menu, MenuItem, Order } from "./model";
import { listOrders, saveMenu, unpublishMenu, updateOrder } from "./repository";

const errorMessage = (error: unknown) =>
  error instanceof z.ZodError
    ? error.issues[0].message
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
const sample =
  "# Mains\nDish name | Description of the dish | $8.50\nAnother dish | Optional description | $7.50\n# Something sweet\nDessert name | Freshly prepared | $2.00";

function MenuEditor({
  initial,
  back,
  saved,
}: {
  initial: Menu;
  back: () => void;
  saved: () => Promise<void>;
}) {
  const [menu, setMenu] = useState(initial);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(patch: Partial<Menu>) {
    setMenu((previous) => ({ ...previous, ...patch }));
    setDirty(true);
  }
  function changeItem(id: string, patch: Partial<MenuItem>) {
    setMenu((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    setDirty(true);
  }
  function leave() {
    if (!dirty || window.confirm("Leave without saving your menu changes?"))
      back();
  }
  async function importFile(file?: File) {
    if (!file) return;
    setReading(true);
    setError("");
    setParsed(null);
    setImportNotice("");
    try {
      if (!/\.pdf$/i.test(file.name))
        throw new Error("Please choose a PDF file.");
      const extracted = await extractPdf(file);
      setText(extracted);
      setImportNotice(
        `Text extracted from ${file.name}. Check the text, then review the detected items. PDF layouts can affect the results.`,
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function review() {
    const result = parseMenu(text);
    setParsed(result);
    setError("");
    if (!result.items.length)
      setError(
        "No priced items found. Put one item on each line, ending with a price, such as “Soup | Tomato & basil | $4.50”.",
      );
  }
  function addImported() {
    if (!parsed) return;
    if (menu.items.length + parsed.items.length > 100) {
      setError("Each menu can have up to 100 items. Remove some items first.");
      return;
    }
    change({ items: [...menu.items, ...parsed.items] });
    setImportNotice(
      `${parsed.items.length} items added to the menu below. Review names, prices, categories and dietary labels before publishing.`,
    );
    setParsed(null);
    setText("");
  }
  async function save(status: Menu["status"]) {
    if (!form.current?.reportValidity() || busy) return;
    setBusy(true);
    setError("");
    try {
      await saveMenu({ ...menu, status });
      setDirty(false);
      await saved();
      back();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor">
      <button className="text-button" onClick={leave} disabled={busy}>
        <ArrowLeft size={15} /> All menus
      </button>
      <div className="section-heading">
        <div>
          <div className="eyebrow">MENU BUILDER</div>
          <h1>
            {initial.items.length ? "Make it your own." : "What’s on the menu?"}
          </h1>
          <p>
            Import a menu or start from scratch. Nothing changes online until
            you save.
          </p>
        </div>
        <span className="badge">
          {menu.status === "published" ? "Editing published menu" : "Draft"}
        </span>
      </div>
      <fieldset disabled={busy || reading} className="editor-fieldset">
        <section className="admin-card import-card">
          <div className="card-title">
            <span className="step-number">1</span>
            <div>
              <h2>Bring your menu to life</h2>
              <p>
                Upload a text-based PDF or paste your menu. You’ll always review
                it first.
              </p>
            </div>
          </div>
          <div className="import-columns">
            <div className="upload-zone">
              <Upload size={30} strokeWidth={1.4} />
              <h3>Your menu, made clickable.</h3>
              <p>
                Text-based PDFs · up to 10 MB / 20 pages
                <br />
                Scanned images need OCR before import.
              </p>
              <input
                ref={fileInput}
                id="pdf-menu"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => void importFile(event.target.files?.[0])}
              />
              <label
                htmlFor="pdf-menu"
                className={`button secondary ${reading ? "disabled" : ""}`}
              >
                {reading ? "Reading PDF…" : "Choose a PDF"} <Upload size={15} />
              </label>
              <small>PDFs are processed in your browser, not uploaded.</small>
            </div>
            <div className="typed-import">
              <label htmlFor="menu-text">Or type / paste a menu</label>
              <textarea
                id="menu-text"
                rows={7}
                placeholder={sample}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setParsed(null);
                }}
              />
              <div className="import-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setText(sample);
                    setParsed(null);
                  }}
                >
                  Use example
                </button>
                <button
                  className="button secondary"
                  onClick={review}
                  disabled={!text.trim() || reading}
                >
                  Review items <ArrowRight size={15} />
                </button>
              </div>
              <p className="fine-print">
                One item per line: Name | Description | $Price. Use # Category
                for headings. Dietary labels must be set manually.
              </p>
            </div>
          </div>
          {importNotice && (
            <div className="alert success" role="status">
              {importNotice}
            </div>
          )}
          {parsed && (
            <div className="import-preview">
              <h3>{parsed.items.length} items detected</h3>
              {parsed.items.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.category}{" "}
                      {item.description && `· ${item.description}`}
                    </small>
                  </span>
                  <strong>{money(item.price)}</strong>
                </div>
              ))}
              {parsed.skipped.length > 0 && (
                <details className="skipped-lines">
                  <summary>
                    {parsed.skipped.length} unrecognized lines — please check
                    these
                  </summary>
                  <pre>{parsed.skipped.join("\n")}</pre>
                  <p>
                    These lines will not become orderable items. Edit the text
                    above or add them manually below.
                  </p>
                </details>
              )}
              <button
                className="button primary"
                disabled={!parsed.items.length}
                onClick={addImported}
              >
                Add {parsed.items.length} items to menu <Plus size={16} />
              </button>
            </div>
          )}
        </section>
        <form
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            void save("draft");
          }}
        >
          <section className="admin-card">
            <div className="card-title">
              <span className="step-number">2</span>
              <div>
                <h2>Set the table</h2>
                <p>Tell teachers when and where to pick up.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="span-two">
                Menu title
                <input
                  required
                  maxLength={100}
                  value={menu.title}
                  onChange={(event) => change({ title: event.target.value })}
                />
              </label>
              <label>
                Service date
                <input
                  type="date"
                  required
                  value={menu.serviceDate}
                  onChange={(event) =>
                    change({ serviceDate: event.target.value })
                  }
                />
              </label>
              <label>
                Order deadline (your local time)
                <input
                  type="datetime-local"
                  required
                  value={deadlineInput(menu.orderDeadline)}
                  onChange={(event) => {
                    if (event.target.value)
                      change({
                        orderDeadline: new Date(
                          event.target.value,
                        ).toISOString(),
                      });
                  }}
                />
              </label>
              <label>
                Pickup starts
                <input
                  type="time"
                  required
                  value={menu.pickupStart}
                  onChange={(event) =>
                    change({ pickupStart: event.target.value })
                  }
                />
              </label>
              <label>
                Pickup ends
                <input
                  type="time"
                  required
                  value={menu.pickupEnd}
                  onChange={(event) =>
                    change({ pickupEnd: event.target.value })
                  }
                />
              </label>
              <label className="span-two">
                Pickup location
                <input
                  required
                  maxLength={100}
                  value={menu.location}
                  onChange={(event) => change({ location: event.target.value })}
                />
              </label>
              <label className="span-two">
                Menu notes / allergy information
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={menu.notes}
                  onChange={(event) => change({ notes: event.target.value })}
                  placeholder="Share a note from the kitchen…"
                />
              </label>
            </div>
          </section>
          <section className="admin-card">
            <div className="section-heading">
              <div className="card-title">
                <span className="step-number">3</span>
                <div>
                  <h2>Check every delicious detail</h2>
                  <p>
                    Confirm prices and availability. Dietary labels are
                    staff-verified, never guessed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={menu.items.length >= 100}
                onClick={() =>
                  change({
                    items: [
                      ...menu.items,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        category: "Mains",
                        price: 0,
                        dietary: [],
                        available: true,
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Add item
              </button>
            </div>
            {!menu.items.length && (
              <div className="empty-panel compact">
                <UtensilsCrossed />
                <h3>Your menu is a blank canvas.</h3>
                <p>Import items above, or add your first item.</p>
              </div>
            )}
            {menu.items.map((item, index) => (
              <div className="item-editor" key={item.id}>
                <div className="item-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="item-fields">
                  <div className="item-top">
                    <label>
                      Item name
                      <input
                        required
                        maxLength={100}
                        value={item.name}
                        onChange={(event) =>
                          changeItem(item.id, { name: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Price (USD)
                      <input
                        aria-label={`Price for item ${index + 1}`}
                        type="number"
                        min="0"
                        max="1000"
                        step="0.01"
                        required
                        defaultValue={(item.price / 100).toFixed(2)}
                        onChange={(event) =>
                          changeItem(item.id, {
                            price: Math.round(Number(event.target.value) * 100),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={item.description}
                      onChange={(event) =>
                        changeItem(item.id, { description: event.target.value })
                      }
                    />
                  </label>
                  <div className="item-options">
                    <label>
                      Category
                      <input
                        required
                        maxLength={60}
                        value={item.category}
                        onChange={(event) =>
                          changeItem(item.id, { category: event.target.value })
                        }
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={(event) =>
                          changeItem(item.id, {
                            available: event.target.checked,
                          })
                        }
                      />{" "}
                      Available to order
                    </label>
                  </div>
                  <div className="dietary-options">
                    {(["Vegetarian", "Vegan", "Gluten-free"] as const).map(
                      (tag) => (
                        <label className="checkbox" key={tag}>
                          <input
                            type="checkbox"
                            checked={item.dietary.includes(tag)}
                            onChange={(event) =>
                              changeItem(item.id, {
                                dietary: event.target.checked
                                  ? [...item.dietary, tag]
                                  : item.dietary.filter(
                                      (value) => value !== tag,
                                    ),
                              })
                            }
                          />
                          {tag}
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() =>
                    change({
                      items: menu.items.filter((value) => value.id !== item.id),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </section>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <div className="editor-save">
            <p>
              <CheckCircle2 size={17} /> Published menus are visible to all
              teachers.
            </p>
            <div>
              <button
                type="button"
                className="button secondary"
                onClick={() => void save("draft")}
                disabled={busy || reading}
              >
                <Save size={16} /> Save draft
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => void save("published")}
                disabled={busy || reading}
              >
                {busy ? "Saving…" : "Save & publish"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
      </fieldset>
    </section>
  );
}

export default function Admin({
  menus,
  refresh,
  staffName = "Culinary team",
}: {
  menus: Menu[];
  refresh: () => Promise<void>;
  staffName?: string;
}) {
  const [tab, setTab] = useState<"menus" | "orders">("menus");
  const [editing, setEditing] = useState<Menu | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterMenu, setFilterMenu] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  async function loadOrders() {
    setError("");
    setLoadingOrders(true);
    try {
      setOrders(await listOrders());
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoadingOrders(false);
    }
  }
  useEffect(() => {
    void loadOrders();
  }, []);
  async function changeStatus(order: Order, status: Order["status"]) {
    setBusy(true);
    setError("");
    try {
      await updateOrder(order.id, status);
      setOrders((previous) =>
        previous.map((value) =>
          value.id === order.id ? { ...value, status } : value,
        ),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function hideMenu(menu: Menu) {
    if (
      !window.confirm(
        "Unpublish this menu? Teachers will no longer be able to order from it. Existing orders are kept.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await unpublishMenu(menu);
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const filtered = orders.filter(
    (order) =>
      (filterMenu === "all" || order.menuId === filterMenu) &&
      (filterStatus === "all" || order.status === filterStatus),
  );
  const activeOrders = filtered.filter((order) => order.status !== "cancelled");
  const prep = new Map<string, number>();
  for (const order of activeOrders.filter(
    (order) => order.status !== "collected",
  ))
    for (const item of order.items)
      prep.set(item.name, (prep.get(item.name) || 0) + item.quantity);
  function exportOrders() {
    const url = URL.createObjectURL(
      new Blob([ordersCsv(filtered)], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cove-orders.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (editing)
    return (
      <MenuEditor
        key={editing.id}
        initial={editing}
        back={() => setEditing(null)}
        saved={refresh}
      />
    );
  return (
    <section className="admin">
      <div className="section-heading admin-heading">
        <div>
          <div className="eyebrow">BEHIND THE COUNTER</div>
          <h1>Welcome, {staffName}.</h1>
          <p>A good service starts with a little preparation.</p>
        </div>
        <button
          className="button primary"
          onClick={() => setEditing(newMenu())}
        >
          <Plus size={17} /> Create a menu
        </button>
      </div>
      <div className="admin-tabs">
        <button
          className={tab === "menus" ? "active" : ""}
          onClick={() => setTab("menus")}
        >
          <UtensilsCrossed size={17} /> Menus <span>{menus.length}</span>
        </button>
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => {
            setTab("orders");
            void loadOrders();
          }}
        >
          <ClipboardList size={17} /> Orders{" "}
          <span>{orders.filter((order) => order.status === "new").length}</span>
        </button>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button className="text-button" onClick={() => void loadOrders()}>
            Retry loading orders
          </button>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {tab === "menus" ? (
        <div className="admin-menu-grid">
          {[...menus]
            .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
            .map((menu) => (
              <article className="admin-card menu-summary" key={menu.id}>
                <div className="menu-summary-top">
                  <span
                    className={`badge ${menu.status === "published" ? "green" : ""}`}
                  >
                    {menu.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span>{menu.items.length} items</span>
                </div>
                <h2>{menu.title}</h2>
                <p>{displayDate(menu.serviceDate)}</p>
                <p className="fine-print">
                  {displayTime(menu.pickupStart)} –{" "}
                  {displayTime(menu.pickupEnd)} · {menu.location}
                </p>
                <div className="menu-summary-actions">
                  <button
                    className="button secondary"
                    onClick={() => setEditing(menu)}
                  >
                    Edit menu <ArrowRight size={15} />
                  </button>
                  {menu.status === "published" && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void hideMenu(menu)}
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </article>
            ))}
          {!menus.length && (
            <div className="empty-panel">
              <FileText size={32} />
              <h2>Your first menu starts here.</h2>
              <p>
                Create a menu, add your dishes and publish when you’re ready.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="order-filters">
            <label>
              Menu
              <select
                value={filterMenu}
                onChange={(event) => setFilterMenu(event.target.value)}
              >
                <option value="all">All menus</option>
                {menus.map((menu) => (
                  <option value={menu.id} key={menu.id}>
                    {displayDate(menu.serviceDate)} — {menu.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="ready">Ready for pickup</option>
                <option value="collected">Collected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <div className="filter-actions">
              <button
                className="button secondary"
                onClick={() => void loadOrders()}
                disabled={loadingOrders}
              >
                <RefreshCw size={15} /> Refresh
              </button>
              <button
                className="button secondary"
                disabled={!filtered.length || loadingOrders}
                onClick={exportOrders}
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
          <div className="order-stats">
            <div>
              <span>Orders</span>
              <strong>{activeOrders.length}</strong>
            </div>
            <div>
              <span>Items ordered</span>
              <strong>
                {activeOrders.reduce(
                  (sum, order) =>
                    sum +
                    order.items.reduce((sum, item) => sum + item.quantity, 0),
                  0,
                )}
              </strong>
            </div>
            <div>
              <span>Pay-at-pickup total</span>
              <strong>
                {money(
                  activeOrders.reduce((sum, order) => sum + order.total, 0),
                )}
              </strong>
            </div>
          </div>
          {prep.size > 0 && (
            <div className="prep-summary">
              <strong>
                Kitchen prep <span>(new & ready orders in this view)</span>
              </strong>
              <div>
                {[...prep].map(([name, count]) => (
                  <span key={name}>
                    <b>{count}×</b> {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {loadingOrders ? (
            <div className="loading" role="status">
              Checking the order board…
            </div>
          ) : !filtered.length ? (
            <div className="empty-panel">
              <ClipboardList size={34} />
              <h2>No orders on the board.</h2>
              <p>
                Orders will appear here as teachers place them. Use Refresh to
                check for new orders.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {filtered.map((order) => (
                <article className="admin-card order-card" key={order.id}>
                  <div className="order-card-top">
                    <div>
                      <span className="order-ref">{order.reference}</span>
                      <h3>{order.teacherName}</h3>
                      <p>
                        {order.email}
                        {order.room && ` · ${order.room}`}
                      </p>
                    </div>
                    <label className="status-select">
                      Order status
                      <select
                        aria-label={`Status for ${order.reference}`}
                        disabled={busy}
                        value={order.status}
                        onChange={(event) =>
                          void changeStatus(
                            order,
                            event.target.value as Order["status"],
                          )
                        }
                      >
                        <option value="new">New</option>
                        <option value="ready">Ready for pickup</option>
                        <option value="collected">Collected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </div>
                  <p className="fine-print">
                    {order.menuTitle} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <div className="order-lines">
                    {order.items.map((item) => (
                      <div key={item.itemId}>
                        <span>
                          <b>{item.quantity}×</b> {item.name}
                        </span>
                        <strong>{money(item.quantity * item.unitPrice)}</strong>
                      </div>
                    ))}
                  </div>
                  {order.note && (
                    <p className="order-note">
                      <strong>Teacher meal request:</strong> {order.note}
                    </p>
                  )}
                  <div className="order-card-total">
                    <span>
                      {order.status === "cancelled"
                        ? "Cancelled total"
                        : "Amount due at pickup"}
                    </span>
                    <strong>{money(order.total)}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
