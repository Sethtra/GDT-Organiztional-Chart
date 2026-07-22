import { supabase } from '../supabaseClient';

/**
 * Fetches relational HR data for a chart and merges it into the React Flow nodes array.
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
    newData.badgeText = pos.title || newData.badgeText;
    newData.department = pos.department || newData.department;
    newData.office = pos.office || newData.office;
    newData.positionId = pos.id; // Store DB ID for future updates

    // Process assignments (active vs history)
    const assignments = pos.position_assignments || [];
    const activeAssignment = assignments.find(a => !a.end_date);
    const historyAssignments = assignments.filter(a => a.end_date).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

    // Active staff
    if (activeAssignment && activeAssignment.staff) {
      const st = activeAssignment.staff;
      newData.name = st.name || '';
      newData.nameEn = st.name_en || '';
      newData.staffId = st.staff_id || '';
      newData.phone = st.phone || '';
      newData.address = st.address || '';
      newData.maritalStatus = st.marital_status || '';
      newData.siblings = st.siblings || '';
      newData.education = st.education || '';
      newData.skill = st.skill || '';
      newData.joinDate = activeAssignment.start_date || st.join_date || '';
      
      newData.dbStaffId = st.id; // Store DB ID
      newData.dbAssignmentId = activeAssignment.id; // Store DB ID
    } else {
      // Vacant position
      newData.name = '';
      newData.nameEn = '';
      newData.staffId = '';
      newData.phone = '';
      newData.address = '';
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
 * Syncs a single node's HR data back to the relational tables.
 */
export async function syncNodeToHRDatabase(chartId, ownerId, node) {
  const d = node.data;
  
  if (d.orgType !== 'individualNode' && !d.name && (!d.history || d.history.length === 0)) {
    return; // Not an HR node
  }

  try {
    // 1. Upsert Position
    let positionId = d.positionId;
    
    // First, check if position already exists for this chart and node
    const { data: existingPos } = await supabase
      .from('positions')
      .select('id')
      .eq('chart_id', chartId)
      .eq('node_id', node.id)
      .single();
      
    if (existingPos) {
      positionId = existingPos.id;
      await supabase.from('positions').update({
        title: d.badgeText || null,
        department: d.department || null,
        office: d.office || null,
        updated_at: new Date().toISOString()
      }).eq('id', positionId);
    } else {
      const { data: newPos } = await supabase.from('positions').insert({
        chart_id: chartId,
        node_id: node.id,
        title: d.badgeText || null,
        department: d.department || null,
        office: d.office || null,
      }).select().single();
      if (newPos) positionId = newPos.id;
    }

    if (!positionId) return;

    // 2. Active Staff & Assignment
    if (d.name || d.nameEn) {
      let staffId = d.dbStaffId;
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
        await supabase.from('staff').update(staffPayload).eq('id', staffId);
      } else {
        const { data: newStaff } = await supabase.from('staff').insert(staffPayload).select().single();
        if (newStaff) staffId = newStaff.id;
      }

      if (staffId) {
        let assignId = d.dbAssignmentId;
        if (assignId) {
          await supabase.from('position_assignments').update({
            start_date: d.joinDate || null,
            updated_at: new Date().toISOString()
          }).eq('id', assignId);
        } else {
          // Check if active assignment exists
          const { data: existingAssign } = await supabase.from('position_assignments')
            .select('id').eq('position_id', positionId).is('end_date', null).single();
            
          if (existingAssign) {
            await supabase.from('position_assignments').update({
              staff_id: staffId,
              start_date: d.joinDate || null,
              updated_at: new Date().toISOString()
            }).eq('id', existingAssign.id);
          } else {
            await supabase.from('position_assignments').insert({
              position_id: positionId,
              staff_id: staffId,
              start_date: d.joinDate || null,
              end_date: null
            });
          }
        }
      }
    } else {
      // If name is cleared (vacated), terminate active assignment with detailed vacate record
      const latestHistory = (d.history && d.history.length > 0) ? d.history[0] : null;
      await supabase.from('position_assignments')
        .update({
          end_date: latestHistory?.dateLeft || new Date().toISOString().split('T')[0],
          exit_status: latestHistory?.exitStatus || 'Vacated',
          notes: latestHistory?.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('position_id', positionId)
        .is('end_date', null);
    }
    
    // We omit syncing full history back to DB from frontend to avoid complex diffing.
    // The history is already generated in DB by the migration. Future history 
    // will be added by vacating a node, which we handle above.

  } catch (err) {
    console.error("Error syncing node to HR database:", err);
  }
}
