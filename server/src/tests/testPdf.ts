// testPdf.ts
import fs from "fs";
import path from "path";
import LessonsController from "../controllers/lessonsController";
import { generateLessonPdf } from "../services/pdfGenerator";

async function generateDummyPdf() {
  // A dummy analysis object with all the fields your PDF-builder expects
  const fakeAnalysis = {
    "נושא השיעור": "חיבור עד 100",
    אחוז_הצלחה: 70.0,
    טיפים_לשיפור:
      "דניאל מתקשה בחיבור מספרים שיש בהם העברה לעשרות. כדאי לתרגל איתו שימוש באמצעי המחשה כמו אסימונים או קוביות. מומלץ לשחק משחקי קופסה או קלפים שכוללים חיבור מספרים. רצוי לעזור לו לפתח אסטרטגיות חישוב מנטלי כמו השלמה לעשרות.",
    חוזקות:
      "דניאל שולט היטב בחיבור מספרים עגולים ובחיבור חד ספרתי. הוא מפגין יכולת טובה בזיהוי דפוסים מספריים ובאימות תשובות. יש לו גישה חיובית ללמידה והוא משתף פעולה בשיעורים.",
    שיעורי_בית: [
      { שאלה: "25 + 30 = ?" },
      { שאלה: "48 + 12 = ?" },
      { שאלה: "60 + 15 = ?" },
      { שאלה: "33 + 40 = ?" },
      { שאלה: "17 + 29 = ?" },
      { שאלה: "52 + 24 = ?" },
      { שאלה: "41 + 38 = ?" },
      { שאלה: "22 + 19 = ?" },
      { שאלה: "70 + 10 = ?" },
      { שאלה: "56 + 14 = ?" },
    ],
  };

  // Call the method on LessonsController
  const pdfBuf = await generateLessonPdf(fakeAnalysis);

  // write to disk
  const outPath = path.resolve(__dirname, "out.pdf");
  fs.writeFileSync(outPath, pdfBuf);
  console.log("✅ PDF written to", outPath);
}

// run it
generateDummyPdf().catch((err) => {
  
  console.error("❌ failed to generate PDF:", err);
  process.exit(1);
});
