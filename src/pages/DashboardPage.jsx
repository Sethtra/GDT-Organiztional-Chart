import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChart } from '../hooks/useChart';
import ChartCard from '../components/ChartCard';
import ConfirmModal from '../components/ConfirmModal';
import Navbar from '../components/Navbar';
import {
  Plus, Search, Loader2, LayoutGrid, LayoutList,
  FileBarChart2, ChevronRight, Sparkles, X, Users
} from 'lucide-react';

/* ── New-chart modal ─────────────────────────────── */
function NewChartModal({ onCreate, onClose }) {
  const [name, setName] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), useTemplate);
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="new-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="new-chart-modal__header">
          <h2>Create New Chart</h2>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="new-chart-modal__form">
          <div className="auth-field">
            <label className="auth-label">Chart Name</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. GDT Organizational Chart 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="new-chart-modal__templates">
            <div
              className={`new-chart-template-card ${useTemplate ? 'new-chart-template-card--active' : ''}`}
              onClick={() => setUseTemplate(true)}
            >
              <Sparkles size={22} style={{ color: '#d4af37' }} />
              <div>
                <div className="new-chart-template-card__title">GDT Template</div>
                <div className="new-chart-template-card__sub">Start with the official GDT org chart</div>
              </div>
            </div>
            <div
              className={`new-chart-template-card ${!useTemplate ? 'new-chart-template-card--active' : ''}`}
              onClick={() => setUseTemplate(false)}
            >
              <FileBarChart2 size={22} style={{ color: '#94a3b8' }} />
              <div>
                <div className="new-chart-template-card__title">Blank Canvas</div>
                <div className="new-chart-template-card__sub">Start from scratch</div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={!name.trim() || loading}
          >
            {loading ? <><Loader2 size={16} className="spin" /> Creating...</> : <><Plus size={16} /> Create Chart</>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Dashboard Page ──────────────────────────────── */
export default function DashboardPage() {
  const { user, displayName } = useAuth();
  const { charts, loading, createChart, renameChart, deleteChart, duplicateChart, acceptInvite, declineInvite } = useChart();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter charts by search
  const filteredCharts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return charts;
    return charts.filter(c => c.name.toLowerCase().includes(q));
  }, [charts, search]);

  // Split owned vs shared vs pending
  const ownedCharts = filteredCharts.filter(c => c.owner_id === user?.id);
  const pendingCharts = filteredCharts.filter(c => 
    c.owner_id !== user?.id && 
    c.chart_shares?.some(s => s.shared_email === user?.email && s.status === 'pending')
  );
  const sharedCharts = filteredCharts.filter(c => 
    c.owner_id !== user?.id && 
    !c.chart_shares?.some(s => s.shared_email === user?.email && s.status === 'pending')
  );

  const handleCreate = async (name, useTemplate) => {
    const chart = await createChart(name, useTemplate);
    if (chart) {
      setShowNewModal(false);
      navigate(`/chart/${chart.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteChart(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div className="dashboard-page">
      <Navbar />

      <div className="dashboard-content">
        {/* Header row */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              My Charts
            </h1>
            <p className="dashboard-sub">Welcome back, <strong>{displayName}</strong></p>
          </div>
          <button className="landing__btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} /> New Chart
          </button>
        </div>

        {/* Search + view toggle */}
        <div className="dashboard-toolbar">
          <div className="dashboard-search-wrap">
            <Search size={15} className="dashboard-search-icon" />
            <input
              type="text"
              className="dashboard-search"
              placeholder="Search charts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="dashboard-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="dashboard-view-toggle">
            <button
              className={`dashboard-view-btn ${viewMode === 'grid' ? 'dashboard-view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`dashboard-view-btn ${viewMode === 'list' ? 'dashboard-view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="dashboard-loading">
            <Loader2 size={32} className="spin" style={{ color: '#0e7d6e', opacity: 0.7 }} />
            <span>Loading your charts...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* My Charts */}
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">
                  <FileBarChart2 size={18} /> My Charts
                  <span className="dashboard-section-count">{ownedCharts.length}</span>
                </h2>
              </div>

              {ownedCharts.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="dashboard-empty__icon">📊</div>
                  <h3>No charts yet</h3>
                  <p>Create your first organizational chart to get started.</p>
                  <button className="landing__btn-primary" style={{ marginTop: 16 }} onClick={() => setShowNewModal(true)}>
                    <Plus size={16} /> Create Your First Chart
                  </button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'chart-grid' : 'chart-list'}>
                  {ownedCharts.map(chart => (
                    <ChartCard
                      key={chart.id}
                      chart={chart}
                      isOwner={true}
                      onRename={renameChart}
                      onDelete={(id) => setDeleteTarget(id)}
                      onDuplicate={duplicateChart}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Pending Invites */}
            {pendingCharts.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title" style={{ color: '#eab308' }}>
                    <Sparkles size={18} /> Pending Invitations
                    <span className="dashboard-section-count">{pendingCharts.length}</span>
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingCharts.map(chart => (
                    <div 
                      key={chart.id} 
                      style={{ 
                        background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', 
                        border: '1px solid rgba(234, 179, 8, 0.3)', 
                        borderLeft: '4px solid #eab308',
                        borderRadius: 8, 
                        padding: '16px 24px', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: 10, borderRadius: 10, color: '#eab308', display: 'flex' }}>
                          <Users size={20} />
                        </div>
                        <div>
                          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 2, fontWeight: 500 }}>
                            Collaboration Invite
                          </p>
                          <h3 style={{ color: 'white', fontSize: 16, margin: 0, fontWeight: 600 }}>
                            You have been invited to collaborate on <span style={{ color: '#eab308' }}>"{chart.name}"</span>
                          </h3>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button 
                          onClick={() => declineInvite(chart.id)} 
                          className="tb-btn" 
                          style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', fontWeight: 500 }}
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => acceptInvite(chart.id)} 
                          className="tb-btn tb-btn--primary" 
                          style={{ background: '#eab308', color: '#451a03', border: 'none', padding: '8px 20px', fontWeight: 600 }}
                        >
                          Accept Invite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Shared with Me */}
            {sharedCharts.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <ChevronRight size={18} /> Shared with Me
                    <span className="dashboard-section-count">{sharedCharts.length}</span>
                  </h2>
                </div>
                <div className={viewMode === 'grid' ? 'chart-grid' : 'chart-list'}>
                  {sharedCharts.map(chart => (
                    <ChartCard
                      key={chart.id}
                      chart={chart}
                      isOwner={false}
                      onRename={renameChart}
                      onDelete={(id) => setDeleteTarget(id)}
                      onDuplicate={duplicateChart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty search state */}
            {filteredCharts.length === 0 && charts.length > 0 && (
              <div className="dashboard-empty">
                <div className="dashboard-empty__icon">🔍</div>
                <h3>No results for "{search}"</h3>
                <p>Try a different search term.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* New chart modal */}
      {showNewModal && (
        <NewChartModal onCreate={handleCreate} onClose={() => setShowNewModal(false)} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Chart"
          message="This will permanently delete this chart. This cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
