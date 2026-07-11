import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.includes('VITE_SUPABASE_URL')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
  if (line.includes('VITE_SUPABASE_ANON_KEY')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('charts').select('id, updated_at, nodes').order('updated_at', {ascending: false}).limit(10);
  if(error) { console.error('Error:', error); return; }
  data.forEach(c => {
    let hasKhmer = false;
    if (c.nodes && JSON.stringify(c.nodes).includes('រចនាសម្ព័ន្ធស្ថាប័ន')) hasKhmer = true;
    console.log(c.id, '| Nodes:', c.nodes?.length, '| Khmer:', hasKhmer);
  });
}
run();
