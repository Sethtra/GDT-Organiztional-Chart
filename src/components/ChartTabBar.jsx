import { X, FileText } from "lucide-react";

/**
 * Bottom tab strip listing currently-open chart tabs (see EditorShell in
 * App.jsx). Only rendered when 2+ tabs are open.
 */
export default function ChartTabBar({ tabs, activeTabId, onSelect, onClose }) {
  return (
    <div className="chart-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`chart-tab ${tab.id === activeTabId ? "chart-tab--active" : ""}`}
          onClick={() => onSelect(tab.id)}
          title={tab.name}
        >
          <FileText size={12} className="chart-tab__icon" />
          <span className="chart-tab__label">{tab.name}</span>
          <span
            className="chart-tab__close"
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            title="Close tab"
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
