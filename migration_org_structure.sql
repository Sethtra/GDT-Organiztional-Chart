-- ============================================================
-- Migration: Organizational Structure Reference Tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

BEGIN;

-- 1. Create org_units table (Departments, Districts, Provinces)
CREATE TABLE IF NOT EXISTS org_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'district', 'province')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create org_offices table (child offices under a unit)
CREATE TABLE IF NOT EXISTS org_offices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_offices ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — any authenticated user can read; any authenticated user can write
--    (the admin page is hidden by URL, not by DB role)
DROP POLICY IF EXISTS "Anyone can read org_units" ON org_units;
CREATE POLICY "Anyone can read org_units"
  ON org_units FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert org_units" ON org_units;
CREATE POLICY "Authenticated users can insert org_units"
  ON org_units FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update org_units" ON org_units;
CREATE POLICY "Authenticated users can update org_units"
  ON org_units FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete org_units" ON org_units;
CREATE POLICY "Authenticated users can delete org_units"
  ON org_units FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can read org_offices" ON org_offices;
CREATE POLICY "Anyone can read org_offices"
  ON org_offices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert org_offices" ON org_offices;
CREATE POLICY "Authenticated users can insert org_offices"
  ON org_offices FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update org_offices" ON org_offices;
CREATE POLICY "Authenticated users can update org_offices"
  ON org_offices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete org_offices" ON org_offices;
CREATE POLICY "Authenticated users can delete org_offices"
  ON org_offices FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 5. Seed Data — GDT Departments & Offices
-- ============================================================

-- Match both the original name and stable seed sort position. This prevents a
-- rerun from recreating a seeded row that an administrator has renamed.
WITH seed_units(name, type, sort_order) AS (
  VALUES
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 'department', 1),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 'department', 2),
    ('នាយកដ្ឋាននីតិកម្មនយោបាយសារពើពន្ធ និងសហប្រតិបត្តិការពន្ធដារអន្តរជាតិ', 'department', 3),
    ('នាយកដ្ឋានពន្ធចលនទ្រព្យ និងអចលនទ្រព្យ', 'department', 4),
    ('នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន', 'department', 5),
    ('នាយកដ្ឋានស៊ើបអង្កេតបទល្មើសពន្ធដារ', 'department', 6),
    ('នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធធំ', 'department', 7),
    ('នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធតូចនិងមធ្យម', 'department', 8),
    ('នាយកដ្ឋានសវនកម្មសហគ្រាស', 'department', 9),
    ('សាលាជាតិពន្ធដារ', 'department', 10),
    ('សវនកម្មពន្ធដារពិសេស', 'department', 11)
)
INSERT INTO org_units (name, type, sort_order)
SELECT seed.name, seed.type, seed.sort_order
FROM seed_units AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM org_units AS existing
  WHERE existing.type = seed.type
    AND (
      existing.name = seed.name
      OR existing.sort_order = seed.sort_order
    )
);

WITH seed_offices(unit_name, unit_sort_order, name, sort_order) AS (
  VALUES
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.រដ្ឋបាល', 1),
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.កិច្ចការទូទៅ', 2),
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.ពិគ្រោះយោបល់', 3),
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.ទំនាក់ទំនងសាធារណៈ', 4),
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.ចុះបញ្ជីពន្ធដារ', 5),
    ('នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ', 1, 'ការិ.សវនកម្មផ្ទៃក្នុង', 6),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.រដ្ឋបាល', 1),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.ហិរញ្ញវត្ថុ និងលទ្ធកម្ម', 2),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.បុគ្គលិក', 3),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.បៀវត្ស', 4),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.ត្រួតពិនិត្យ', 5),
    ('នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក', 2, 'ការិ.បណ្តុះបណ្តាលនិងអភិវឌ្ឍន៍ធនធានមនុស្ស', 6)
),
resolved_offices AS (
  SELECT
    unit.id AS unit_id,
    seed.name,
    seed.sort_order
  FROM seed_offices AS seed
  CROSS JOIN LATERAL (
    SELECT existing.id
    FROM org_units AS existing
    WHERE existing.type = 'department'
      AND (
        existing.name = seed.unit_name
        OR existing.sort_order = seed.unit_sort_order
      )
    ORDER BY
      (existing.name = seed.unit_name) DESC,
      existing.created_at ASC,
      existing.id ASC
    LIMIT 1
  ) AS unit
)
INSERT INTO org_offices (unit_id, name, sort_order)
SELECT seed.unit_id, seed.name, seed.sort_order
FROM resolved_offices AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM org_offices AS existing
  WHERE existing.unit_id = seed.unit_id
    AND (
      existing.name = seed.name
      OR existing.sort_order = seed.sort_order
    )
);

COMMIT;
