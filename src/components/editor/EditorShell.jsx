import { useCallback, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import ChartTabBar from '../ChartTabBar';
import ErrorBoundary from '../ErrorBoundary';
import { TabContext } from '../../contexts/TabContext';
import { readChartNodeFocusId } from '../../utils/chartNodeNavigation';
import FlowApp from './FlowApp';

/**
 * Owns the set of currently-open chart tabs. Consumes TabContext (which
 * persists above the router) so tab state survives Dashboard↔Chart
 * navigations. Rendered OUTSIDE <Routes> so it never unmounts — FlowApp
 * instances stay alive across Dashboard round-trips.
 *
 * Data flow is UNIDIRECTIONAL:  URL → state (never state → URL).
 * Tab clicks / linked-chart opens navigate first; the effect syncs state.
 *
 * Extracted from App.jsx (original lines 1707–1791).
 */
export default function EditorShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    openTabs,
    activeTabId,
    tabNames,
    openTab,
    closeTab,
    setTabName,
  } = useContext(TabContext);

  // Detect whether we're on a /chart/:id route
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/);
  const urlChartId = chartMatch ? chartMatch[1] : null;
  const focusNodeId = urlChartId
    ? readChartNodeFocusId(location.search)
    : null;

  // URL → state: when the URL points to a chart, ensure it's open & active
  useEffect(() => {
    if (urlChartId) {
      openTab(urlChartId);
    }
  }, [urlChartId, openTab]);

  // Navigate to open a linked chart (called from within FlowApp)
  const handleOpenLinkedChart = useCallback(
    (chartId) => {
      if (!chartId) return;
      openTab(chartId); // Add to tab list immediately
      navigate(`/chart/${chartId}`, { replace: true });
    },
    [openTab, navigate],
  );

  const handleCloseTab = useCallback(
    (chartId) => closeTab(chartId, navigate),
    [closeTab, navigate],
  );

  // Only show when we're on a chart route and have tabs
  const isVisible = !!urlChartId && openTabs.length > 0;

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {openTabs.map((id) => (
          <div
            key={id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: id === activeTabId ? 1 : 0,
              zIndex: id === activeTabId ? 1 : -1,
              pointerEvents: id === activeTabId ? 'auto' : 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <ErrorBoundary>
              <ReactFlowProvider>
                <FlowApp
                  chartId={id}
                  focusNodeId={id === urlChartId ? focusNodeId : null}
                  openLinkedChart={handleOpenLinkedChart}
                  onChartName={(name) => setTabName(id, name)}
                />
              </ReactFlowProvider>
            </ErrorBoundary>
          </div>
        ))}
      </div>
      {openTabs.length > 1 && (
        <ChartTabBar
          tabs={openTabs.map((id) => ({
            id,
            name: tabNames[id] || 'Untitled Chart',
          }))}
          activeTabId={activeTabId}
          onSelect={(id) => navigate(`/chart/${id}`, { replace: true })}
          onClose={handleCloseTab}
        />
      )}
    </div>
  );
}
