/**
 * Generates an HTML email template for lesson reports
 * @param params Configuration parameters for the email
 * @returns HTML string for the email
 */
export function generateLessonReportEmail(params: {
  studentName?: string;
  parentName?: string;
  lessonSubject: string;
}): string {
  const {
    studentName = "תלמיד יקר",
    parentName = "הורה יקר",
    lessonSubject,
  } = params;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      line-height: 1.5;
      color: #4a148c;
      background: linear-gradient(135deg, #7e57c2 0%, #4a148c 100%);
      margin: 0;
      padding: 10px;
      direction: rtl;
      text-align: right;
    }
    
    .container {
      max-width: 550px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(74, 20, 140, 0.2);
      position: relative;
      direction: rtl;
      text-align: right;
    }
    
    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #9575cd, #7e57c2, #673ab7, #5e35b1, #4a148c);
    }
    
    .header {
      background: linear-gradient(135deg, #7e57c2 0%, #5e35b1 100%);
      color: white;
      text-align: center;
      padding: 20px 15px;
      position: relative;
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 12px solid #5e35b1;
    }
    
    h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(74, 20, 140, 0.3);
      letter-spacing: 0.5px;
      border: none;
      padding: 0;
      text-align: center;
    }
    
    .subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 5px;
      font-weight: 300;
      text-align: center;
    }
    
    .content {
      padding: 20px 15px;
      background-color: #ffffff;
      direction: rtl;
      text-align: right;
    }
    
    .greeting {
      font-size: 17px;
      color: #4a148c;
      margin-bottom: 15px;
      font-weight: 600;
      position: relative;
      text-align: right;
      direction: rtl;
    }
    
    .greeting::before {
      content: '👋 ';
      margin-left: 5px;
    }
    
    .lesson-highlight {
      background: linear-gradient(135deg, #f8f5ff 0%, #ede7f6 100%);
      border-right: 4px solid #673ab7;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(103, 58, 183, 0.1);
      position: relative;
      text-align: right;
      direction: rtl;
    }
    
    .lesson-highlight p {
      text-align: right;
      direction: rtl;
      margin: 0 0 8px 0;
      font-size: 15px;
      color: #4a148c;
    }
    
    .lesson-subject {
      font-size: 16px;
      font-weight: 700;
      color: #5e35b1;
      background: linear-gradient(135deg, #ffffff 0%, #f3e5f5 100%);
      padding: 8px 15px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      box-shadow: 0 2px 8px rgba(103, 58, 183, 0.1);
      border: 1px solid #d1c4e9;
      text-align: right;
      direction: rtl;
    }
    
    .report-section {
      background: linear-gradient(135deg, #f5f2fa 0%, #ede7f6 100%);
      border-radius: 10px;
      padding: 20px 15px;
      margin: 20px 0;
      border: 1px solid #d1c4e9;
      position: relative;
      text-align: right;
      direction: rtl;
    }
    
    .report-section h3 {
      color: #4a148c;
      margin: 0 0 15px 0;
      font-size: 16px;
      font-weight: 600;
      text-align: right;
      direction: rtl;
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      text-align: right;
      direction: rtl;
    }
    
    li {
      background: linear-gradient(135deg, #ffffff 0%, #f3e5f5 100%);
      margin: 10px 0;
      padding: 12px 15px;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(103, 58, 183, 0.08);
      border-right: 3px solid #9575cd;
      position: relative;
      font-size: 14px;
      line-height: 1.5;
      text-align: right;
      direction: rtl;
    }
    
    li::before {
      content: '✓';
      position: absolute;
      right: -12px;
      top: 50%;
      transform: translateY(-50%);
      background: #9575cd;
      color: white;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(103, 58, 183, 0.2);
    }
    
    li:nth-child(2)::before {
      background: #7e57c2;
    }
    
    li:nth-child(3)::before {
      background: #673ab7;
    }
    
    li:nth-child(4)::before {
      background: #5e35b1;
    }
    
    .message-box {
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      border: 1px solid #ce93d8;
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
      text-align: right;
      direction: rtl;
      position: relative;
    }
    
    .message-box p {
      margin: 0;
      color: #4a148c;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
      direction: rtl;
    }
    
    .contact-section {
      background: linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%);
      border: 1px solid #b39ddb;
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
      text-align: right;
      direction: rtl;
      position: relative;
    }
    
    .contact-section p {
      margin: 0;
      color: #4a148c;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
      direction: rtl;
    }
    
    .decorative-line {
      height: 2px;
      background: linear-gradient(90deg, transparent, #7e57c2, transparent);
      margin: 15px 0;
      border-radius: 2px;
    }
    
    .footer {
      background: linear-gradient(135deg, #4a148c 0%, #311b92 100%);
      color: #ffffff;
      text-align: center;
      padding: 20px 15px;
      position: relative;
    }
    
    .footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #9575cd, #7e57c2, #673ab7, #5e35b1, #4a148c);
    }
    
    .footer p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }
    
    .team-signature {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 5px;
      text-align: center;
    }
    
    .footer-message {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 10px;
      line-height: 1.4;
      text-align: center;
    }
    
    @media only screen and (max-width: 600px) {
      .content {
        padding: 15px 12px;
      }
      
      .header {
        padding: 18px 15px;
      }
      
      h1 {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>דוח שיעור MathVenture</h1>
      <div class="subtitle">מערכת מעקב והתקדמות אישית</div>
    </div>
    
    <div class="content">
      <div class="greeting">שלום ${parentName}</div>
      
      <div class="lesson-highlight">
        <p>מצורף דוח השיעור של <strong style="color: #5e35b1;">${studentName}</strong></p>
        <div class="lesson-subject">${lessonSubject}</div>
      </div>
      
      <div class="decorative-line"></div>
      
      <div class="report-section">
        <h3>בדוח תוכלו למצוא:</h3>
        <ul>
          <li><strong>סיכום נושאי השיעור</strong> - סקירה של החומר שנלמד</li>
          <li><strong>טיפים לשיפור</strong> - המלצות מותאמות אישית</li>
          <li><strong>חוזקות שזוהו</strong> - נקודות חוזק בשיעור</li>
          <li><strong>תרגילי בית</strong> - תרגול להמשך התקדמות</li>
        </ul>
      </div>
      
      <div class="message-box">
        <p><strong>אנחנו מקווים שתמצאו את הדוח מועיל ומעשיר!</strong></p>
      </div>
      
      <div class="contact-section">
        <p><strong>יש שאלות?</strong> אנחנו כאן בשבילכם!</p>
      </div>
    </div>
    
    <div class="footer">
      <div class="team-signature">צוות MathVenture</div>
      <p>בברכה ובהצלחה</p>
      <div class="footer-message">מלווים אתכם בדרך למצוינות במתמטיקה</div>
    </div>
  </div>
</body>
</html>
  `;
}
