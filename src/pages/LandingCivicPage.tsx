import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  Landmark,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Network,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { useHrAdmin } from "../hooks/useHrAdmin";
import "./LandingCivicPage.css";

type LandingTheme = "light" | "dark";

type LandingAuthState = {
  user: { email?: string | null } | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string | null;
  signOut: () => Promise<{ error: unknown | null }>;
};

type PortalActionProps = {
  className: string;
  label: string;
  pending: boolean;
  to: string;
};

const LANDING_THEME_KEY = "gdt_landing_theme";

const MODULE_LINKS = [
  {
    labelKm: "បញ្ជីបុគ្គលិក",
    labelEn: "Staff Directory",
    description: "One shared personnel directory",
    path: "/admin/staff",
    icon: UsersRound,
  },
  {
    labelKm: "រចនាសម្ព័ន្ធអង្គភាព",
    labelEn: "Organization",
    description: "Departments, offices, reporting lines",
    path: "/admin/org-structure",
    icon: Network,
  },
  {
    labelKm: "រចនាសម្ព័ន្ធមុខតំណែង",
    labelEn: "Job Architecture",
    description: "Titles, skills, role requirements",
    path: "/admin/job-architecture",
    icon: BriefcaseBusiness,
  },
] as const;

const NAV_LINKS = [
  {
    labelKm: "ទិដ្ឋភាពទូទៅ",
    labelEn: "Overview",
    path: "/admin",
    icon: LayoutDashboard,
  },
  ...MODULE_LINKS,
] as const;

