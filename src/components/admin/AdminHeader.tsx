import { useId } from "react";
import { Loader2, Menu, Search, X } from "lucide-react";

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

  return (
    <header className="shrink-0 z-30 flex h-[72px] items-center border-b border-[var(--pa-border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="pa-focus-ring flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-text)] transition-colors hover:bg-[var(--pa-surface-muted)] lg:hidden"
          aria-label="Open admin navigation"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={19} aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 flex-1 items-center md:flex">
          <div className="relative w-full max-w-[430px]">
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
              className="pa-focus-ring h-10 w-full rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] pl-10 pr-9 text-[12.5px] font-medium text-[var(--pa-text)] outline-none placeholder:text-[var(--pa-faint)]"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pa-faint)] transition-colors hover:text-[var(--pa-text)]"
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          {saving ? (
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] px-3 py-2 text-[10.5px] font-bold text-[#735413] sm:flex">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Saving…
            </div>
          ) : (
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-3 py-2 text-[10.5px] font-bold text-[var(--pa-primary)] sm:flex">
              <span className="size-1.5 rounded-full bg-[var(--pa-primary)]" aria-hidden="true" />
              Live Sync
            </div>
          )}
          <div className="h-8 w-px bg-[var(--pa-border)]" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pa-sidebar)] text-[11px] font-extrabold text-white">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : "SE"}
            </div>
            <div className="hidden sm:block">
              <div className="max-w-[180px] truncate text-[11.5px] font-extrabold leading-4 text-[var(--pa-text)]">
                {userEmail ?? "sethtragame@gmail.com"}
              </div>
              <div className="text-[9.5px] font-semibold text-[var(--pa-muted)]">
                Signed in
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
