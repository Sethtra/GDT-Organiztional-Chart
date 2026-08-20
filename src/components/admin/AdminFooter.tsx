import { CheckCircle2 } from "lucide-react";

export default function AdminFooter() {
  return (
    <footer className="z-20 flex min-h-11 shrink-0 items-center border-t border-[var(--pa-border)] bg-white px-4 py-2 text-[10px] font-semibold text-[var(--pa-faint)] shadow-md sm:justify-between sm:px-6">
      <span className="hidden sm:block">
        អគ្គនាយកដ្ឋានពន្ធដារ | General Department of Taxation
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <CheckCircle2 size={11} aria-hidden="true" />
        <span className="sm:hidden">Live data connected</span>
        <span className="hidden sm:inline">Connected to live Supabase database</span>
      </span>
    </footer>
  );
}
