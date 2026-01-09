-- ==========================================================
-- Migration: Standardize University Names in global_courses
-- Purpose: Convert Hebrew university names to English codes
-- Date: 2025
-- ==========================================================
-- 
-- This migration updates all Hebrew university names in the global_courses table
-- to their corresponding English codes to match the new frontend implementation.
--
-- Run this in Supabase SQL Editor after the frontend has been updated.
-- ==========================================================

-- Update Hebrew university names to English codes
-- This uses a CASE statement to map all known Hebrew variations to their English codes

UPDATE global_courses 
SET university_name = CASE
  -- SCE (already correct, but included for completeness)
  WHEN university_name = 'SCE' THEN 'SCE'
  WHEN university_name = 'המכללה האקדמית להנדסה ע״ש סמי שמעון' THEN 'SCE'
  
  -- Ben-Gurion University (various Hebrew forms)
  WHEN university_name = 'אוניברסיטת בן־גוריון בנגב' THEN 'BGU'
  WHEN university_name = 'אוניברסיטת בן גוריון' THEN 'BGU'
  WHEN university_name = 'אוניברסיטת בן-גוריון' THEN 'BGU'
  WHEN university_name = 'בן גוריון' THEN 'BGU'
  WHEN university_name = 'בן-גוריון' THEN 'BGU'
  
  -- Hebrew University (various forms)
  WHEN university_name = 'האוניברסיטה העברית בירושלים' THEN 'HUJI'
  WHEN university_name = 'האוניברסיטה העברית' THEN 'HUJI'
  WHEN university_name = 'עברית' THEN 'HUJI'
  
  -- Tel Aviv University (various forms)
  WHEN university_name = 'אוניברסיטת תל אביב' THEN 'TAU'
  WHEN university_name = 'תל אביב' THEN 'TAU'
  WHEN university_name = 'אוניברסיטת ת״א' THEN 'TAU'
  
  -- Technion (various forms)
  WHEN university_name = 'הטכניון – מכון טכנולוגי לישראל' THEN 'Technion'
  WHEN university_name = 'הטכניון' THEN 'Technion'
  WHEN university_name = 'Technion' THEN 'Technion'
  
  -- Bar-Ilan University
  WHEN university_name = 'אוניברסיטת בר־אילן' THEN 'BIU'
  WHEN university_name = 'בר אילן' THEN 'BIU'
  WHEN university_name = 'בר-אילן' THEN 'BIU'
  
  -- University of Haifa
  WHEN university_name = 'אוניברסיטת חיפה' THEN 'UHaifa'
  WHEN university_name = 'חיפה' THEN 'UHaifa'
  
  -- Weizmann Institute
  WHEN university_name = 'מכון ויצמן למדע' THEN 'WIS'
  WHEN university_name = 'ויצמן' THEN 'WIS'
  
  -- Open University
  WHEN university_name = 'האוניברסיטה הפתוחה' THEN 'OPENU'
  WHEN university_name = 'הפתוחה' THEN 'OPENU'
  
  -- Reichman University
  WHEN university_name = 'אוניברסיטת רייכמן' THEN 'Reichman'
  
  -- COMAS
  WHEN university_name = 'המכללה למינהל – המסלול האקדמי' THEN 'COMAS'
  WHEN university_name = 'המכללה למינהל' THEN 'COMAS'
  
  -- CLB
  WHEN university_name = 'המרכז האקדמי למשפט ולעסקים' THEN 'CLB'
  
  -- PAC
  WHEN university_name = 'המרכז האקדמי פרס' THEN 'PAC'
  
  -- Ruppin
  WHEN university_name = 'המרכז האקדמי רופין' THEN 'Ruppin'
  
  -- TAJ
  WHEN university_name = 'המכללה האקדמית תל אביב–יפו' THEN 'TAJ'
  
  -- AAC
  WHEN university_name = 'המכללה האקדמית אשקלון' THEN 'AAC'
  
  -- WAGC
  WHEN university_name = 'המכללה האקדמית גליל מערבי' THEN 'WAGC'
  
  -- YVC
  WHEN university_name = 'המכללה האקדמית עמק יזרעאל' THEN 'YVC'
  
  -- KAC
  WHEN university_name = 'המכללה האקדמית כנרת' THEN 'KAC'
  
  -- Tel-Hai
  WHEN university_name = 'המכללה האקדמית תל־חי' THEN 'Tel-Hai'
  
  -- Netanya
  WHEN university_name = 'המכללה האקדמית נתניה' THEN 'Netanya'
  
  -- ONO
  WHEN university_name = 'המכללה האקדמית אונו' THEN 'ONO'
  
  -- Sapir
  WHEN university_name = 'מכללת ספיר' THEN 'Sapir'
  
  -- Shenkar
  WHEN university_name = 'מכללת שנקר' THEN 'Shenkar'
  
  -- Afeka
  WHEN university_name = 'מכללת אפקה להנדסה' THEN 'Afeka'
  WHEN university_name = 'אפקה' THEN 'Afeka'
  
  -- Braude
  WHEN university_name = 'מכללת אורט בראודה להנדסה' THEN 'Braude'
  WHEN university_name = 'בראודה' THEN 'Braude'
  
  -- Bezalel
  WHEN university_name = 'בצלאל – אקדמיה לאמנות ועיצוב ירושלים' THEN 'Bezalel'
  WHEN university_name = 'בצלאל' THEN 'Bezalel'
  
  -- Oranim
  WHEN university_name = 'מכללת אורנים' THEN 'Oranim'
  
  -- Kay
  WHEN university_name = 'מכללת קיי' THEN 'Kay'
  
  -- Beit Berl
  WHEN university_name = 'המכללה האקדמית בית ברל' THEN 'Beit Berl'
  
  -- Gordon
  WHEN university_name = 'מכללת גורדון לחינוך' THEN 'Gordon'
  
  -- Shaanan
  WHEN university_name = 'מכללת שאנן' THEN 'Shaanan'
  
  -- Achva
  WHEN university_name = 'מכללת אחוה' THEN 'Achva'
  
  -- Keep existing value if it's already an English code or no match found
  ELSE university_name
END
WHERE university_name NOT IN (
  -- Only update rows where university_name is NOT already an English code
  'SCE', 'BGU', 'HUJI', 'TAU', 'Technion', 'BIU', 'UHaifa', 'WIS', 'OPENU', 
  'Reichman', 'COMAS', 'CLB', 'PAC', 'Ruppin', 'TAJ', 'AAC', 'WAGC', 'YVC', 
  'KAC', 'Tel-Hai', 'Netanya', 'ONO', 'Sapir', 'Shenkar', 'Afeka', 'Braude', 
  'Bezalel', 'Oranim', 'Kay', 'Beit Berl', 'Gordon', 'Shaanan', 'Achva'
);

-- ==========================================================
-- Verification Queries
-- ==========================================================

-- Check what university names exist after update
SELECT 
  university_name,
  COUNT(*) as course_count
FROM global_courses
GROUP BY university_name
ORDER BY university_name;

-- Expected result: All university_name values should be English codes
-- If you see any Hebrew text, those are universities not in our mapping list

-- Check for any remaining Hebrew text (should return 0 rows after migration)
SELECT DISTINCT university_name
FROM global_courses
WHERE university_name ~ '[א-ת]';  -- Matches any Hebrew characters

-- Show sample courses for each university (to verify data integrity)
SELECT 
  university_name,
  degree_name,
  course_name,
  credits
FROM global_courses
ORDER BY university_name, degree_name, course_name
LIMIT 20;
