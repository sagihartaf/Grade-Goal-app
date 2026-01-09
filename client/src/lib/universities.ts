/**
 * Israeli Universities and Academic Institutions
 * Structure: { label: "Hebrew Name", value: "English Code" }
 * The value is what gets saved to the database
 */

export interface University {
  label: string;
  value: string;
}

export const ISRAELI_UNIVERSITIES: University[] = [
  { label: "המכללה האקדמית להנדסה ע״ש סמי שמעון", value: "SCE" },
  { label: "אוניברסיטת בן־גוריון בנגב", value: "BGU" },
  { label: "האוניברסיטה העברית בירושלים", value: "HUJI" },
  { label: "אוניברסיטת תל אביב", value: "TAU" },
  { label: "הטכניון – מכון טכנולוגי לישראל", value: "Technion" },
  { label: "אוניברסיטת בר־אילן", value: "BIU" },
  { label: "אוניברסיטת חיפה", value: "UHaifa" },
  { label: "מכון ויצמן למדע", value: "WIS" },
  { label: "האוניברסיטה הפתוחה", value: "OPENU" },
  { label: "אוניברסיטת רייכמן", value: "Reichman" },
  { label: "המכללה למינהל – המסלול האקדמי", value: "COMAS" },
  { label: "המרכז האקדמי למשפט ולעסקים", value: "CLB" },
  { label: "המרכז האקדמי פרס", value: "PAC" },
  { label: "המרכז האקדמי רופין", value: "Ruppin" },
  { label: "המכללה האקדמית תל אביב–יפו", value: "TAJ" },
  { label: "המכללה האקדמית אשקלון", value: "AAC" },
  { label: "המכללה האקדמית גליל מערבי", value: "WAGC" },
  { label: "המכללה האקדמית עמק יזרעאל", value: "YVC" },
  { label: "המכללה האקדמית כנרת", value: "KAC" },
  { label: "המכללה האקדמית תל־חי", value: "Tel-Hai" },
  { label: "המכללה האקדמית נתניה", value: "Netanya" },
  { label: "המכללה האקדמית אונו", value: "ONO" },
  { label: "מכללת ספיר", value: "Sapir" },
  { label: "מכללת שנקר", value: "Shenkar" },
  { label: "מכללת אפקה להנדסה", value: "Afeka" },
  { label: "מכללת אורט בראודה להנדסה", value: "Braude" },
  { label: "בצלאל – אקדמיה לאמנות ועיצוב ירושלים", value: "Bezalel" },
  { label: "מכללת אורנים", value: "Oranim" },
  { label: "מכללת קיי", value: "Kay" },
  { label: "המכללה האקדמית בית ברל", value: "Beit Berl" },
  { label: "מכללת גורדון לחינוך", value: "Gordon" },
  { label: "מכללת שאנן", value: "Shaanan" },
  { label: "מכללת אחוה", value: "Achva" },
];

/**
 * Get Hebrew label by English code
 */
export function getUniversityLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return ISRAELI_UNIVERSITIES.find((u) => u.value === code)?.label;
}

/**
 * Get English code by Hebrew label (for backwards compatibility)
 */
export function getUniversityCode(label: string | null | undefined): string | undefined {
  if (!label) return undefined;
  return ISRAELI_UNIVERSITIES.find((u) => u.label === label)?.value;
}

/**
 * Degrees by University Code
 * Maps university codes to their available degree programs
 * Structure: { [UniversityCode]: string[] }
 */
export const DEGREES_BY_UNIVERSITY: Record<string, string[]> = {
  'SCE': [
    "הנדסת תעשייה וניהול",
    "הנדסת תוכנה",
    "הנדסת חשמל",
    "הנדסת מכונות",
    "הנדסת בניין",
    "הנדסת כימיה"
  ],
  'BGU': [
    "הנדסת מערכות מידע",
    "מדעי המחשב",
    "הנדסת תעשייה וניהול",
    "הנדסת חשמל",
    "הנדסת מכונות",
    "כלכלה",
    "פסיכולוגיה"
  ],
  'Technion': [
    "הנדסת תעשייה וניהול",
    "מדעי המחשב",
    "הנדסת חשמל",
    "הנדסת מכונות",
    "הנדסת בניין",
    "הנדסת כימיה",
    "הנדסת אווירונאוטיקה"
  ],
  'TAU': [
    "מדעי המחשב",
    "הנדסת תעשייה וניהול",
    "הנדסת חשמל",
    "כלכלה",
    "פסיכולוגיה",
    "משפטים"
  ],
  'HUJI': [
    "מדעי המחשב",
    "הנדסת תעשייה וניהול",
    "כלכלה",
    "פסיכולוגיה",
    "משפטים"
  ],
  'BIU': [
    "מדעי המחשב",
    "הנדסת תעשייה וניהול",
    "כלכלה",
    "פסיכולוגיה"
  ],
  'UHaifa': [
    "מדעי המחשב",
    "הנדסת תעשייה וניהול",
    "כלכלה",
    "פסיכולוגיה"
  ],
  // Add more universities as needed
  // Default fallback for others is an empty array
};

/**
 * Get available degrees for a university code
 */
export function getDegreesForUniversity(universityCode: string | null | undefined): string[] {
  if (!universityCode) return [];
  return DEGREES_BY_UNIVERSITY[universityCode] || [];
}
