import { ExternalLink, Link as LinkIcon, Unlink } from 'lucide-react';

export default function ChartLinkSection({
  availableCharts = [],
  linkedChartId,
  isDisabled,
  onChange,
}) {
  const linkedChart = availableCharts.find((chart) => chart.id === linkedChartId);

  return (
    <section
      className={`pp-section pp-chart-link-section ${isDisabled ? 'is-disabled' : ''}`}
      aria-disabled={isDisabled || undefined}
    >
      <div className="pp-section-label">
        <LinkIcon size={11} /> Link to Chart
      </div>
      <p className="pp-link-help">
        Link this node to another chart. Viewers can click the node to open it.
      </p>
      <select
        className="pp-input"
        value={linkedChartId}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Linked chart"
        disabled={isDisabled}
      >
        <option value="">No link</option>
        {linkedChartId && !linkedChart && (
          <option value={linkedChartId}>Current link (unavailable)</option>
        )}
        {availableCharts.map((chart) => (
          <option key={chart.id} value={chart.id}>
            {chart.name}
          </option>
        ))}
      </select>

      {linkedChartId && (
        <div className="pp-linked-chart">
          <ExternalLink size={15} aria-hidden="true" />
          <div className="pp-linked-chart__details">
            <span className="pp-linked-chart__name">
              {linkedChart?.name || 'Linked chart unavailable'}
            </span>
            <span className="pp-linked-chart__status">
              {linkedChart
                ? 'Connected'
                : 'The saved link is not in your available chart list'}
            </span>
          </div>
          <button
            type="button"
            className="pp-unlink-chart"
            onClick={() => onChange('')}
            aria-label="Unlink Chart"
            title="Remove linked chart"
            disabled={isDisabled}
          >
            <Unlink size={14} />
            <span>Unlink</span>
          </button>
        </div>
      )}
    </section>
  );
}
