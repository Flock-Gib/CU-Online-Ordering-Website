import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Leaf,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { FoodArt } from "./Artwork";
import {
  cartLines,
  customerSchema,
  displayDate,
  displayTime,
  isOpen,
  money,
} from "./model";
import type { Cart, Customer, Menu, Order } from "./model";
import { placeOrder } from "./repository";

export default function Storefront({
  menus,
  refresh,
}: {
  menus: Menu[];
  refresh: () => Promise<void>;
}) {
  const published = menus
    .filter((menu) => menu.status === "published")
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  const [selectedId, setSelectedId] = useState("");
  const menu =
    published.find((menu) => menu.id === selectedId) ||
    published.find((menu) => isOpen(menu)) ||
    published.at(-1);
  const [cart, setCart] = useState<Cart>({});
  const [category, setCategory] = useState("All items");
  const [search, setSearch] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState<Customer>({
    teacherName: "",
    email: "",
    room: "",
    note: "",
  });
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [receiptMenu, setReceiptMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const requestId = useRef(crypto.randomUUID());
  const cartRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setCart({});
    setCategory("All items");
    setCheckout(false);
    setError("");
    requestId.current = crypto.randomUUID();
  }, [menu?.id]);
  useEffect(() => {
    if (!menu) return;
    setCart((previous) => {
      const entries = Object.entries(previous).filter(([id]) =>
        menu.items.some((item) => item.id === id && item.available),
      );
      if (entries.length === Object.keys(previous).length) return previous;
      requestId.current = crypto.randomUUID();
      setError(
        "Unavailable items were removed from your order. Please review before continuing.",
      );
      return Object.fromEntries(entries);
    });
  }, [menu]);

  const open = menu ? isOpen(menu, now) : false;
  const count = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const total =
    menu?.items.reduce(
      (sum, item) => sum + item.price * (cart[item.id] || 0),
      0,
    ) || 0;
  const categories = [
    "All items",
    ...new Set(menu?.items.map((item) => item.category)),
  ];
  const visible =
    menu?.items.filter(
      (item) =>
        (category === "All items" || item.category === category) &&
        `${item.name} ${item.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];

  function adjust(id: string, delta: number) {
    if (busy) return;
    setError("");
    requestId.current = crypto.randomUUID();
    setCart((previous) => {
      const quantity = (previous[id] || 0) + delta;
      if (
        quantity > 20 ||
        (delta > 0 && Object.values(previous).reduce((a, b) => a + b, 0) >= 60)
      ) {
        setError("Orders are limited to 20 of each item and 60 items total.");
        return previous;
      }
      const next = { ...previous };
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!menu || busy) return;
    setBusy(true);
    setError("");
    try {
      const details = customerSchema.safeParse(customer);
      if (!details.success) throw new Error(details.error.issues[0].message);
      cartLines(menu, cart);
      const order = await placeOrder(
        menu,
        cart,
        details.data,
        requestId.current,
      );
      setReceipt(order);
      setReceiptMenu(menu);
      setCart({});
      setCheckout(false);
      setCustomer({ teacherName: "", email: "", room: "", note: "" });
      requestId.current = crypto.randomUUID();
      cartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your order could not be placed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" /> STUDENT MADE. SCHOOL LOVED.
          </div>
          <h1>
            A good lunch.
            <br />
            An even better <em>cause.</em>
          </h1>
          <p>
            Fresh meals, real-world learning. Order something delicious and
            support our student chefs, one lunch at a time.
          </p>
          <a className="button primary" href="#menu">
            Explore the menu <ArrowRight size={17} />
          </a>
          <span className="hero-note">
            <CheckCircle2 size={15} /> Order here. Pay at the Cove.
          </span>
        </div>
        <div className="hero-visual">
          <span className="hero-circle" />
          <span className="handwritten">
            a little lunch,
            <br />a lot of heart.
          </span>
          <FoodArt name="chicken bowl" hero />
          <span className="made-badge">
            <Leaf size={21} />
            <span>
              FRESH FROM
              <br />
              <strong>our student kitchen</strong>
            </span>
          </span>
          <span className="hero-spark spark-one">✦</span>
          <span className="hero-spark spark-two">✧</span>
        </div>
      </section>
      <div className="how-strip" aria-label="How ordering works">
        <span>
          <b>01</b> Pick your favorites
        </span>
        <span>
          <b>02</b> Place your order
        </span>
        <span>
          <b>03</b> Pick up & pay at the Cove <Check size={15} />
        </span>
      </div>
      <div className="store-layout" id="menu">
        <section className="menu-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE COVE KITCHEN</div>
              <h2>What’s cooking?</h2>
            </div>
            <button className="text-button" onClick={() => void refresh()}>
              Refresh menu
            </button>
          </div>
          {menu ? (
            <>
              <div className="service-info">
                <div>
                  <span className={`status-dot ${open ? "" : "closed"}`} />
                  <strong>{open ? "Taking orders" : "Ordering closed"}</strong>
                  <span className="info-divider" />
                  <span>{displayDate(menu.serviceDate)}</span>
                </div>
                <p>
                  <Clock3 size={14} />{" "}
                  {open ? (
                    <>
                      Order by{" "}
                      {new Date(menu.orderDeadline).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </>
                  ) : (
                    "Check back for our next menu."
                  )}
                </p>
              </div>
              {published.length > 1 && (
                <label className="menu-select">
                  Choose a menu
                  <select
                    value={menu.id}
                    onChange={(event) => setSelectedId(event.target.value)}
                    disabled={busy}
                  >
                    {published.map((value) => (
                      <option key={value.id} value={value.id}>
                        {displayDate(value.serviceDate)} — {value.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <h3 className="menu-title">{menu.title}</h3>
              <div className="menu-toolbar">
                <div className="tabs" aria-label="Menu categories">
                  {categories.map((value) => (
                    <button
                      key={value}
                      className={category === value ? "active" : ""}
                      onClick={() => setCategory(value)}
                      aria-pressed={category === value}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find a favorite…"
                    aria-label="Search menu"
                  />
                </label>
              </div>
              <div className="food-grid">
                {visible.map((item) => (
                  <article
                    className={`food-card ${!item.available ? "unavailable" : ""}`}
                    key={item.id}
                  >
                    <div
                      className={`food-picture tone-${/sweet|dessert/i.test(item.category) ? "peach" : /drink/i.test(item.category) ? "sand" : "sage"}`}
                    >
                      <FoodArt name={item.name} />
                      <span className="picture-label">{item.category}</span>
                      {!item.available && (
                        <span className="sold-out">Sold out</span>
                      )}
                    </div>
                    <div className="food-details">
                      <div className="dietary-tags">
                        {item.dietary.map((tag) => (
                          <span key={tag}>
                            <Leaf size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3>{item.name}</h3>
                      <p>
                        {item.description ||
                          "Freshly prepared by our student chefs."}
                      </p>
                      <div className="food-bottom">
                        <strong>{money(item.price)}</strong>
                        {cart[item.id] ? (
                          <div className="quantity">
                            <button
                              aria-label={`Remove one ${item.name}`}
                              onClick={() => adjust(item.id, -1)}
                              disabled={busy}
                            >
                              <Minus size={14} />
                            </button>
                            <span aria-live="polite">{cart[item.id]}</span>
                            <button
                              aria-label={`Add one ${item.name}`}
                              onClick={() => adjust(item.id, 1)}
                              disabled={!open || !item.available || busy}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="add-button"
                            onClick={() => adjust(item.id, 1)}
                            disabled={!open || !item.available || busy}
                            aria-label={`Add ${item.name}`}
                          >
                            <Plus size={16} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!visible.length && (
                <div className="empty-panel">
                  <Search />
                  <h3>No matching bites</h3>
                  <p>Try another search or category.</p>
                </div>
              )}
              <div className="allergy-note">
                <Leaf size={18} />
                <p>
                  {menu.notes ||
                    "Food is prepared in a shared teaching kitchen. Please speak with culinary staff about allergies before placing your order."}
                  <br />
                  <strong>
                    Dietary labels are not an allergen-free guarantee.
                  </strong>
                </p>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <UtensilsCrossed size={34} />
              <h3>Something good is on its way.</h3>
              <p>
                Our student chefs haven’t published a menu yet. Please check
                back soon.
              </p>
            </div>
          )}
        </section>
        <aside className="order-sidebar" id="your-order" ref={cartRef}>
          {receipt ? (
            <div className="receipt">
              <span className="success-icon">
                <Check size={28} />
              </span>
              <div className="eyebrow">ORDER RECEIVED</div>
              <h2>Lunch, sorted.</h2>
              <p>
                Your order is with the culinary team. Save this confirmation for
                pickup.
              </p>
              <div className="receipt-code">{receipt.reference}</div>
              <p>
                <strong>{receipt.teacherName}</strong>
                <br />
                {receiptMenu && displayDate(receiptMenu.serviceDate)}
                <br />
                {receiptMenu &&
                  `${displayTime(receiptMenu.pickupStart)} – ${displayTime(receiptMenu.pickupEnd)}`}
                <br />
                {receiptMenu?.location}
              </p>
              <div className="receipt-items">
                {receipt.items.map((item) => (
                  <div key={item.itemId}>
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <strong>{money(item.quantity * item.unitPrice)}</strong>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Pay at pickup</span>
                <strong>{money(receipt.total)}</strong>
              </div>
              <p className="fine-print">
                No payment was collected. Questions or changes? Contact the
                culinary staff directly. No email confirmation is sent.
              </p>
              <button
                className="button primary full"
                onClick={() => setReceipt(null)}
              >
                Back to the menu <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="cart-panel">
              <div className="cart-heading">
                <h2>Your order</h2>
                <span className="cart-count">{count}</span>
              </div>
              {!count ? (
                <div className="empty-cart">
                  <div className="bag-circle">
                    <ShoppingBag size={33} strokeWidth={1.3} />
                    <span>+</span>
                  </div>
                  <h3>Good things start here.</h3>
                  <p>
                    Add a little something from the menu.
                    <br />
                    Your lunch break will thank you.
                  </p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {menu?.items
                      .filter((item) => cart[item.id])
                      .map((item) => (
                        <div className="cart-line" key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            <span>{money(item.price)} each</span>
                            <div className="quantity">
                              <button
                                aria-label={`Decrease ${item.name} in order`}
                                onClick={() => adjust(item.id, -1)}
                                disabled={busy}
                              >
                                <Minus size={12} />
                              </button>
                              <span>{cart[item.id]}</span>
                              <button
                                aria-label={`Increase ${item.name} in order`}
                                onClick={() => adjust(item.id, 1)}
                                disabled={!open || !item.available || busy}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                          <strong>{money(item.price * cart[item.id])}</strong>
                        </div>
                      ))}
                  </div>
                  <div className="cart-total">
                    <span>Total at pickup</span>
                    <strong>{money(total)}</strong>
                  </div>
                  {checkout ? (
                    <form onSubmit={submit} className="checkout-form">
                      <h3>Who’s picking up?</h3>
                      <label>
                        Full name
                        <input
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="name"
                          value={customer.teacherName}
                          onChange={(event) => {
                            requestId.current = crypto.randomUUID();
                            setCustomer({
                              ...customer,
                              teacherName: event.target.value,
                            });
                          }}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        School email
                        <input
                          type="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          value={customer.email}
                          onChange={(event) => {
                            requestId.current = crypto.randomUUID();
                            setCustomer({
                              ...customer,
                              email: event.target.value,
                            });
                          }}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        Room / department{" "}
                        <span className="optional">(optional)</span>
                        <input
                          maxLength={60}
                          value={customer.room}
                          onChange={(event) => {
                            requestId.current = crypto.randomUUID();
                            setCustomer({
                              ...customer,
                              room: event.target.value,
                            });
                          }}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        Meal changes or requests{" "}
                        <span className="optional">(optional)</span>
                        <textarea
                          rows={3}
                          maxLength={500}
                          placeholder="For example: no ketchup, no bacon, or dressing on the side."
                          aria-describedby="meal-request-help"
                          value={customer.note}
                          onChange={(event) => {
                            requestId.current = crypto.randomUUID();
                            setCustomer({
                              ...customer,
                              note: event.target.value,
                            });
                          }}
                          disabled={busy}
                        />
                      </label>
                      <p className="fine-print" id="meal-request-help">
                        Requests are open response and will be passed to the
                        kitchen. We’ll do our best, but changes aren’t
                        guaranteed. For allergy concerns, contact culinary staff
                        directly; this form isn’t an allergy-safety request.
                      </p>
                      <button
                        className="button primary full"
                        disabled={!open || busy}
                      >
                        {busy ? "Placing order…" : "Place order"}{" "}
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        className="text-button full"
                        disabled={busy}
                        onClick={() => setCheckout(false)}
                      >
                        Back to your order
                      </button>
                    </form>
                  ) : (
                    <button
                      className="button primary full"
                      disabled={!open}
                      onClick={() => setCheckout(true)}
                    >
                      Continue to order <ArrowRight size={17} />
                    </button>
                  )}
                </>
              )}
              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}
              <div className="pay-note">
                <CheckCircle2 size={15} />
                <span>
                  No online payment.
                  <br />
                  <strong>Just pay when you pick up.</strong>
                </span>
              </div>
              {menu && (
                <div className="pickup-card">
                  <MapPin size={18} />
                  <div>
                    <strong>See you at {menu.location}</strong>
                    <span>{displayDate(menu.serviceDate)}</span>
                    <span>
                      {displayTime(menu.pickupStart)} –{" "}
                      {displayTime(menu.pickupEnd)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="student-note">
            <UtensilsCrossed size={21} />
            <p>
              More than a meal.
              <br />
              <span>
                Every order helps our students build skills for a bright future.
              </span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
