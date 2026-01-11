-- Migration: Populate academic_institutions and academic_degrees tables
-- Source: client/src/lib/universities.ts
-- Date: 2025
--
-- Schema Structure:
-- academic_institutions: id (uuid), name (text, unique)
-- academic_degrees: id (uuid), name (text, unique)
--
-- Both tables use flat lists (no relationships between institutions and degrees)

-- ============================================================================
-- ACADEMIC INSTITUTIONS
-- ============================================================================
-- Insert all institutions from ISRAELI_UNIVERSITIES array (Hebrew names only)

INSERT INTO academic_institutions (name) VALUES
  ('המכללה האקדמית להנדסה ע״ש סמי שמעון'),
  ('אוניברסיטת בן־גוריון בנגב'),
  ('האוניברסיטה העברית בירושלים'),
  ('אוניברסיטת תל אביב'),
  ('הטכניון – מכון טכנולוגי לישראל'),
  ('אוניברסיטת בר־אילן'),
  ('אוניברסיטת חיפה'),
  ('מכון ויצמן למדע'),
  ('האוניברסיטה הפתוחה'),
  ('אוניברסיטת רייכמן'),
  ('המכללה למינהל – המסלול האקדמי'),
  ('המרכז האקדמי למשפט ולעסקים'),
  ('המרכז האקדמי פרס'),
  ('המרכז האקדמי רופין'),
  ('המכללה האקדמית תל אביב–יפו'),
  ('המכללה האקדמית אשקלון'),
  ('המכללה האקדמית גליל מערבי'),
  ('המכללה האקדמית עמק יזרעאל'),
  ('המכללה האקדמית כנרת'),
  ('המכללה האקדמית תל־חי'),
  ('המכללה האקדמית נתניה'),
  ('המכללה האקדמית אונו'),
  ('מכללת ספיר'),
  ('מכללת שנקר'),
  ('מכללת אפקה להנדסה'),
  ('מכללת אורט בראודה להנדסה'),
  ('בצלאל – אקדמיה לאמנות ועיצוב ירושלים'),
  ('מכללת אורנים'),
  ('מכללת קיי'),
  ('המכללה האקדמית בית ברל'),
  ('מכללת גורדון לחינוך'),
  ('מכללת שאנן'),
  ('מכללת אחוה')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ACADEMIC DEGREES
-- ============================================================================
-- Insert unique degree names from DEGREES_BY_UNIVERSITY mapping
-- All degree names collected from all universities, duplicates removed

INSERT INTO academic_degrees (name) VALUES
  ('הנדסת תעשייה וניהול'),
  ('הנדסת תוכנה'),
  ('הנדסת חשמל'),
  ('הנדסת מכונות'),
  ('הנדסת בניין'),
  ('הנדסה כימית'),
  ('הנדסת מערכות מידע'),
  ('מדעי המחשב'),
  ('כלכלה'),
  ('פסיכולוגיה'),
  ('הנדסת אווירונאוטיקה'),
  ('משפטים')
ON CONFLICT (name) DO NOTHING;
