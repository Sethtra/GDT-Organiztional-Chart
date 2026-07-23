import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, Clock, RotateCcw, Trash2 } from 'lucide-react';

export default function VersionHistoryModal({ isOpen, onClose, chartId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chart_versions')
      .select('*')
      .eq('chart_id', chartId)
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (error) {
      console.error('Error fetching versions:', error);
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  }, [chartId]);

  useEffect(() => {
    if (isOpen && chartId) {
      loadVersions();
    }
  }, [isOpen, chartId, loadVersions]);

  const handleRestore = (version) => {
    if (window.confirm(`Are you sure you want to restore the version from ${new Date(version.created_at).toLocaleString()}? Your current unsaved changes will be lost.`)) {
      onRestore(version.nodes, version.edges);
      onClose();
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Delete all version history for this chart?')) {
      const { error } = await supabase.from('chart_versions').delete().eq('chart_id', chartId);
      if (error) {
        console.error('Error deleting versions:', error);
        window.alert('Failed to delete version history. Please try again.');
        return;
      }
      setVersions([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', borderRadius: '12px', width: '500px', maxWidth: '90%',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-strong)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} /> Version History
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading versions...</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No version history found. Save your chart to create a version!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {versions.map((v, i) => (
                <div key={v.id} style={{
                  backgroundColor: 'var(--bg-surface-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-strong)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {new Date(v.created_at).toLocaleString()}
                      {i === 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#3b82f6', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>Latest</span>}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {v.nodes?.length || 0} nodes • {v.edges?.length || 0} edges
                    </div>
                  </div>
                  <button onClick={() => handleRestore(v)} style={{
                    backgroundColor: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6',
                    padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s'
                  }}>
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {versions.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleDeleteAll} style={{
              backgroundColor: 'transparent', border: 'none', color: '#ef4444',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem'
            }}>
              <Trash2 size={16} /> Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
