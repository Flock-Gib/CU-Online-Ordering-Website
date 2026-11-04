import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  LogOut,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import Admin from "./Admin";
import Storefront from "./Storefront";
import {
  configError,
  demoMode,
  listMenus,
  resetDemo,
  supabase,
} from "./repository";
import type { Menu } from "./model";

function Login({
  signedIn,
  onDemo,
}: {
  signedIn: boolean;
  onDemo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!supabase) throw new Error("The ordering service is not configured.");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="login-panel">
      <div className="login-icon">
        <ChefHat size={35} />
      </div>
      <div className="eyebrow">BEHIND THE COUNTER</div>
      <h1>The kitchen starts here.</h1>
      <p>
        Manage your menus, keep an eye on orders,
        <br />
        and make lunch happen.
      </p>
      {demoMode ? (
        <>
          <div className="alert">
            You’re in the local demo. Explore the admin tools without signing
            in. Changes and practice orders stay in this browser only.
          </div>
          <button className="button primary full" onClick={onDemo}>
            Explore demo admin <ArrowRight size={17} />
          </button>
        </>
      ) : signedIn ? (
        <div className="alert error" role="alert">
          This account is not authorized as culinary staff. Ask your site
          administrator to add you to the staff list.
        </div>
      ) : (
        <form onSubmit={signIn} className="stack-form">
          <label>
            Staff email
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
          </button>
          <p className="fine-print">
            Staff accounts are provided by your site administrator. Contact them
            for access or a password reset.
          </p>
        </form>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<"store" | "admin">("store");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);
  const [checkingStaff, setCheckingStaff] = useState(false);
  const [demoStaff, setDemoStaff] = useState(false);
  const refresh = useCallback(async () => {
    setError("");
    try {
      setMenus(await listMenus());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The menu could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setUserId(data.session?.user.id || null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!userId || !supabase) {
      setStaff(false);
      setCheckingStaff(false);
      return;
    }
    setCheckingStaff(true);
    void supabase
      .from("culinary_staff")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setCheckingStaff(false);
        if (error) setError(error.message);
        setStaff(!!data && !error);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh, staff]);

  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        return;
      }
    }
    setDemoStaff(false);
    setStaff(false);
    setUserId(null);
    setView("store");
    await refresh();
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>Made by students. Enjoyed by our school community.</span>
        <span>
          A little taste of what we’re learning{" "}
          <span aria-hidden="true">↗</span>
        </span>
      </div>
      <header className="site-header">
        <button
          className="brand"
          aria-label="The Cove home"
          onClick={() => setView("store")}
        >
          <span className="brand-mark">
            <UtensilsCrossed size={26} strokeWidth={1.5} />
          </span>
          <span className="brand-name">
            the cove<span>CULINARY STUDENT KITCHEN</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === "store" ? "nav-active" : ""}
            onClick={() => setView("store")}
          >
            Our menu
          </button>
          <button
            className={`staff-link ${view === "admin" ? "nav-active" : ""}`}
            onClick={() => setView("admin")}
          >
            <ChefHat size={16} /> Culinary staff
          </button>
          {(userId || demoStaff) && (
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut size={17} />
            </button>
          )}
          <a
            className="header-order"
            href={view === "store" ? "#your-order" : "#main"}
            onClick={() => setView("store")}
          >
            <ShoppingBag size={17} />
            <span>Your order</span>
          </a>
        </nav>
      </header>
      {demoMode && (
        <div className="demo-banner">
          <span>
            <strong>Demo kitchen</strong> · Try the menus and ordering. Nothing
            is sent to the school.
          </span>
          <button
            onClick={() => {
              if (window.confirm("Reset all local demo menus and orders?")) {
                resetDemo();
                window.location.reload();
              }
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      <main id="main">
        {configError ? (
          <div className="alert error" role="alert">
            {configError}
          </div>
        ) : (
          <>
            {error && (
              <div className="alert error global-error" role="alert">
                {error}
                <button className="text-button" onClick={() => void refresh()}>
                  Try again
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading" role="status">
                Getting the kitchen ready…
              </div>
            ) : view === "store" ? (
              <Storefront menus={menus} refresh={refresh} />
            ) : (
              <>
                <button
                  className="text-button back-link"
                  onClick={() => setView("store")}
                >
                  <ArrowLeft size={15} /> Back to the menu
                </button>
                {checkingStaff ? (
                  <div className="loading" role="status">
                    Checking staff access…
                  </div>
                ) : staff || demoStaff ? (
                  <Admin menus={menus} refresh={refresh} />
                ) : (
                  <Login
                    signedIn={!!userId}
                    onDemo={() => setDemoStaff(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          <UtensilsCrossed size={19} />
          <strong>the cove</strong>
          <span>Good food. Great potential.</span>
        </div>
        <span>Crafted with care by our culinary department.</span>
      </footer>
    </>
  );
}
