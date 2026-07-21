import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting safe migration of HR data...");
  
  // 1. Fetch all charts
  const { data: charts, error: chartsError } = await supabase
    .from('charts')
    .select('id, owner_id, nodes');

  if (chartsError) {
    console.error("Error fetching charts:", chartsError);
    return;
  }

  console.log(`Found ${charts.length} charts. Processing...`);

  let staffCount = 0;
  let positionsCount = 0;
  let historyCount = 0;

  for (const chart of charts) {
    if (!chart.nodes || !Array.isArray(chart.nodes)) continue;

    for (const node of chart.nodes) {
      const d = node.data;
      if (!d) continue;

      // Only migrate individual nodes or nodes that have a person assigned/history
      if (d.orgType !== 'individualNode' && !d.name && (!d.history || d.history.length === 0)) {
        continue;
      }

      // Step 1: Create Position
      const { data: position, error: posError } = await supabase
        .from('positions')
        .insert({
          chart_id: chart.id,
          node_id: node.id,
          title: d.badgeText || null,
          department: d.department || null,
          office: d.office || null,
        })
        .select()
        .single();

      if (posError) {
        // If it violates the UNIQUE(chart_id, node_id) constraint, we can skip or update.
        console.error(`Error creating position for node ${node.id}:`, posError.message);
        continue;
      }
      positionsCount++;

      // Step 2: Create current staff and active assignment (if occupied)
      if (d.name || d.nameEn) {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .insert({
            owner_id: chart.owner_id,
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
          })
          .select()
          .single();

        if (!staffError && staff) {
          staffCount++;
          await supabase
            .from('position_assignments')
            .insert({
              position_id: position.id,
              staff_id: staff.id,
              start_date: d.joinDate || null,
              end_date: null, // Active
              exit_status: null,
            });
        }
      }

      // Step 3: Iterate history and create historical assignments
      if (d.history && Array.isArray(d.history)) {
        for (const record of d.history) {
          const { data: pastStaff, error: pastStaffError } = await supabase
            .from('staff')
            .insert({
              owner_id: chart.owner_id,
              name: record.name || null,
              name_en: record.nameEn || null,
              staff_id: record.staffId || null,
              phone: record.phone || null,
              address: record.address || null,
              marital_status: record.maritalStatus || null,
              siblings: record.siblings || null,
              education: record.education || null,
              skill: record.skill || null,
              join_date: record.joinDate || null,
            })
            .select()
            .single();

          if (!pastStaffError && pastStaff) {
            staffCount++;
            await supabase
              .from('position_assignments')
              .insert({
                position_id: position.id,
                staff_id: pastStaff.id,
                start_date: record.joinDate || null,
                end_date: record.dateLeft || null,
                exit_status: record.exitStatus || null,
                notes: record.notes || null,
              });
            historyCount++;
          }
        }
      }
    }
  }

  console.log("-----------------------------------------");
  console.log("Migration Complete! 🎉");
  console.log(`Created ${positionsCount} Positions`);
  console.log(`Created ${staffCount} Staff profiles`);
  console.log(`Created ${historyCount} Historical assignments`);
  console.log("Original JSON nodes were NOT deleted.");
}

migrate();
