import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SemesterWithCourses, User } from '@shared/schema';
import { calculateCourseGrade, calculateSemesterGpa, calculateDegreeGpa } from './gpaCalculations';

const semesterTermNames: Record<string, string> = {
  'A': "סמסטר א'",
  'B': "סמסטר ב'",
  'Summer': 'קיץ',
};

async function loadHebrewFont(doc: jsPDF): Promise<boolean> {
  try {
    const response = await fetch('https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4iFV0U1.ttf');
    if (!response.ok) return false;
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    doc.addFileToVFS('Rubik-Regular.ttf', base64);
    doc.addFont('Rubik-Regular.ttf', 'Rubik', 'normal');
    return true;
  } catch (error) {
    console.error('Failed to load Hebrew font:', error);
    return false;
  }
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
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginRight = 15;
  const marginLeft = 15;
  const contentWidth = pageWidth - marginRight - marginLeft;

  let yPosition = 20;

  if (hebrewFontLoaded) {
    doc.setFont('Rubik');
  } else {
    doc.setFont('helvetica', 'bold');
  }
  
  doc.setFontSize(24);
  doc.text('GradeGoal', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(14);
  if (hebrewFontLoaded) {
    doc.text('דוח ציונים', pageWidth / 2, yPosition, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('Grade Report', pageWidth / 2, yPosition, { align: 'center' });
  }

  yPosition += 15;

  if (user) {
    doc.setFontSize(11);
    if (hebrewFontLoaded) {
      doc.setFont('Rubik');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (userName) {
      const studentLabel = hebrewFontLoaded ? 'סטודנט:' : 'Student:';
      doc.text(`${studentLabel} ${userName}`, pageWidth - marginRight, yPosition, { align: 'right' });
      yPosition += 6;
    }
    
    const today = new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dateLabel = hebrewFontLoaded ? 'תאריך:' : 'Date:';
    doc.text(`${dateLabel} ${today}`, pageWidth - marginRight, yPosition, { align: 'right' });
    
    if (user.academicInstitution) {
      yPosition += 6;
      const instLabel = hebrewFontLoaded ? 'מוסד אקדמי:' : 'Institution:';
      doc.text(`${instLabel} ${user.academicInstitution}`, pageWidth - marginRight, yPosition, { align: 'right' });
    }
  }

  yPosition += 15;

  const overallGpa = calculateDegreeGpa(semesters);
  
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(marginLeft, yPosition - 5, contentWidth, 18, 2, 2, 'F');
  
  doc.setFontSize(16);
  if (hebrewFontLoaded) {
    doc.setFont('Rubik');
    doc.text(`ממוצע תואר: ${overallGpa !== null ? overallGpa.toFixed(2) : 'N/A'}`, pageWidth - marginRight - 5, yPosition + 3, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text(`Degree GPA: ${overallGpa !== null ? overallGpa.toFixed(2) : 'N/A'}`, marginLeft + 5, yPosition + 3);
  }

  const totalCredits = semesters.reduce((sum, sem) => 
    sum + sem.courses.reduce((cSum, c) => cSum + c.credits, 0), 0
  );
  const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);
  
  doc.setFontSize(10);
  if (hebrewFontLoaded) {
    doc.setFont('Rubik');
    doc.text(`סה"כ נק"ז: ${totalCredits.toFixed(1)}`, marginLeft + 5, yPosition + 3);
    doc.text(`קורסים: ${totalCourses}`, marginLeft + 5, yPosition + 8);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Credits: ${totalCredits.toFixed(1)}`, pageWidth - marginRight - 45, yPosition + 3);
    doc.text(`Courses: ${totalCourses}`, pageWidth - marginRight - 45, yPosition + 8);
  }

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
      yPosition = 20;
    }

    const semesterGpa = calculateSemesterGpa(semester.courses);
    const semesterCredits = semester.courses.reduce((sum, c) => sum + c.credits, 0);
    const termName = semesterTermNames[semester.term] || semester.term;
    
    doc.setFillColor(66, 66, 66);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(marginLeft, yPosition - 4, contentWidth, 10, 1, 1, 'F');
    
    doc.setFontSize(11);
    if (hebrewFontLoaded) {
      doc.setFont('Rubik');
      doc.text(`שנה ${semester.academicYear} - ${termName}`, pageWidth - marginRight - 3, yPosition + 2, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(`Year ${semester.academicYear} - ${termName}`, marginLeft + 3, yPosition + 2);
    }
    
    const gpaLabel = hebrewFontLoaded ? 'ממוצע:' : 'GPA:';
    const creditsLabel = hebrewFontLoaded ? 'נק"ז:' : 'Credits:';
    const gpaText = `${gpaLabel} ${semesterGpa !== null ? semesterGpa.toFixed(2) : 'N/A'} | ${creditsLabel} ${semesterCredits.toFixed(1)}`;
    doc.setFontSize(9);
    
    if (hebrewFontLoaded) {
      doc.text(gpaText, marginLeft + 3, yPosition + 2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(gpaText, pageWidth - marginRight - 3, yPosition + 2, { align: 'right' });
    }
    
    doc.setTextColor(0, 0, 0);
    yPosition += 8;

    const tableData = semester.courses.map(course => {
      const grade = calculateCourseGrade(course.gradeComponents);
      const componentsCompleted = course.gradeComponents.filter(c => c.score !== null && c.score !== undefined).length;
      const totalComponents = course.gradeComponents.length;
      
      return [
        course.name,
        course.credits.toFixed(1),
        grade !== null ? grade.toFixed(1) : '-',
        course.targetGrade !== null && course.targetGrade !== undefined 
          ? course.targetGrade.toFixed(1) 
          : '-',
        `${componentsCompleted}/${totalComponents}`,
      ];
    });

    const headers = hebrewFontLoaded 
      ? [['שם הקורס', 'נק"ז', 'ציון', 'יעד', 'התקדמות']]
      : [['Course Name', 'Credits', 'Grade', 'Target', 'Progress']];

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: headers,
        body: tableData,
        margin: { left: marginLeft, right: marginRight },
        tableWidth: contentWidth,
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: hebrewFontLoaded ? 'right' : 'left',
          cellPadding: 2,
          font: hebrewFontLoaded ? 'Rubik' : 'helvetica',
        },
        bodyStyles: {
          fontSize: 9,
          halign: hebrewFontLoaded ? 'right' : 'left',
          cellPadding: 2,
          font: hebrewFontLoaded ? 'Rubik' : 'helvetica',
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.38 },
          1: { cellWidth: contentWidth * 0.12, halign: 'center' },
          2: { cellWidth: contentWidth * 0.15, halign: 'center' },
          3: { cellWidth: contentWidth * 0.15, halign: 'center' },
          4: { cellWidth: contentWidth * 0.20, halign: 'center' },
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
      const noCoursesText = hebrewFontLoaded ? 'אין קורסים בסמסטר זה' : 'No courses in this semester';
      doc.text(noCoursesText, hebrewFontLoaded ? pageWidth - marginRight - 5 : marginLeft + 5, yPosition, 
        hebrewFontLoaded ? { align: 'right' } : undefined);
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }
  }

  if (yPosition > 260) {
    doc.addPage();
    yPosition = 20;
  }

  yPosition += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  if (hebrewFontLoaded) {
    doc.setFont('Rubik');
    doc.text('סיכום', pageWidth - marginRight, yPosition, { align: 'right' });
    
    yPosition += 6;
    doc.setFontSize(9);
    const summaryText = `סמסטרים: ${semesters.length} | קורסים: ${totalCourses} | נק"ז: ${totalCredits.toFixed(1)} | ממוצע תואר: ${overallGpa !== null ? overallGpa.toFixed(2) : 'N/A'}`;
    doc.text(summaryText, pageWidth - marginRight, yPosition, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', marginLeft, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Semesters: ${semesters.length}`, marginLeft, yPosition);
    doc.text(`Total Courses: ${totalCourses}`, marginLeft + 45, yPosition);
    doc.text(`Total Credits: ${totalCredits.toFixed(1)}`, marginLeft + 90, yPosition);
    doc.text(`Degree GPA: ${overallGpa !== null ? overallGpa.toFixed(2) : 'N/A'}`, marginLeft + 135, yPosition);
  }

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  if (hebrewFontLoaded) {
    doc.setFont('Rubik');
    const footerDate = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(
      `נוצר על ידי GradeGoal בתאריך ${footerDate}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  } else {
    doc.text(
      `Generated by GradeGoal on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join('-') : 'student';
  const sanitizedName = userName.replace(/[^a-zA-Z0-9\u0590-\u05FF-]/g, '') || 'student';
  const fileName = `gradegoal-report-${sanitizedName}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
