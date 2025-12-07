import type { SemesterWithCourses, User } from '@shared/schema';
import { calculateCourseGrade, calculateSemesterGpa, calculateDegreeGpa, calculateCourseGradeWithMagenInfo } from '@/lib/gpaCalculations';
import { ShieldOff } from 'lucide-react';

interface PrintableReportProps {
  semesters: SemesterWithCourses[];
  user: User | null | undefined;
}

const semesterTermNames: Record<string, string> = {
  'A': "א'",
  'B': "ב'",
  'Summer': 'קיץ',
};

export function PrintableReport({ semesters, user }: PrintableReportProps) {
  const overallGpa = calculateDegreeGpa(semesters);
  const totalCredits = semesters.reduce((sum, sem) => 
    sum + sem.courses.reduce((cSum, c) => cSum + c.credits, 0), 0
  );
  const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);

  const sortedSemesters = [...semesters].sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
    const termOrder = { 'A': 0, 'B': 1, 'Summer': 2 };
    return (termOrder[a.term as keyof typeof termOrder] || 0) - 
           (termOrder[b.term as keyof typeof termOrder] || 0);
  });

  const today = new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';

  return (
    <div 
      className="print-report"
      style={{
        direction: 'rtl',
        fontFamily: 'Rubik, Arial, sans-serif',
        padding: '20px',
        maxWidth: '210mm',
        margin: '0 auto',
        backgroundColor: 'white',
        color: 'black',
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-report {
            font-size: 11pt;
          }
          
          .print-header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .semester-header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #424242 !important;
            color: white !important;
          }
          
          .table-header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #505050 !important;
          }
          
          .alt-row {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #f8f8f8 !important;
          }
          
          .gpa-box {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #f0f0f0 !important;
          }
          
          .grade-high {
            color: #228B22 !important;
          }
          
          .grade-low {
            color: #DC3545 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Header */}
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0 0 8px 0' }}>GradeGoal</h1>
        <h2 style={{ fontSize: '14pt', fontWeight: 'normal', margin: '0', color: '#666' }}>גיליון ציונים</h2>
      </div>

      {/* User Info */}
      {(userName || user?.academicInstitution) && (
        <div style={{ marginBottom: '15px', textAlign: 'right' }}>
          {userName && (
            <p style={{ margin: '0 0 4px 0', fontSize: '11pt' }}>
              <strong>סטודנט:</strong> {userName}
            </p>
          )}
          {user?.academicInstitution && (
            <p style={{ margin: '0 0 4px 0', fontSize: '11pt' }}>
              <strong>מוסד אקדמי:</strong> {user.academicInstitution}
            </p>
          )}
          <p style={{ margin: '0', fontSize: '11pt' }}>
            <strong>תאריך:</strong> {today}
          </p>
        </div>
      )}

      {/* Degree GPA Summary */}
      <div 
        className="gpa-box"
        style={{
          backgroundColor: '#f0f0f0',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>
          ממוצע לתואר: {overallGpa !== null ? overallGpa.toFixed(2) : '---'}
        </div>
        <div style={{ fontSize: '10pt', color: '#666' }}>
          סה״כ נק״ז: {totalCredits.toFixed(1)} | קורסים: {totalCourses}
        </div>
      </div>

      {/* Semesters */}
      {sortedSemesters.map((semester) => {
        const semesterGpa = calculateSemesterGpa(semester.courses);
        const semesterCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
        const termName = semesterTermNames[semester.term] || semester.term;

        return (
          <div key={semester.id} style={{ marginBottom: '20px' }}>
            {/* Semester Header */}
            <div 
              className="semester-header"
              style={{
                backgroundColor: '#424242',
                color: 'white',
                borderRadius: '4px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2px',
              }}
            >
              <span style={{ fontSize: '11pt', fontWeight: 'bold' }}>
                שנה {semester.academicYear} - סמסטר {termName}
              </span>
              <span style={{ fontSize: '9pt' }}>
                ממוצע: {semesterGpa !== null ? semesterGpa.toFixed(2) : '---'} | נק״ז: {semesterCredits.toFixed(1)}
              </span>
            </div>

            {/* Course Table */}
            {semester.courses.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <thead>
                  <tr 
                    className="table-header"
                    style={{ backgroundColor: '#505050', color: 'white' }}
                  >
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '45%' }}>שם הקורס</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '10%' }}>נק״ז</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>ציון</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '10%' }}>יעד</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>התקדמות</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '11%' }}>מגן</th>
                  </tr>
                </thead>
                <tbody>
                  {semester.courses.map((course, index) => {
                    const gradeInfo = calculateCourseGradeWithMagenInfo(course.gradeComponents);
                    const grade = gradeInfo.grade;
                    const magenDropped = gradeInfo.magenDropped;
                    const componentsCompleted = course.gradeComponents.filter(c => c.score !== null && c.score !== undefined).length;
                    const totalComponents = course.gradeComponents.length;
                    
                    let gradeClass = '';
                    if (grade !== null) {
                      if (grade >= 85) gradeClass = 'grade-high';
                      else if (grade < 60) gradeClass = 'grade-low';
                    }

                    return (
                      <tr 
                        key={course.id}
                        className={index % 2 === 1 ? 'alt-row' : ''}
                        style={{ 
                          backgroundColor: index % 2 === 1 ? '#f8f8f8' : 'transparent',
                          borderBottom: '1px solid #e0e0e0',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{course.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{course.credits.toFixed(1)}</td>
                        <td 
                          className={gradeClass}
                          style={{ 
                            padding: '8px 10px', 
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: grade !== null ? (grade >= 85 ? '#228B22' : grade < 60 ? '#DC3545' : 'inherit') : 'inherit',
                          }}
                        >
                          {grade !== null ? grade.toFixed(1) : '-'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {course.targetGrade !== null && course.targetGrade !== undefined 
                            ? course.targetGrade.toFixed(1) 
                            : '-'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {componentsCompleted}/{totalComponents}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {magenDropped ? (
                            <span style={{ color: '#D97706' }} title="מגן בוטל - ציון המגן היה נמוך מהמבחן">
                              בוטל
                            </span>
                          ) : (
                            course.gradeComponents.some(c => c.isMagen) ? 'פעיל' : '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#888', fontSize: '10pt', padding: '8px 0' }}>אין קורסים בסמסטר זה</p>
            )}
          </div>
        );
      })}

      {/* Summary */}
      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ccc' }}>
        <h3 style={{ fontSize: '11pt', margin: '0 0 8px 0' }}>סיכום</h3>
        <p style={{ fontSize: '10pt', margin: 0 }}>
          סמסטרים: {semesters.length} | קורסים: {totalCourses} | נק״ז: {totalCredits.toFixed(1)} | ממוצע לתואר: {overallGpa !== null ? overallGpa.toFixed(2) : '---'}
        </p>
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: '30px', 
        textAlign: 'center', 
        fontSize: '9pt', 
        color: '#888',
      }}>
        נוצר על ידי GradeGoal בתאריך {today}
      </div>
    </div>
  );
}

