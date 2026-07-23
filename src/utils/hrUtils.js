import { supabase } from '../supabaseClient';
import { createLatestTaskQueue } from './latestTaskQueue';

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined;

function fillMissing(target, key, value) {
  if (!hasOwn(target, key)) target[key] = value ?? '';
}

/**
 * Fetches relational HR data for a chart and merges it into the React Flow nodes array.
 * Chart JSON is the user-facing source of truth. Relational values only fill
 * fields absent from legacy JSON and provide database IDs/history.
 */
export async function mergeHRDataIntoNodes(chartId, originalNodes) {
  if (!originalNodes || originalNodes.length === 0) return originalNodes;

  // 1. Fetch positions for this chart, including their assignments and staff
  const { data: positions, error } = await supabase
    .from('positions')
    .select(`
      *,
      position_assignments (
        *,
        staff (*)
      )
    `)
    .eq('chart_id', chartId);

  if (error || !positions) {
    console.error("Error fetching HR data:", error);
    return originalNodes;
  }

  // 2. Map positions by node_id for fast lookup
  const positionMap = {};
  for (const pos of positions) {
    positionMap[pos.node_id] = pos;
  }

  // 3. Merge data into nodes
  return originalNodes.map(node => {
    const pos = positionMap[node.id];
    if (!pos) return node; // No relational data found, keep original JSON

    const newData = { ...node.data };
    
    // Core position details
    fillMissing(newData, 'badgeText', pos.title);
    fillMissing(newData, 'department', pos.department);
    fillMissing(newData, 'office', pos.office);
    newData.positionId = pos.id; // Store DB ID for future updates

    // Process assignments (active vs history)
    const assignments = pos.position_assignments || [];
    const activeAssignment = assignments.find(a => !a.end_date);
    const historyAssignments = assignments.filter(a => a.end_date).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

    // Active staff
    if (activeAssignment && activeAssignment.staff) {
      const st = activeAssignment.staff;
      fillMissing(newData, 'name', st.name);
      fillMissing(newData, 'nameEn', st.name_en);
      fillMissing(newData, 'staffId', st.staff_id);
      fillMissing(newData, 'phone', st.phone);
      fillMissing(newData, 'address', st.address);
      fillMissing(newData, 'maritalStatus', st.marital_status);
      fillMissing(newData, 'siblings', st.siblings);
      fillMissing(newData, 'education', st.education);
      fillMissing(newData, 'skill', st.skill);
      fillMissing(newData, 'joinDate', activeAssignment.start_date || st.join_date);
      
      newData.dbStaffId = st.id; // Store DB ID
      newData.dbAssignmentId = activeAssignment.id; // Store DB ID
    } else {
      // Vacant relational position. Preserve explicit JSON values, but make
      // legacy nodes without these keys consistently render as vacant.
      fillMissing(newData, 'name', '');
      fillMissing(newData, 'nameEn', '');
      fillMissing(newData, 'staffId', '');
      fillMissing(newData, 'phone', '');
      fillMissing(newData, 'address', '');
      newData.dbStaffId = null;
      newData.dbAssignmentId = null;
    }

    // History
    if (historyAssignments.length > 0) {
      const dbHistory = historyAssignments.map(a => {
        const st = a.staff || {};
        const rawStatus = a.exit_status || '';
        return {
          dbAssignmentId: a.id,
          dbStaffId: st.id,
          name: st.name || '',
          nameEn: st.name_en || '',
          staffId: st.staff_id || '',
          phone: st.phone || '',
          address: st.address || '',
          maritalStatus: st.marital_status || '',
          siblings: st.siblings || '',
          education: st.education || '',
          skill: st.skill || '',
          joinDate: a.start_date || st.join_date || '',
          dateLeft: a.end_date || '',
          exitStatus: (rawStatus && rawStatus !== 'Vacated' && rawStatus !== 'Departed') ? rawStatus : '',
          notes: a.notes || ''
        };
      });

      const combined = [...dbHistory];
      (node.data?.history || []).forEach(localRec => {
        if (!localRec || typeof localRec !== 'object') return;
        if (!localRec.name && !localRec.nameEn && !localRec.staffId && !localRec.dateLeft && !localRec.exitStatus) return;
        
        const localMatchKey = `${(localRec.name || '').trim().toLowerCase()}_${(localRec.dateLeft || '').trim()}`;
        const existingIdx = combined.findIndex(r => {
          const rMatchKey = `${(r.name || '').trim().toLowerCase()}_${(r.dateLeft || '').trim()}`;
          return rMatchKey === localMatchKey;
        });

        if (existingIdx >= 0) {
          if (!combined[existingIdx].exitStatus || combined[existingIdx].exitStatus === 'Vacated' || combined[existingIdx].exitStatus === 'Departed') {
            if (localRec.exitStatus) combined[existingIdx].exitStatus = localRec.exitStatus;
          }
          if (!combined[existingIdx].notes && localRec.notes) {
            combined[existingIdx].notes = localRec.notes;
          }
        } else {
          combined.push(localRec);
        }
      });

      combined.forEach(rec => {
        if (!rec.exitStatus || rec.exitStatus === 'Vacated' || rec.exitStatus === 'Departed') {
          rec.exitStatus = 'Resigned';
        }
      });

      newData.history = combined;
    } else {
      const seen = new Set();
      newData.history = (node.data?.history || []).filter(item => {
        if (!item || typeof item !== 'object') return false;
        if (!item.name && !item.nameEn && !item.staffId && !item.dateLeft && !item.exitStatus) return false;
        const key = `${(item.name || '').trim().toLowerCase()}_${(item.dateLeft || '').trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map(rec => ({
        ...rec,
        exitStatus: (!rec.exitStatus || rec.exitStatus === 'Vacated' || rec.exitStatus === 'Departed') ? 'Resigned' : rec.exitStatus
      }));
    }

    return { ...node, data: newData };
  });
}

/**
 * Per-node queues prevent fast property edits from racing each other. While a
 * write is running, intermediate edits are coalesced and only the newest node
 * snapshot is processed next.
 */
const nodeSyncQueues = new Map();

export function syncNodeToHRDatabase(chartId, ownerId, node) {
  if (!chartId || !node?.id) return Promise.resolve();

  const queueKey = `${chartId}:${node.id}`;
  let queue = nodeSyncQueues.get(queueKey);

  if (!queue) {
    queue = createLatestTaskQueue((pending) =>
      syncNodeSnapshot(pending.chartId, pending.ownerId, pending.node),
    );
    nodeSyncQueues.set(queueKey, queue);
  }

  const syncPromise = queue.enqueue({ chartId, ownerId, node });
  syncPromise.finally(() => {
    if (!queue.running && nodeSyncQueues.get(queueKey) === queue) {
      nodeSyncQueues.delete(queueKey);
    }
  });
  return syncPromise;
}

/**
 * Removes relational positions for deleted chart nodes. Any in-flight sync for
 * those nodes is allowed to finish first, then the position deletion wins.
 * Assignment rows are expected to cascade from positions in the core schema.
 */
export async function deleteHRDataForNodes(chartId, nodeIds) {
  const ids = [...new Set((nodeIds || []).filter(Boolean))];
  if (!chartId || ids.length === 0) return;

  const queues = ids
    .map((nodeId) => nodeSyncQueues.get(`${chartId}:${nodeId}`))
    .filter(Boolean);

  queues.forEach((queue) => queue.cancelPending());
  await Promise.all(queues.map((queue) => queue.whenIdle().catch(() => undefined)));
  ids.forEach((nodeId) => nodeSyncQueues.delete(`${chartId}:${nodeId}`));

  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('chart_id', chartId)
    .in('node_id', ids);

  if (error) throw error;
}

/**
 * Syncs one stable node snapshot back to the relational HR tables.
 */
async function syncNodeSnapshot(chartId, ownerId, node) {
  const d = node.data;
  
  if (d.orgType !== 'individualNode' && !d.name && (!d.history || d.history.length === 0)) {
    return; // Not an HR node
  }

  try {
    // 1. Upsert Position
    let positionId = d.positionId;
    
    // First, check if position already exists for this chart and node
    const { data: existingPos, error: existingPosError } = await supabase
      .from('positions')
      .select('id')
      .eq('chart_id', chartId)
      .eq('node_id', node.id)
      .maybeSingle();

    if (existingPosError) throw existingPosError;

    if (existingPos) {
      positionId = existingPos.id;
      const { error: positionUpdateError } = await supabase.from('positions').update({
        title: d.badgeText || null,
        department: d.department || null,
        office: d.office || null,
        updated_at: new Date().toISOString()
      }).eq('id', positionId);
      if (positionUpdateError) throw positionUpdateError;
    } else {
      const { data: newPos, error: positionInsertError } = await supabase.from('positions').insert({
        chart_id: chartId,
        node_id: node.id,
        title: d.badgeText || null,
        department: d.department || null,
        office: d.office || null,
      }).select().single();
      if (positionInsertError) throw positionInsertError;
      if (newPos) positionId = newPos.id;
    }

    if (!positionId) return;

    // 2. Active Staff & Assignment
    if (d.name || d.nameEn) {
      let staffId = d.dbStaffId;
      let assignId = d.dbAssignmentId;

      // A newly created/loaded node may not have the relational IDs embedded
      // in its JSON yet. Reuse the active assignment and its staff row instead
      // of inserting a new staff record on every property edit.
      if (!staffId || !assignId) {
        const { data: activeAssignment, error: activeAssignmentError } = await supabase
          .from('position_assignments')
          .select('id, staff_id')
          .eq('position_id', positionId)
          .is('end_date', null)
          .maybeSingle();
        if (activeAssignmentError) throw activeAssignmentError;
        assignId = assignId || activeAssignment?.id;
        staffId = staffId || activeAssignment?.staff_id;
      }

      const staffPayload = {
        owner_id: ownerId,
        name: d.name || null,
        name_en: d.nameEn || null,
        staff_id: d.staffId || null,
        phone: d.phone || null,
        address: d.address || null,
        marital_status: d.maritalStatus || null,
        siblings: d.siblings || null,
        education: d.education || null,
        skill: d.skill || null,
        join_date: d.joinDate || null,
        updated_at: new Date().toISOString()
      };

      if (staffId) {
        const { error: staffUpdateError } = await supabase
          .from('staff')
          .update(staffPayload)
          .eq('id', staffId);
        if (staffUpdateError) throw staffUpdateError;
      } else {
        const { data: newStaff, error: staffInsertError } = await supabase
          .from('staff')
          .insert(staffPayload)
          .select()
          .single();
        if (staffInsertError) throw staffInsertError;
        if (newStaff) staffId = newStaff.id;
      }

      if (staffId) {
        if (assignId) {
          const { error: assignmentUpdateError } = await supabase
            .from('position_assignments')
            .update({
              staff_id: staffId,
              start_date: d.joinDate || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', assignId);
          if (assignmentUpdateError) throw assignmentUpdateError;
        } else {
          const { error: assignmentInsertError } = await supabase
            .from('position_assignments')
            .insert({
              position_id: positionId,
              staff_id: staffId,
              start_date: d.joinDate || null,
              end_date: null
            });
          if (assignmentInsertError) throw assignmentInsertError;
        }
      }
    } else {
      // If name is cleared (vacated), terminate active assignment with detailed vacate record
      const latestHistory = (d.history && d.history.length > 0) ? d.history[0] : null;
      const { error: vacateError } = await supabase.from('position_assignments')
        .update({
          end_date: latestHistory?.dateLeft || new Date().toISOString().split('T')[0],
          exit_status: latestHistory?.exitStatus || 'Vacated',
          notes: latestHistory?.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('position_id', positionId)
        .is('end_date', null);
      if (vacateError) throw vacateError;
    }
    
    // We omit syncing full history back to DB from frontend to avoid complex diffing.
    // The history is already generated in DB by the migration. Future history 
    // will be added by vacating a node, which we handle above.

  } catch (err) {
    console.error("Error syncing node to HR database:", err);
  }
}
