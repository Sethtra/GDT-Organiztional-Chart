import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Menu, Search, X } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";

interface AdminHeaderProps {
  mobileNavOpen: boolean;
  onOpenMobileNav: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  saving?: boolean;
}

export default function AdminHeader({
  mobileNavOpen,
  onOpenMobileNav,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  saving = false,
}: AdminHeaderProps) {
  const { user: authUser } = useAuth();
  const userEmail = (authUser as { email?: string } | null)?.email ?? null;
  const searchId = useId();
  const identityLabel = userEmail ?? "HR administrator";
  const identityInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "HR";

  return (
    <header className="z-30 shrink-0 border-b border-[var(--pa-border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[74px] w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 md:flex-nowrap md:py-0 lg:px-[46px]">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="pa-focus-ring flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-text)] transition-colors hover:bg-[var(--pa-surface-muted)] lg:hidden"
          aria-label="Open admin navigation"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={19} aria-hidden="true" />
        </button>

        <div className="order-last flex w-full min-w-0 items-center md:order-none md:w-auto md:flex-1">
          <div className="relative w-full md:max-w-[430px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <label htmlFor={searchId} className="sr-only">
              {searchLabel}
            </label>
            <input
              id={searchId}
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="pa-focus-ring h-11 w-full rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] pl-10 pr-10 text-[16px] font-medium text-[var(--pa-text)] outline-none placeholder:text-[var(--pa-faint)] md:h-10 md:pr-9 md:text-[12.5px]"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="pa-focus-ring absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--pa-faint)] transition-colors hover:text-[var(--pa-text)] md:right-1.5"
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {saving && (
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] px-3 py-2 text-[10.5px] font-bold text-[#735413] sm:flex">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Saving…
            </div>
          )}
          <Link
            to="/"
            className="pa-focus-ring flex size-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[11px] font-extrabold text-[var(--pa-text)] transition-colors hover:border-[var(--pa-border-strong)] hover:bg-white sm:h-10 sm:w-auto sm:px-3"
            title="Return to main page"
            aria-label="Back to main page"
          >
            <ArrowLeft size={13} strokeWidth={2.2} className="shrink-0 text-[var(--pa-muted)]" aria-hidden="true" />
            <span className="hidden sm:inline">Back to main page</span>
          </Link>
          <div className="hidden h-8 w-px bg-[var(--pa-border)] sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--pa-sidebar)] text-[11px] font-extrabold text-white">
              {identityInitials}
            </div>
            <div className="hidden sm:block">
              <div className="max-w-[180px] truncate text-[11.5px] font-extrabold leading-4 text-[var(--pa-text)]">
                {identityLabel}
              </div>
              <div className="text-[9.5px] font-semibold text-[var(--pa-muted)]">
                {userEmail ? "Signed in" : "Administrator session"}
              </div>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
