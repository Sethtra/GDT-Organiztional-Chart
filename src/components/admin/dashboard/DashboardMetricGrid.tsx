import { cn } from "../../../lib/utils";
import { DASHBOARD_KPIS } from "./dashboardPreviewData";
import { StatusBadge } from "./DashboardPrimitives";

export default function DashboardMetricGrid() {
  return (
    <section
      className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-[var(--pa-shadow)] xl:grid-cols-4"
      aria-label="Key workforce metrics"
    >
      {DASHBOARD_KPIS.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className={cn(
              "relative min-w-0 bg-white p-4 sm:p-5",
              item.highlighted && "bg-[#fffcf4]",
            )}
          >
            {item.highlighted && (
              <span
                className="absolute inset-x-0 top-0 h-0.5 bg-[var(--pa-gold)]"
                aria-hidden="true"
              />
            )}
            <div className="mb-4 flex min-w-0 items-start justify-between gap-2 sm:mb-5 sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
              </div>
              <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
            </div>
            <div className="text-[10px] font-extrabold uppercase leading-4 tracking-[0.075em] text-[var(--pa-muted)] sm:text-[11px]">
              {item.label}
            </div>
            <div className="pa-tabular mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[var(--pa-text)] sm:text-[30px]">
              {item.value}
            </div>
            <p className="mt-3 text-[11px] font-medium leading-4 text-[var(--pa-faint)]">
              {item.detail}
            </p>
          </article>
        );
      })}
    </section>
  );
}
