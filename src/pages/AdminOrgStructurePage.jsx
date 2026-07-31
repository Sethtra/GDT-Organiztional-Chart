import { useState, useEffect, useRef } from 'react';
import { useOrgStructure } from '../hooks/useOrgStructure';
import AdminSidebar from '../components/admin/AdminSidebar';
import { supabase } from '../supabaseClient';
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  Building2, MapPin, Loader2, AlertCircle, Search,
} from 'lucide-react';

// ── Inline editable text ────────────────────────────────────────
function InlineEdit({ value, onSave, placeholder = 'Enter name...' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }

    setSaving(true);
    const saved = await onSave(trimmed);
    setSaving(false);
    if (saved !== false) setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="admin-inline-text"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
        <Pencil size={12} className="admin-inline-icon" />
      </span>
    );
  }

  return (
    <span className="admin-inline-edit">
      <input
        ref={inputRef}
        className="admin-inline-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape' && !saving) { setDraft(value); setEditing(false); } }}
        placeholder={placeholder}
        dir="auto"
        disabled={saving}
      />
      <button className="admin-inline-btn admin-inline-btn--save" onClick={commit} disabled={saving}>
        {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
      </button>
      <button className="admin-inline-btn admin-inline-btn--cancel" disabled={saving} onClick={() => { setDraft(value); setEditing(false); }}><X size={14} /></button>
    </span>
  );
}

