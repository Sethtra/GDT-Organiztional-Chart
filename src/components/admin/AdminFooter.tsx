import { CheckCircle2 } from "lucide-react";

export default function AdminFooter() {
  return (
    <footer className="shrink-0 z-20 flex h-[38px] items-center justify-between border-t border-[var(--pa-border)] bg-white px-4 text-[9.5px] font-semibold text-[var(--pa-faint)] sm:px-6 shadow-md">
      <span>អគ្គនាយកដ្ឋានពន្ធដារ | General Department of Taxation</span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 size={11} aria-hidden="true" />
        Connected to live Supabase database
      </span>
    </footer>
  );
}
