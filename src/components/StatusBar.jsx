import { Layers, GitBranch, ZoomIn, CheckCircle2, Loader2, Clock } from "lucide-react";

export default function StatusBar({ nodeCount, edgeCount, zoom, saveStatus, onOpenVersionHistory }) {
  const zoomPct = Math.round((zoom ?? 1) * 100);

  return (
    <div className="status-bar">
      <div className="status-item">
        <Layers size={12} />
        <span>{nodeCount} nodes</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <GitBranch size={12} />
        <span>{edgeCount} connections</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <ZoomIn size={12} />
        <span>{zoomPct}%</span>
      </div>
      <div className="status-divider" />
      <button 
        className="status-item" 
        onClick={onOpenVersionHistory}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Clock size={12} />
        <span>History</span>
      </button>
      <div className="status-spacer" />
      <div className={`status-save ${saveStatus === "saving" ? "status-save--saving" : saveStatus === "saved" ? "status-save--saved" : ""}`}>
        {saveStatus === "saving" && <Loader2 size={11} className="status-spin" />}
        {saveStatus === "saved" && <CheckCircle2 size={11} />}
        <span>
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}
        </span>
      </div>
    </div>
  );
}