function getInitialLandingTheme(): LandingTheme {
  try {
    return window.localStorage.getItem(LANDING_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function PortalAction({ className, label, pending, to }: PortalActionProps) {
  if (pending) {
    return (
      <button className={className} type="button" disabled aria-busy="true">
        <Loader2 size={16} className="lc-spin" aria-hidden="true" />
        Checking access
      </button>
    );
  }

  return (
    <Link className={className} to={to}>
      <span>{label}</span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

export default function LandingCivicPage() {
  const auth = useAuth() as unknown as LandingAuthState;
  const {
    user,
    loading: authLoading,
    displayName,
    avatarUrl,
    signOut,
  } = auth;
  const { isHrAdmin, loading: hrLoading, error: hrAccessError } = useHrAdmin();
  const navigate = useNavigate();

  const [landingTheme, setLandingTheme] = useState<LandingTheme>(getInitialLandingTheme);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const profileId = useId();
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANDING_THEME_KEY, landingTheme);
    } catch {
      // Theme persistence is optional; the preview still works without storage.
    }
  }, [landingTheme]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const rolePending = Boolean(user) && hrLoading;
  const accessPending = authLoading || rolePending;
  const portalPath = !user ? "/login" : isHrAdmin ? "/admin" : "/dashboard";
  const headerPortalLabel = !user ? "Sign in" : isHrAdmin ? "Open portal" : "My charts";
  const heroPortalLabel = !user
    ? "Sign in to the portal"
    : isHrAdmin
      ? "Open the portal"
      : "Open my charts";
  const structurePath = accessPending
    ? null
    : !user
      ? "/login"
      : isHrAdmin
        ? "/admin/org-structure"
        : null;
  const themeActionLabel =
    landingTheme === "dark" ? "Switch to light appearance" : "Switch to dark appearance";
  const logoPath = "/GDT-Logo (Light).png";

  const toggleTheme = () => {
    setLandingTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const adminDestination = (path: string) => {
    if (authLoading) return null;
    if (!user) return "/login";
    if (hrLoading || !isHrAdmin) return null;
    return path;
  };

  const closeMenus = () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await signOut();
      if (error) {
        setSignOutError("We could not sign you out. Check your connection and try again.");
        return;
      }

      closeMenus();
      navigate("/login", { replace: true });
    } catch {
      setSignOutError("We could not sign you out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const avatar = avatarUrl && !avatarFailed ? (
    <img
      src={avatarUrl}
      alt=""
      className="lc-avatar-image"
      referrerPolicy="no-referrer"
      onError={() => setAvatarFailed(true)}
    />
  ) : (
    <span className="lc-avatar-fallback" aria-hidden="true">
      {(displayName || "U").charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="landing-civic-page" data-landing-theme={landingTheme} lang="en">
      <header className="lc-header">
        <div className="lc-header-inner">
          <Link to="/" className="lc-brand" aria-label="GDT organizational chart home">
            <img
              src={logoPath}
              alt="GDT — General Department of Taxation"
              width="639"
              height="124"
            />
          </Link>

          <nav className="lc-desktop-nav" aria-label="Administrative areas">
            {NAV_LINKS.map((item) => {
              const destination = adminDestination(item.path);
              return destination ? (
                <Link key={item.labelEn} to={destination} className="lc-nav-link">
                  {item.labelEn}
                </Link>
              ) : (
                <span
                  key={item.labelEn}
                  className="lc-nav-link lc-nav-link-disabled"
                  aria-disabled="true"
                  title="Requires HR administrator access"
                >
                  {item.labelEn}
                </span>
              );
            })}
          </nav>

          <div className="lc-header-actions">
            <button
              type="button"
              className="lc-icon-button lc-desktop-theme-toggle"
              onClick={toggleTheme}
              aria-label={themeActionLabel}
              title={themeActionLabel}
            >
              {landingTheme === "dark" ? (
                <Sun size={17} aria-hidden="true" />
              ) : (
                <Moon size={17} aria-hidden="true" />
              )}
            </button>

            {!authLoading && user && (
              <div
                className="lc-profile"
                ref={profileRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setProfileOpen(false);
                  }
                }}
              >
                <button
                  ref={profileButtonRef}
                  type="button"
                  className="lc-profile-trigger"
                  aria-expanded={profileOpen}
                  aria-controls={profileId}
                  onClick={() => {
                    setSignOutError("");
                    setProfileOpen((open) => !open);
                  }}
                >
                  <span className="lc-avatar">{avatar}</span>
                  <span className="lc-profile-name">{displayName}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>

                {profileOpen && (
                  <div id={profileId} className="lc-profile-popover" aria-label="Account options">
                    <div className="lc-profile-identity">
                      <span className="lc-avatar lc-avatar-large">{avatar}</span>
                      <div>
                        <strong>{displayName}</strong>
                        <span>{user.email || "Signed-in account"}</span>
                      </div>
                    </div>

                    <div className="lc-profile-links">
                      <Link to="/dashboard" onClick={closeMenus}>
                        <LayoutDashboard size={16} aria-hidden="true" />
                        My charts
                      </Link>
                      <Link to="/profile" onClick={closeMenus}>
                        <Settings2 size={16} aria-hidden="true" />
                        Profile settings
                      </Link>
                      {isHrAdmin && (
                        <Link to="/admin" onClick={closeMenus}>
                          <Building2 size={16} aria-hidden="true" />
                          Admin portal
                        </Link>
                      )}
                      <button type="button" onClick={toggleTheme}>
                        {landingTheme === "dark" ? (
                          <Sun size={16} aria-hidden="true" />
                        ) : (
                          <Moon size={16} aria-hidden="true" />
                        )}
                        {themeActionLabel}
                      </button>
                    </div>

                    <div className="lc-profile-footer">
                      <button
                        type="button"
                        className="lc-sign-out"
                        onClick={handleSignOut}
                        disabled={signingOut}
                      >
                        {signingOut ? (
                          <Loader2 size={16} className="lc-spin" aria-hidden="true" />
                        ) : (
                          <LogOut size={16} aria-hidden="true" />
                        )}
                        {signingOut ? "Signing out…" : "Sign out"}
                      </button>
                      {signOutError && (
                        <p className="lc-account-error" role="alert">
                          {signOutError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <PortalAction
              className="lc-header-portal"
              label={headerPortalLabel}
              pending={accessPending}
              to={portalPath}
            />

            <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DialogTrigger asChild>
                <button type="button" className="lc-mobile-trigger" aria-label="Open navigation">
                  <Menu size={20} aria-hidden="true" />
                </button>
              </DialogTrigger>
              <DialogContent
                className="landing-civic-mobile-sheet"
                data-landing-theme={landingTheme}
              >
                <div className="lc-mobile-sheet-header">
                  <img src={logoPath} alt="GDT — General Department of Taxation" />
                  <DialogTitle>Navigation</DialogTitle>
                  <DialogDescription className="lc-visually-hidden">
                    Navigate to GDT work areas and account settings.
                  </DialogDescription>
                </div>

                <nav className="lc-mobile-nav" aria-label="Mobile administrative areas">
                  {NAV_LINKS.map((item) => {
                    const Icon = item.icon;
                    const destination = adminDestination(item.path);
                    return destination ? (
                      <Link key={item.labelEn} to={destination} onClick={closeMenus}>
                        <Icon size={18} aria-hidden="true" />
                        <span>
                          <strong lang="km">{item.labelKm}</strong>
                          <small>{item.labelEn}</small>
                        </span>
                        <ChevronRight size={16} className="lc-mobile-link-end" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span key={item.labelEn} className="lc-mobile-nav-disabled" aria-disabled="true">
                        <Icon size={18} aria-hidden="true" />
                        <span>
                          <strong lang="km">{item.labelKm}</strong>
                          <small>{item.labelEn}</small>
                        </span>
                        <LockKeyhole size={15} className="lc-mobile-link-end" aria-hidden="true" />
                      </span>
                    );
                  })}
                </nav>

                <div className="lc-mobile-account">
                  <button type="button" className="lc-mobile-theme" onClick={toggleTheme}>
                    {landingTheme === "dark" ? (
                      <Sun size={17} aria-hidden="true" />
                    ) : (
                      <Moon size={17} aria-hidden="true" />
                    )}
                    {themeActionLabel}
                  </button>

                  {!authLoading && user ? (
                    <>
                      <div className="lc-mobile-identity">
                        <span className="lc-avatar lc-avatar-large">{avatar}</span>
                        <div>
                          <strong>{displayName}</strong>
                          <span>{user.email || "Signed-in account"}</span>
                        </div>
                      </div>
                      <Link to="/dashboard" onClick={closeMenus} className="lc-mobile-account-link">
                        <LayoutDashboard size={17} aria-hidden="true" />
                        My charts
                      </Link>
                      <Link to="/profile" onClick={closeMenus} className="lc-mobile-account-link">
                        <Settings2 size={17} aria-hidden="true" />
                        Profile settings
                      </Link>
                      {isHrAdmin && (
                        <Link to="/admin" onClick={closeMenus} className="lc-mobile-account-link">
                          <Building2 size={17} aria-hidden="true" />
                          Admin portal
                        </Link>
                      )}
                      {hrAccessError && (
                        <p className="lc-access-notice" role="status">
                          Admin access could not be verified. My charts remains available.
                        </p>
                      )}
                      <button
                        type="button"
                        className="lc-mobile-sign-out"
                        onClick={handleSignOut}
                        disabled={signingOut}
                      >
                        {signingOut ? (
                          <Loader2 size={17} className="lc-spin" aria-hidden="true" />
                        ) : (
                          <LogOut size={17} aria-hidden="true" />
                        )}
                        {signingOut ? "Signing out…" : "Sign out"}
                      </button>
                      {signOutError && (
                        <p className="lc-account-error" role="alert">
                          {signOutError}
                        </p>
                      )}
                    </>
                  ) : (
                    <PortalAction
                      className="lc-mobile-portal"
                      label="Sign in to the portal"
                      pending={authLoading}
                      to="/login"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main>
        <section className="lc-hero" aria-labelledby="lc-hero-title">
          <div className="lc-hero-copy">
            <span className="lc-hero-eyebrow">GENERAL DEPARTMENT OF TAXATION</span>
            <h1 id="lc-hero-title" className="lc-hero-title">
              <span lang="km" className="lc-hero-title-kh">
                រចនាសម្ព័ន្ធតែមួយ<br />តួនាទីគ្រប់គ្រងទូទាំង
              </span>
              <span className="lc-hero-title-en">
                One structure.<br />Every role in view.
              </span>
            </h1>
            <div className="lc-hero-actions">
              <PortalAction
                className="lc-primary-action"
                label={heroPortalLabel}
                pending={accessPending}
                to={portalPath}
              />
              {accessPending ? (
                <button type="button" className="lc-secondary-action" disabled aria-busy="true">
                  <Loader2 size={16} className="lc-spin" aria-hidden="true" />
                  Checking access
                </button>
              ) : structurePath ? (
                <Link to={structurePath} className="lc-secondary-action">
                  <span>See the structure</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <span className="lc-secondary-action lc-secondary-disabled" aria-disabled="true">
                  <LockKeyhole size={15} aria-hidden="true" />
                  Admin structure
                </span>
              )}
            </div>
          </div>

          <figure className="lc-hero-media">
            <img
              src="/building-city.png"
              alt="General Department of Taxation headquarters in Phnom Penh"
              width="860"
              height="574"
              fetchPriority="high"
              decoding="async"
            />
            <figcaption>
              <span lang="km">អគ្គនាយកដ្ឋានពន្ធដារ</span>
              <span>Phnom Penh, Cambodia</span>
            </figcaption>
          </figure>
        </section>

        <section className="lc-module-ribbon" aria-labelledby="lc-modules-heading">
          <h2 id="lc-modules-heading" className="lc-visually-hidden">
            Explore the connected GDT work areas
          </h2>
          <div className="lc-ribbon-grid">
            {MODULE_LINKS.map((item, index) => {
              const Icon = item.icon;
              const destination = adminDestination(item.path);
              const isActive = index === 1;
              const content = (
                <>
                  {isActive && <div className="lc-module-wedge" aria-hidden="true" />}
                  <span className="lc-module-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon size={28} strokeWidth={1.6} className="lc-module-icon" aria-hidden="true" />
                  <span className="lc-module-copy">
                    <span>{item.labelEn}</span>
                    <small>{item.description}</small>
                  </span>
                  {destination ? (
                    <ChevronRight size={18} className="lc-module-end" aria-hidden="true" />
                  ) : (
                    <LockKeyhole size={17} className="lc-module-end" aria-hidden="true" />
                  )}
                </>
              );

              return destination ? (
                <Link
                  key={item.labelEn}
                  className={`lc-module ${isActive ? "lc-module-active" : ""}`}
                  to={destination}
                >
                  {content}
                </Link>
              ) : (
                <span
                  key={item.labelEn}
                  className={`lc-module lc-module-disabled ${isActive ? "lc-module-active" : ""}`}
                  aria-disabled="true"
                  title="Requires HR administrator access"
                >
                  {content}
                </span>
              );
            })}
          </div>
        </section>

        <section className="lc-proof" id="structure" aria-labelledby="lc-proof-heading">
          <h2 id="lc-proof-heading" className="lc-visually-hidden">
            How the organization is structured, and how privacy is protected
          </h2>
          <div className="lc-proof-inner">
            <div className="lc-proof-item">
              <div className="lc-proof-icon-badge">
                <Landmark size={22} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="lc-proof-text-stack">
                <strong>Department</strong>
                <span>Browse departments across the organization</span>
              </div>
            </div>

            <ArrowRight size={18} className="lc-proof-arrow" aria-hidden="true" />

            <div className="lc-proof-item">
              <div className="lc-proof-icon-badge">
                <Building2 size={22} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="lc-proof-text-stack">
                <strong>Office</strong>
                <span>Explore offices and their functions</span>
              </div>
            </div>

            <ArrowRight size={18} className="lc-proof-arrow" aria-hidden="true" />

            <div className="lc-proof-item">
              <div className="lc-proof-icon-badge">
                <UserRound size={22} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="lc-proof-text-stack">
                <strong>Position</strong>
                <span>View positions and reporting relationships</span>
              </div>
            </div>

            <span className="lc-proof-divider" aria-hidden="true" />

            <div className="lc-proof-item">
              <div className="lc-proof-icon-badge">
                <ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="lc-proof-text-stack">
                <strong>Privacy enforced</strong>
                <span>Access is protected. Your data is secure.</span>
              </div>
            </div>

            <PortalAction
              className="lc-proof-action"
              label={heroPortalLabel}
              pending={accessPending}
              to={portalPath}
            />
          </div>
        </section>
      </main>

      <footer className="lc-footer">
        <div className="lc-footer-inner">
          <p>
            <strong lang="km">អគ្គនាយកដ្ឋានពន្ធដារ</strong>
            <span>General Department of Taxation</span>
          </p>
          <p>Ministry of Economy and Finance · Kingdom of Cambodia</p>
        </div>
      </footer>
    </div>
  );
}
