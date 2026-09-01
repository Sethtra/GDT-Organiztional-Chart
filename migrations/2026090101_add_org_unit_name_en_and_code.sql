-- ============================================================
-- Migration: Add name_en and code columns to org_units
-- ============================================================

ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS code TEXT;

-- Seed / normalize standard department English names and shortcuts
UPDATE public.org_units
SET name_en = 'Department of Administration and General Affairs', code = 'DAGA'
WHERE name = 'នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Finance and Personnel', code = 'DFP'
WHERE (name = 'នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក' OR name = 'នាយកដ្ឋានហិរញ្ញវត្ថុ') AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Administration and Personnel Department', code = 'APD'
WHERE name = 'នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Information Technology', code = 'DIT'
WHERE name = 'នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Large Taxpayers Management', code = 'DLTM'
WHERE name = 'នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធធំ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Enterprise Audit Department', code = 'EAD'
WHERE name = 'នាយកដ្ឋានសវនកម្មសហគ្រាស' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'National Tax School', code = 'NTS'
WHERE name = 'សាលាជាតិពន្ធដារ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Small and Medium Taxpayers Management', code = 'DSMTM'
WHERE name = 'នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធតូចនិងមធ្យម' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Movable and Immovable Property Tax', code = 'DMIPT'
WHERE name = 'នាយកដ្ឋានពន្ធចលនទ្រព្យ និងអចលនទ្រព្យ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Tax Crime Investigation', code = 'DTCI'
WHERE name = 'នាយកដ្ឋានស៊ើបអង្កេតបទល្មើសពន្ធដារ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Department of Tax Policy, Legislation and International Tax Cooperation', code = 'DTPLIC'
WHERE name = 'នាយកដ្ឋាននីតិកម្មនយោបាយសារពើពន្ធ និងសហប្រតិបត្តិការពន្ធដារអន្តរជាតិ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Tax Policy Department', code = 'TPD'
WHERE name = 'នាយកដ្ឋានគោលនយោបាយពន្ធ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Planning and Finance Department', code = 'PFD'
WHERE name = 'នាយកដ្ឋានផែនការ និងហិរញ្ញវត្ថុ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Research Department', code = 'RD'
WHERE name = 'នាយកដ្ឋានស្រាវជ្រាវ' AND (name_en IS NULL OR name_en = '');

UPDATE public.org_units
SET name_en = 'Compliance Department', code = 'CD'
WHERE name = 'នាយកដ្ឋានអនុលោមភាព' AND (name_en IS NULL OR name_en = '');
