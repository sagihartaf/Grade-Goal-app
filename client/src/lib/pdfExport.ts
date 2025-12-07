import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SemesterWithCourses, User } from '@shared/schema';
import { calculateCourseGrade, calculateSemesterGpa, calculateDegreeGpa } from './gpaCalculations';

const semesterTermNames: Record<string, string> = {
  'A': "א'",
  'B': "ב'",
  'Summer': 'קיץ',
};

async function loadHebrewFont(doc: jsPDF): Promise<boolean> {
  const fontUrls = [
    'https://fonts.gstatic.com/s/rubik/v28/iJWKBXyIfDnIV7nBrXw.ttf',
    'https://fonts.gstatic.com/s/rubik/v21/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4iFV0U1.ttf',
  ];
  
  for (const url of fontUrls) {
    try {
      const response = await fetch(url, { 
        mode: 'cors',
        cache: 'force-cache' 
      });
      
      if (!response.ok) continue;
      
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 1000) continue;
      
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      
      doc.addFileToVFS('Rubik-Regular.ttf', base64);
      doc.addFont('Rubik-Regular.ttf', 'Rubik', 'normal');
      doc.setFont('Rubik');
      
      return true;
    } catch (error) {
      console.warn('Font load attempt failed:', url, error);
      continue;
    }
  }
  
  console.error('All Hebrew font loading attempts failed');
  return false;
}

export async function generateGradeReport(
  semesters: SemesterWithCourses[],
  user: User | null | undefined
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hebrewFontLoaded = await loadHebrewFont(doc);
  
  if (!hebrewFontLoaded) {
    console.error('Hebrew font failed to load - PDF may not display correctly');
  }
  
  doc.setFont('Rubik');
  (doc as any).setR2L(true);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 15;
  const leftX = 15;
  const contentWidth = pageWidth - 30;

  let yPosition = 20;

  doc.setFontSize(22);
  doc.text('GradeGoal', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(14);
  doc.text('גיליון ציונים', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  if (user) {
    doc.setFontSize(11);
    
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (userName) {
      doc.text(`סטודנט: ${userName}`, rightX, yPosition, { align: 'right' });
      yPosition += 6;
    }
    
    const today = new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`תאריך: ${today}`, rightX, yPosition, { align: 'right' });
    
    if (user.academicInstitution) {
      yPosition += 6;
      doc.text(`מוסד אקדמי: ${user.academicInstitution}`, rightX, yPosition, { align: 'right' });
    }
  }

  yPosition += 15;

  const overallGpa = calculateDegreeGpa(semesters);
  
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(leftX, yPosition - 5, contentWidth, 18, 2, 2, 'F');
  
  doc.setFontSize(16);
  const gpaDisplay = overallGpa !== null ? overallGpa.toFixed(2) : '---';
  doc.text(`ממוצע לתואר: ${gpaDisplay}`, rightX - 5, yPosition + 3, { align: 'right' });

  const totalCredits = semesters.reduce((sum, sem) => 
    sum + sem.courses.reduce((cSum, c) => cSum + c.credits, 0), 0
  );
  const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);
  
  doc.setFontSize(10);
  doc.text(`סה״כ נק״ז: ${totalCredits.toFixed(1)} | קורסים: ${totalCourses}`, leftX + 5, yPosition + 3, { align: 'left' });

  yPosition += 22;

  const sortedSemesters = [...semesters].sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
    const termOrder = { 'A': 0, 'B': 1, 'Summer': 2 };
    return (termOrder[a.term as keyof typeof termOrder] || 0) - 
           (termOrder[b.term as keyof typeof termOrder] || 0);
  });

  for (const semester of sortedSemesters) {
    if (yPosition > 245) {
      doc.addPage();
      doc.setFont('Rubik');
      yPosition = 20;
    }

    const semesterGpa = calculateSemesterGpa(semester.courses);
    const semesterCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
    const termName = semesterTermNames[semester.term] || semester.term;
    
    doc.setFillColor(66, 66, 66);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(leftX, yPosition - 4, contentWidth, 10, 1, 1, 'F');
    
    doc.setFontSize(11);
    doc.text(`שנה ${semester.academicYear} - סמסטר ${termName}`, rightX - 3, yPosition + 2, { align: 'right' });
    
    doc.setFontSize(9);
    const semGpaDisplay = semesterGpa !== null ? semesterGpa.toFixed(2) : '---';
    const gpaText = `ממוצע: ${semGpaDisplay} | נק״ז: ${semesterCredits.toFixed(1)}`;
    doc.text(gpaText, leftX + 3, yPosition + 2, { align: 'left' });
    
    doc.setTextColor(0, 0, 0);
    yPosition += 8;

    const tableData = semester.courses.map(course => {
      const grade = calculateCourseGrade(course.gradeComponents);
      const componentsCompleted = course.gradeComponents.filter(c => c.score !== null && c.score !== undefined).length;
      const totalComponents = course.gradeComponents.length;
      
      return [
        `${componentsCompleted}/${totalComponents}`,
        course.targetGrade !== null && course.targetGrade !== undefined 
          ? course.targetGrade.toFixed(1) 
          : '-',
        grade !== null ? grade.toFixed(1) : '-',
        course.credits.toFixed(1),
        course.name,
      ];
    });

    const headers = [[
      'התקדמות',
      'יעד',
      'ציון',
      'נק״ז',
      'שם הקורס',
    ]];

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: headers,
        body: tableData,
        margin: { left: leftX, right: 15 },
        tableWidth: contentWidth,
        headStyles: {
          fillColor: [80, 80, 80],
          textColor: 255,
          fontStyle: 'normal',
          fontSize: 9,
          halign: 'right',
          cellPadding: 3,
          font: 'Rubik',
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'right',
          cellPadding: 3,
          font: 'Rubik',
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.12, halign: 'center' },
          1: { cellWidth: contentWidth * 0.10, halign: 'center' },
          2: { cellWidth: contentWidth * 0.12, halign: 'center' },
          3: { cellWidth: contentWidth * 0.10, halign: 'center' },
          4: { cellWidth: contentWidth * 0.56, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2 && data.cell.text[0] !== '-') {
            const grade = parseFloat(data.cell.text[0]);
            if (grade >= 85) {
              data.cell.styles.textColor = [34, 139, 34];
            } else if (grade >= 60) {
              data.cell.styles.textColor = [0, 0, 0];
            } else {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    } else {
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('אין קורסים בסמסטר זה', rightX - 5, yPosition, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }
  }

  if (yPosition > 260) {
    doc.addPage();
    doc.setFont('Rubik');
    yPosition = 20;
  }

  yPosition += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(leftX, yPosition, rightX, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  doc.text('סיכום', rightX, yPosition, { align: 'right' });
  
  yPosition += 6;
  doc.setFontSize(9);
  const summaryGpa = overallGpa !== null ? overallGpa.toFixed(2) : '---';
  const summaryText = `סמסטרים: ${semesters.length} | קורסים: ${totalCourses} | נק״ז: ${totalCredits.toFixed(1)} | ממוצע לתואר: ${summaryGpa}`;
  doc.text(summaryText, rightX, yPosition, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const footerDate = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(
    `נוצר על ידי GradeGoal בתאריך ${footerDate}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join('-') : 'student';
  const sanitizedName = userName.replace(/[^a-zA-Z0-9\u0590-\u05FF-]/g, '') || 'student';
  const fileName = `gradegoal-report-${sanitizedName}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
