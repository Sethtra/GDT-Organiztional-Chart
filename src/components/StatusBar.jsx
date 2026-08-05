import { Layers, GitBranch, ZoomIn, CheckCircle2, Loader2, Clock, AlertCircle } from "lucide-react";

export default function StatusBar({ nodeCount, edgeCount, zoom, saveStatus, onOpenVersionHistory }) {
  const zoomPct = Math.round((zoom ?? 1) * 100);

  return (
    <div className="status-bar">
      <div className="status-item">
        <Layers size={11} />
        <span>{nodeCount} nodes</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <GitBranch size={11} />
        <span>{edgeCount} connections</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <ZoomIn size={11} />
        <span>{zoomPct}%</span>
      </div>
      <div className="status-divider" />
      <button
        className="status-item"
        onClick={onOpenVersionHistory}
        aria-label="Open version history"
        title="Version History"
      >
        <Clock size={11} />
        <span>History</span>
      </button>
      <div className="status-spacer" />
      <div
        className={`status-save ${saveStatus === "saving" ? "status-save--saving" : saveStatus === "saved" ? "status-save--saved" : ""}`}
        title={saveStatus === "error" ? "Save failed. Your local backup is intact; edit again or press Save to retry." : undefined}
        role="status"
        aria-live="polite"
      >
        {saveStatus === "saving" && <Loader2 size={10} className="status-spin" />}
        {saveStatus === "saved" && <CheckCircle2 size={10} />}
        {saveStatus === "error" && <AlertCircle size={10} color="#ef4444" />}
        <span>
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : ""}
        </span>
      </div>
    </div>
  );
}