export function openPrintReport(semesters: SemesterWithCourses[], user: User | null | undefined) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('אנא אפשר חלונות קופצים כדי להדפיס את הדוח');
    return;
  }

  const overallGpa = calculateDegreeGpa(semesters);
  const totalCredits = semesters.reduce((sum, sem) => 
    sum + sem.courses.reduce((cSum, c) => cSum + c.credits, 0), 0
  );
  const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);

  const sortedSemesters = [...semesters].sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
    const termOrder = { 'A': 0, 'B': 1, 'Summer': 2 };
    return (termOrder[a.term as keyof typeof termOrder] || 0) - 
           (termOrder[b.term as keyof typeof termOrder] || 0);
  });

  const today = new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';

  const semestersHtml = sortedSemesters.map(semester => {
    const semesterGpa = calculateSemesterGpa(semester.courses);
    const semesterCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
    const termName = semesterTermNames[semester.term] || semester.term;

    const coursesHtml = semester.courses.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <thead>
          <tr style="background-color: #505050; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <th style="padding: 8px 10px; text-align: right; width: 45%;">שם הקורס</th>
            <th style="padding: 8px 10px; text-align: center; width: 10%;">נק״ז</th>
            <th style="padding: 8px 10px; text-align: center; width: 12%;">ציון</th>
            <th style="padding: 8px 10px; text-align: center; width: 10%;">יעד</th>
            <th style="padding: 8px 10px; text-align: center; width: 12%;">התקדמות</th>
            <th style="padding: 8px 10px; text-align: center; width: 11%;">מגן</th>
          </tr>
        </thead>
        <tbody>
          ${semester.courses.map((course, index) => {
            const gradeInfo = calculateCourseGradeWithMagenInfo(course.gradeComponents);
            const grade = gradeInfo.grade;
            const magenDropped = gradeInfo.magenDropped;
            const componentsCompleted = course.gradeComponents.filter(c => c.score !== null && c.score !== undefined).length;
            const totalComponents = course.gradeComponents.length;
            
            let gradeColor = 'inherit';
            if (grade !== null) {
              if (grade >= 85) gradeColor = '#228B22';
              else if (grade < 60) gradeColor = '#DC3545';
            }

            const hasMagen = course.gradeComponents.some(c => c.isMagen);
            const magenStatus = magenDropped ? '<span style="color: #D97706;">בוטל</span>' : (hasMagen ? 'פעיל' : '-');

            return `
              <tr style="background-color: ${index % 2 === 1 ? '#f8f8f8' : 'transparent'}; border-bottom: 1px solid #e0e0e0; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <td style="padding: 8px 10px; text-align: right;">${course.name}</td>
                <td style="padding: 8px 10px; text-align: center;">${course.credits.toFixed(1)}</td>
                <td style="padding: 8px 10px; text-align: center; font-weight: bold; color: ${gradeColor};">${grade !== null ? grade.toFixed(1) : '-'}</td>
                <td style="padding: 8px 10px; text-align: center;">${course.targetGrade !== null && course.targetGrade !== undefined ? course.targetGrade.toFixed(1) : '-'}</td>
                <td style="padding: 8px 10px; text-align: center;">${componentsCompleted}/${totalComponents}</td>
                <td style="padding: 8px 10px; text-align: center;">${magenStatus}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '<p style="color: #888; font-size: 10pt; padding: 8px 0;">אין קורסים בסמסטר זה</p>';

    return `
      <div style="margin-bottom: 20px;">
        <div style="background-color: #424242; color: white; border-radius: 4px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <span style="font-size: 11pt; font-weight: bold;">שנה ${semester.academicYear} - סמסטר ${termName}</span>
          <span style="font-size: 9pt;">ממוצע: ${semesterGpa !== null ? semesterGpa.toFixed(2) : '---'} | נק״ז: ${semesterCredits.toFixed(1)}</span>
        </div>
        ${coursesHtml}
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>GradeGoal - גיליון ציונים</title>
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Rubik', Arial, sans-serif;
          direction: rtl;
          background: white;
          color: black;
          padding: 20px;
          max-width: 210mm;
          margin: 0 auto;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24pt; font-weight: bold; margin: 0 0 8px 0;">GradeGoal</h1>
        <h2 style="font-size: 14pt; font-weight: normal; margin: 0; color: #666;">גיליון ציונים</h2>
      </div>

      <!-- User Info -->
      ${(userName || user?.academicInstitution) ? `
        <div style="margin-bottom: 15px; text-align: right;">
          ${userName ? `<p style="margin: 0 0 4px 0; font-size: 11pt;"><strong>סטודנט:</strong> ${userName}</p>` : ''}
          ${user?.academicInstitution ? `<p style="margin: 0 0 4px 0; font-size: 11pt;"><strong>מוסד אקדמי:</strong> ${user.academicInstitution}</p>` : ''}
          <p style="margin: 0; font-size: 11pt;"><strong>תאריך:</strong> ${today}</p>
        </div>
      ` : ''}

      <!-- Degree GPA Summary -->
      <div style="background-color: #f0f0f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <div style="font-size: 16pt; font-weight: bold;">
          ממוצע לתואר: ${overallGpa !== null ? overallGpa.toFixed(2) : '---'}
        </div>
        <div style="font-size: 10pt; color: #666;">
          סה״כ נק״ז: ${totalCredits.toFixed(1)} | קורסים: ${totalCourses}
        </div>
      </div>

      <!-- Semesters -->
      ${semestersHtml}

      <!-- Summary -->
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc;">
        <h3 style="font-size: 11pt; margin: 0 0 8px 0;">סיכום</h3>
        <p style="font-size: 10pt; margin: 0;">
          סמסטרים: ${semesters.length} | קורסים: ${totalCourses} | נק״ז: ${totalCredits.toFixed(1)} | ממוצע לתואר: ${overallGpa !== null ? overallGpa.toFixed(2) : '---'}
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; text-align: center; font-size: 9pt; color: #888;">
        נוצר על ידי GradeGoal בתאריך ${today}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
