-- ==========================================================
-- Seed Data: Global Course Catalog
-- Purpose: Populate initial course data for universities and degrees
-- Date: 2025
-- ==========================================================

-- ==========================================================
-- STEP 2: Data Seeding - SCE Industrial Engineering (EXACT DATA)
-- ==========================================================

-- Clean up existing SCE data to avoid conflicts
DELETE FROM global_courses WHERE university_name = 'SCE';

INSERT INTO global_courses (university_name, degree_name, course_name, credits, grade_breakdown_json, difficulty, academic_year) VALUES

-- ==========================
-- שנה א' - סמסטר א'
-- ==========================
('SCE', 'הנדסת תעשייה וניהול', 'חדוו״א 1', 5.0, 
  '[
    {"name": "מבחן סופי", "weight": 65, "isMagen": false}, 
    {"name": "בוחן מגן", "weight": 25, "isMagen": true}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}
  ]', 'hard', 1),

('SCE', 'הנדסת תעשייה וניהול', 'מבוא למערכות מידע', 3.5, 
  '[
    {"name": "פרויקט חלק א", "weight": 45, "isMagen": false}, 
    {"name": "פרויקט חלק ב", "weight": 40, "isMagen": false}, 
    {"name": "מצגת ראשונה", "weight": 10, "isMagen": false}, 
    {"name": "הערכת מרצה", "weight": 5, "isMagen": false}
  ]', 'medium', 1),

('SCE', 'הנדסת תעשייה וניהול', 'מבוא לניהול התפעול', 3.0, 
  '[
    {"name": "מבחן סופי", "weight": 85, "isMagen": false}, 
    {"name": "תרגילים", "weight": 15, "isMagen": false}
  ]', 'medium', 1),

('SCE', 'הנדסת תעשייה וניהול', 'יסודות ההסתברות', 4.0, 
  '[
    {"name": "מבחן סופי", "weight": 85, "isMagen": false}, 
    {"name": "תרגילים", "weight": 15, "isMagen": true}
  ]', 'hard', 1),

('SCE', 'הנדסת תעשייה וניהול', 'אלגברה ליניארית', 3.5, 
  '[
    {"name": "מבחן סופי", "weight": 80, "isMagen": false}, 
    {"name": "תרגילים", "weight": 20, "isMagen": false}
  ]', 'hard', 1),

-- ==========================
-- שנה א' - סמסטר ב'
-- ==========================
('SCE', 'הנדסת תעשייה וניהול', 'חדוו״א 2', 5.0, 
  '[
    {"name": "מבחן סופי", "weight": 80, "isMagen": false}, 
    {"name": "בוחן מגן", "weight": 10, "isMagen": true}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}
  ]', 'hard', 1),

('SCE', 'הנדסת תעשייה וניהול', 'פיזיקה 1ב', 3.5, 
  '[
    {"name": "מבחן סופי", "weight": 60, "isMagen": false}, 
    {"name": "בוחן מגן", "weight": 25, "isMagen": true}, 
    {"name": "עבודות בית", "weight": 10, "isMagen": false}, 
    {"name": "נוכחות", "weight": 5, "isMagen": false}
  ]', 'hard', 1),

('SCE', 'הנדסת תעשייה וניהול', 'יישומי מחשב', 1.0, 
  '[
    {"name": "מבחן סופי", "weight": 75, "isMagen": false}, 
    {"name": "תרגילים", "weight": 25, "isMagen": false}
  ]', 'easy', 1),

('SCE', 'הנדסת תעשייה וניהול', 'מעבדה לפיזיקה 1', 0.25, 
  '[
    {"name": "ציון סופי", "weight": 100, "isMagen": false}
  ]', 'easy', 1),

('SCE', 'הנדסת תעשייה וניהול', 'יסודות החשבונאות', 3.5, 
  '[
    {"name": "מבחן סופי", "weight": 85, "isMagen": false}, 
    {"name": "תרגילים", "weight": 15, "isMagen": false}
  ]', 'medium', 1),

('SCE', 'הנדסת תעשייה וניהול', 'הסקה סטטיסטית', 4.0, 
  '[
    {"name": "מבחן סופי", "weight": 80, "isMagen": false}, 
    {"name": "פרויקט", "weight": 10, "isMagen": false}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}
  ]', 'hard', 1),

-- ==========================
-- שנה ב' - סמסטר א'
-- ==========================
('SCE', 'הנדסת תעשייה וניהול', 'יסודות התכנות א', 3.75, 
  '[
    {"name": "מבחן סופי", "weight": 80, "isMagen": false}, 
    {"name": "תרגילים", "weight": 20, "isMagen": false}
  ]', 'hard', 2),

('SCE', 'הנדסת תעשייה וניהול', 'כלכלה ניהולית', 3.5, 
  '[
    {"name": "מבחן סופי", "weight": 75, "isMagen": false}, 
    {"name": "תרגילים", "weight": 25, "isMagen": false}
  ]', 'medium', 2),

('SCE', 'הנדסת תעשייה וניהול', 'פיזיקה 2 ב', 3.5, 
  '[
    {"name": "מבחן סופי", "weight": 60, "isMagen": false}, 
    {"name": "בוחן מגן", "weight": 25, "isMagen": true}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}, 
    {"name": "נוכחות", "weight": 5, "isMagen": false}
  ]', 'hard', 2),

('SCE', 'הנדסת תעשייה וניהול', 'התנהגות ארגונית', 3.0, 
  '[
    {"name": "מבחן סופי", "weight": 75, "isMagen": false}, 
    {"name": "פרויקט", "weight": 25, "isMagen": false}
  ]', 'easy', 2),

('SCE', 'הנדסת תעשייה וניהול', 'מעבדה לפיזיקה 2', 0.25, 
  '[
    {"name": "ציון סופי", "weight": 100, "isMagen": false}
  ]', 'easy', 2),

('SCE', 'הנדסת תעשייה וניהול', 'חקר ביצועים דטרמיניסטי', 4.0, 
  '[
    {"name": "מבחן סופי", "weight": 90, "isMagen": false}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}
  ]', 'hard', 2),

('SCE', 'הנדסת תעשייה וניהול', 'מיקרו כלכלה', 4.0, 
  '[
    {"name": "מבחן סופי", "weight": 90, "isMagen": false}, 
    {"name": "תרגילים", "weight": 10, "isMagen": false}
  ]', 'medium', 2);

-- Update timestamp
UPDATE global_courses SET last_verified_at = NOW() WHERE university_name = 'SCE';
