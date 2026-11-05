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
import { configError, listMenus, supabase } from "./repository";
import type { Menu } from "./model";

function Login({ signedIn }: { signedIn: boolean }) {
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
      <div className="eyebrow">CAPE COD TECH · CULINARY TEAM</div>
      <h1>Culinary team sign in.</h1>
      <p>
        Manage your menus, keep an eye on orders,
        <br />
        and make lunch happen.
      </p>
      {signedIn ? (
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
  const [staffName, setStaffName] = useState("Culinary team");
  const [staff, setStaff] = useState(false);
  const [checkingStaff, setCheckingStaff] = useState(false);
  const refresh = useCallback(async () => {
    if (configError) {
      setLoading(false);
      return;
    }
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
      else {
        const user = data.session?.user;
        setUserId(user?.id || null);
        const fullName = user?.user_metadata.full_name;
        setStaffName(
          typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : "Culinary team",
        );
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
      const fullName = session?.user.user_metadata.full_name;
      setStaffName(
        typeof fullName === "string" && fullName.trim()
          ? fullName.trim()
          : "Culinary team",
      );
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
    if (configError) {
      setLoading(false);
      return;
    }
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
    setStaff(false);
    setUserId(null);
    setStaffName("Culinary team");
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
          aria-label="Cape Cod Tech culinary home"
          onClick={() => setView("store")}
        >
          <span className="brand-mark" aria-hidden="true">
            CCT
          </span>
          <span className="brand-name">
            Cape Cod Tech<span>CULINARY DEPARTMENT</span>
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
            <ChefHat size={16} /> Culinary team
          </button>
          {userId && (
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
      <main id="main">
        {configError ? (
          <section className="setup-panel" aria-labelledby="setup-title">
            <div className="login-icon">
              <ChefHat size={35} />
            </div>
            <div className="eyebrow">CAPE COD TECH · CULINARY DEPARTMENT</div>
            {view === "admin" ? (
              <>
                <h1 id="setup-title">Set up the culinary admin.</h1>
                <p>
                  The admin tools are ready, but they need a shared place to
                  save menus and orders before staff can sign in.
                </p>
                <div className="setup-steps">
                  <strong>You can start for free</strong>
                  <span>
                    Create a school-owned Supabase project on its Free plan
                    ($0/month). No paid database plan is required to set it up.
                  </span>
                  <span>
                    Run <code>supabase/schema.sql</code> in its SQL Editor,
                    create culinary staff accounts and grant them access.
                  </span>
                  <span>
                    Add the project URL and public anon key to Render as
                    <code> VITE_SUPABASE_URL </code> and
                    <code> VITE_SUPABASE_ANON_KEY</code>, then redeploy.
                  </span>
                </div>
                <div className="setup-actions">
                  <a
                    className="button primary"
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Supabase <ArrowRight size={16} />
                  </a>
                  <a
                    className="button secondary"
                    href="https://github.com/Flock-Gib/CU-Online-Ordering-Website#configure-real-ordering-and-culinary-staff-access"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Step-by-step setup guide
                  </a>
                </div>
                <p className="fine-print">
                  No admin password has been created yet. Create a named school
                  staff account in Supabase; the website does not contain a
                  shared or default password.
                </p>
                <p className="setup-caveat">
                  Supabase’s Free plan may pause projects after inactivity. You
                  can resume them from its dashboard.
                </p>
              </>
            ) : (
              <>
                <h1 id="setup-title">Online ordering is being set up.</h1>
                <p>
                  The teacher menu and kitchen admin need a shared service so
                  menus and real orders are visible across devices.
                </p>
                <div className="setup-steps">
                  <strong>No paid database plan is required to start</strong>
                  <span>
                    The school can connect a Supabase Free plan project to this
                    static site.
                  </span>
                  <span>
                    After setup, culinary staff can upload a PDF or PNG menu or
                    enter dishes manually, then publish for teachers to order.
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setView("admin")}
                >
                  View culinary admin setup <ArrowRight size={16} />
                </button>
                <p className="fine-print">
                  No practice orders or sample menu data are shown.
                </p>
              </>
            )}
          </section>
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
                ) : staff ? (
                  <Admin
                    menus={menus}
                    refresh={refresh}
                    staffName={staffName}
                  />
                ) : (
                  <Login signedIn={!!userId} />
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          <UtensilsCrossed size={19} />
          <strong>Cape Cod Tech</strong>
          <span>Culinary Department</span>
        </div>
        <span>Cape Cod Regional Technical High School</span>
      </footer>
    </>
  );
}