// ── Confirm delete modal ────────────────────────────────────────
function DeleteConfirm({ itemName, itemType, saving, onConfirm, onCancel }) {
  return (
    <div className="admin-modal-backdrop" onClick={() => { if (!saving) onCancel(); }}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal__icon"><AlertCircle size={28} /></div>
        <h3 className="admin-modal__title">Delete Confirmation</h3>
        <p className="admin-modal__text">
          Are you sure you want to delete <strong dir="auto">{itemName}</strong>?
          {itemType === 'unit' && <><br /><span style={{ color: 'var(--a-danger)', fontSize: 12 }}>This will also delete all offices under this unit.</span></>}
        </p>
        <div className="admin-modal__actions">
          <button className="admin-btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            className="admin-btn"
            style={{ background: 'var(--a-danger)', color: 'white', border: 'none' }}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <><Loader2 size={14} className="spin" /> Deleting...</> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ─────────────────────────────────────────────
export default function AdminOrgStructurePage() {
  const { units, loading, error, refetch } = useOrgStructure();

  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'unit'|'office', id, name }

  // New unit form
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitType, setNewUnitType] = useState('department');
  const newUnitRef = useRef(null);

  // New office form (keyed by unit id)
  const [addingOfficeFor, setAddingOfficeFor] = useState(null);
  const [newOfficeName, setNewOfficeName] = useState('');
  const newOfficeRef = useRef(null);

  useEffect(() => { if (showNewUnit) newUnitRef.current?.focus(); }, [showNewUnit]);
  useEffect(() => { if (addingOfficeFor) newOfficeRef.current?.focus(); }, [addingOfficeFor]);

  const toggleExpand = (id) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = (units || []).filter(u => {
    if (filterType !== 'all' && u.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchUnit = u.name.toLowerCase().includes(q);
      const matchOffice = (u.offices || []).some(o => o.name.toLowerCase().includes(q));
      return matchUnit || matchOffice;
    }
    return true;
  });

  const handleAddUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const maxSort = units.reduce((max, u) => Math.max(max, u.sort_order || 0), 0);
      const { error } = await supabase.from('org_units').insert({
        name: trimmed,
        type: newUnitType,
        sort_order: maxSort + 1,
      });
      if (error) throw error;
      setNewUnitName('');
      setShowNewUnit(false);
      await refetch();
    } catch (error) {
      alert('Failed to add unit: ' + (error.message || 'Unknown database error'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUnit = async (unitId, newName) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('org_units')
        .update({ name: newName })
        .eq('id', unitId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The unit was not found or could not be updated.');
      await refetch();
      return true;
    } catch (error) {
      alert('Failed to rename unit: ' + (error.message || 'Unknown database error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('org_units')
        .delete()
        .eq('id', unitId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The unit was not found or could not be deleted.');
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      alert('Failed to delete unit: ' + (error.message || 'Unknown database error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffice = async (unitId) => {
    const trimmed = newOfficeName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const unit = units.find(u => u.id === unitId);
      const maxSort = (unit?.offices || []).reduce((max, o) => Math.max(max, o.sort_order || 0), 0);
      const { error } = await supabase.from('org_offices').insert({
        unit_id: unitId,
        name: trimmed,
        sort_order: maxSort + 1,
      });
      if (error) throw error;
      setNewOfficeName('');
      setAddingOfficeFor(null);
      await refetch();
    } catch (error) {
      alert('Failed to add office: ' + (error.message || 'Unknown database error'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOffice = async (officeId, newName) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('org_offices')
        .update({ name: newName })
        .eq('id', officeId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The office was not found or could not be updated.');
      await refetch();
      return true;
    } catch (error) {
      alert('Failed to rename office: ' + (error.message || 'Unknown database error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffice = async (officeId) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('org_offices')
        .delete()
        .eq('id', officeId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The office was not found or could not be deleted.');
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      alert('Failed to delete office: ' + (error.message || 'Unknown database error'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'unit') handleDeleteUnit(deleteTarget.id);
    else handleDeleteOffice(deleteTarget.id);
  };

  const typeBadge = (type) => {
    const colors = {
      department: { bg: 'color-mix(in oklch, var(--a-blue) 14%, transparent)', text: 'var(--a-blue-text)', border: 'color-mix(in oklch, var(--a-blue) 30%, transparent)' },
      district:   { bg: 'color-mix(in oklch, var(--a-purple) 14%, transparent)', text: 'var(--a-purple-text)', border: 'color-mix(in oklch, var(--a-purple) 30%, transparent)' },
      province:   { bg: 'color-mix(in oklch, var(--a-green) 14%, transparent)', text: 'var(--a-green-text)', border: 'color-mix(in oklch, var(--a-green) 30%, transparent)' },
    };
    const c = colors[type] || colors.department;
    return (
      <span className="admin-type-badge" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
        {type}
      </span>
    );
  };

  const totalUnits = units.length;
  const totalOffices = units.reduce((sum, u) => sum + (u.offices?.length || 0), 0);
  const deptCount = units.filter(u => u.type === 'department').length;
  const distCount = units.filter(u => u.type === 'district').length;
  const provCount = units.filter(u => u.type === 'province').length;

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'department', label: 'Departments' },
    { id: 'district', label: 'Districts' },
    { id: 'province', label: 'Provinces' },
  ];

  return (
    <div className="admin-shell">
      <AdminSidebar currentTab="org-structure" />
      <main className="admin-main">
        <div className="admin-subheader">
          <div
            className="admin-subheader__icon"
            style={{ background: 'color-mix(in oklch, var(--a-blue) 16%, transparent)', color: 'var(--a-blue-text)' }}
          >
            <Building2 size={17} />
          </div>
          <div>
            <div className="admin-subheader__title">Organizational Structure</div>
            <div className="admin-subheader__subtitle">
              Manage departments, districts, provinces and their offices
            </div>
          </div>
          {saving && (
            <div className="admin-saving" style={{ marginLeft: 'auto' }}>
              <Loader2 size={14} className="spin" /> Saving...
            </div>
          )}
        </div>

        <div className="admin-chip-row">
          <div className="admin-chip-stat">
            <div className="admin-chip-stat__value">{totalUnits}</div>
            <div className="admin-chip-stat__label">Units</div>
          </div>
          <div className="admin-chip-stat">
            <div className="admin-chip-stat__value">{totalOffices}</div>
            <div className="admin-chip-stat__label">Offices</div>
          </div>
          <div className="admin-chip-stat">
            <div className="admin-chip-stat__value">{deptCount}</div>
            <div className="admin-chip-stat__label">Departments</div>
          </div>
          <div className="admin-chip-stat">
            <div className="admin-chip-stat__value">{distCount}</div>
            <div className="admin-chip-stat__label">Districts</div>
          </div>
          <div className="admin-chip-stat">
            <div className="admin-chip-stat__value">{provCount}</div>
            <div className="admin-chip-stat__label">Provinces</div>
          </div>
        </div>

        <div className="admin-tab-row">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-tab ${filterType === t.id ? 'admin-tab--active' : ''}`}
              onClick={() => setFilterType(t.id)}
            >
              {t.label}
            </button>
          ))}
          <div className="admin-search" style={{ marginLeft: 8 }}>
            <Search size={14} style={{ color: 'var(--a-text-muted)' }} />
            <input
              type="text"
              placeholder="Search units or offices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              dir="auto"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--a-text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--blue"
            onClick={() => { setShowNewUnit(true); setNewUnitName(''); }}
          >
            <Plus size={15} strokeWidth={2.2} /> Add Unit
          </button>
        </div>

        {showNewUnit && (
          <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: 14 }}>
            <select
              className="admin-select"
              value={newUnitType}
              onChange={e => setNewUnitType(e.target.value)}
            >
              <option value="department">Department</option>
              <option value="district">District</option>
              <option value="province">Province</option>
            </select>
            <input
              ref={newUnitRef}
              className="admin-input"
              style={{ flex: 1 }}
              value={newUnitName}
              onChange={e => setNewUnitName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddUnit(); if (e.key === 'Escape') setShowNewUnit(false); }}
              placeholder="Enter unit name (Khmer or English)..."
              dir="auto"
            />
            <button className="admin-btn admin-btn--blue" onClick={handleAddUnit} disabled={!newUnitName.trim()}>
              <Check size={15} /> Add
            </button>
            <button className="admin-btn" onClick={() => setShowNewUnit(false)}>
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              borderRadius: 'var(--a-radius)',
              border: '1px solid color-mix(in oklch, var(--a-danger) 40%, transparent)',
              background: 'color-mix(in oklch, var(--a-danger) 10%, transparent)',
              padding: 14,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-empty">
            <Loader2 size={32} className="spin" />
            <p>Loading organizational structure...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <Building2 size={32} />
            <p>{search ? 'No results found' : 'No organizational units yet'}</p>
            {!search && (
              <button className="admin-btn admin-btn--blue" onClick={() => setShowNewUnit(true)}>
                <Plus size={16} /> Add Your First Unit
              </button>
            )}
          </div>
        ) : (
          <div className="admin-unit-list">
            {filtered.map(unit => {
              const isExpanded = expandedUnits.has(unit.id);
              const officeCount = unit.offices?.length || 0;
              return (
                <div key={unit.id} className={`admin-unit-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="admin-unit-header" onClick={() => toggleExpand(unit.id)}>
                    <div className="admin-unit-header__left">
                      <span className="admin-unit-chevron">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div className="admin-unit-info">
                        <InlineEdit
                          value={unit.name}
                          onSave={(name) => handleUpdateUnit(unit.id, name)}
                        />
                        <div className="admin-unit-meta">
                          {typeBadge(unit.type)}
                          <span className="admin-office-count">
                            <MapPin size={11} /> {officeCount} office{officeCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="admin-unit-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="admin-icon-btn"
                        title="Add office"
                        onClick={() => { setExpandedUnits(prev => new Set(prev).add(unit.id)); setAddingOfficeFor(unit.id); setNewOfficeName(''); }}
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--danger"
                        title="Delete unit"
                        onClick={() => setDeleteTarget({ type: 'unit', id: unit.id, name: unit.name })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="admin-offices">
                      {(unit.offices || []).map(office => (
                        <div key={office.id} className="admin-office-row">
                          <MapPin size={13} className="admin-office-icon" />
                          <InlineEdit
                            value={office.name}
                            onSave={(name) => handleUpdateOffice(office.id, name)}
                          />
                          <button
                            className="admin-icon-btn admin-icon-btn--danger admin-icon-btn--sm"
                            title="Delete office"
                            onClick={() => setDeleteTarget({ type: 'office', id: office.id, name: office.name })}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      {addingOfficeFor === unit.id ? (
                        <div className="admin-add-office-form">
                          <MapPin size={13} className="admin-office-icon" />
                          <input
                            ref={newOfficeRef}
                            className="admin-input admin-input--sm"
                            value={newOfficeName}
                            onChange={e => setNewOfficeName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddOffice(unit.id); if (e.key === 'Escape') setAddingOfficeFor(null); }}
                            placeholder="Office name..."
                            dir="auto"
                          />
                          <button className="admin-inline-btn admin-inline-btn--save" onClick={() => handleAddOffice(unit.id)} disabled={!newOfficeName.trim()}>
                            <Check size={14} />
                          </button>
                          <button className="admin-inline-btn admin-inline-btn--cancel" onClick={() => setAddingOfficeFor(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="admin-add-office-btn"
                          onClick={() => { setAddingOfficeFor(unit.id); setNewOfficeName(''); }}
                        >
                          <Plus size={13} /> Add Office
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {deleteTarget && (
        <DeleteConfirm
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
          saving={saving}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
