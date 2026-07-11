import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowUp, ArrowDown } from "lucide-react";

export default function SearchBar({ nodes, onFlyTo, onHighlight, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter nodes on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      onHighlight([]);
      return;
    }
    const q = query.toLowerCase();
    const matched = nodes.filter((n) => {
      const name = (n.data?.name || "").toLowerCase();
      const nameEn = (n.data?.nameEn || "").toLowerCase();
      const type = (n.data?.orgType || "").toLowerCase();
      const dept = (n.data?.department || "").toLowerCase();
      const office = (n.data?.office || "").toLowerCase();
      return name.includes(q) || nameEn.includes(q) || type.includes(q) || dept.includes(q) || office.includes(q);
    });
    setResults(matched);
    setActiveIdx(0);
    onHighlight(matched.map((n) => n.id));
  }, [query, nodes]);

  const flyTo = useCallback((idx) => {
    if (results[idx]) onFlyTo(results[idx]);
  }, [results, onFlyTo]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIdx + 1) % results.length;
      setActiveIdx(next);
      flyTo(next);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIdx - 1 + results.length) % results.length;
      setActiveIdx(prev);
      flyTo(prev);
    }
    if (e.key === "Enter" && results.length > 0) flyTo(activeIdx);
  };

  return (
    <div className="searchbar-backdrop" onClick={onClose}>
      <div className="searchbar-box" onClick={(e) => e.stopPropagation()}>
        <div className="searchbar-input-row">
          <Search size={16} className="searchbar-icon" />
          <input
            ref={inputRef}
            className="searchbar-input"
            placeholder="Search nodes by name, type, department, or office..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <span className="searchbar-count">
              {results.length > 0 ? `${activeIdx + 1} / ${results.length}` : "0 results"}
            </span>
          )}
          <button className="searchbar-close" onClick={onClose}><X size={14} /></button>
        </div>

        {results.length > 0 && (
          <div className="searchbar-results">
            {results.map((node, i) => (
              <button
                key={node.id}
                className={`searchbar-result ${i === activeIdx ? "active" : ""}`}
                onClick={() => { setActiveIdx(i); flyTo(i); }}
              >
                <span
                  className="searchbar-result-dot"
                  style={{ background: node.data?.color || "var(--default-node-bg)" }}
                />
                <span className="searchbar-result-name">
                  {node.data?.name || node.data?.nameEn}
                  {node.data?.name && node.data?.nameEn && (
                    <span style={{ opacity: 0.6, fontSize: '0.9em', marginLeft: 6 }}>
                      ({node.data?.nameEn})
                    </span>
                  )}
                </span>
                <span className="searchbar-result-type">
                  {node.data?.orgType}
                  {(node.data?.department || node.data?.office) && (
                    <span style={{ opacity: 0.6, marginLeft: 6 }}>
                      ({[node.data?.department, node.data?.office].filter(Boolean).join(" - ")})
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="searchbar-hints">
          <span><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
          <span>↵ Fly to</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
