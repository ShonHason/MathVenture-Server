// testPdf.ts
import fs from "fs";
import path from "path";
import LessonsController from "../controllers/lessonsController"; // adjust path!

async function generateDummyPdf() {
  // A dummy analysis object with all the fields your PDF-builder expects
  const fakeAnalysis = {
    "נושא השיעור": "חיבור וחיסור",
    "שאלות ותשובות": [
      {
        שאלה: "אם יש לך 2 תפוחים ועוד 3 תפוחים, כמה סך הכל?",
        תשובת_התלמיד: "5",
      },
      { שאלה: "מהו 7 מינוס 4?", תשובת_התלמיד: "3" },
      { שאלה: "2+2×2?", תשובת_התלמיד: "6" },
    ],
    אחוז_הצלחה: 100,
    טיפים_לשיפור: "כל הכבוד! תמשיך כך.",
    חוזקות: "הבנת הנושא במהירות",
    שיעורי_בית: [{ שאלה: "10+5?" }, { שאלה: "8-3?" }, { שאלה: "6×2?" }],
  };

  // Call the static method directly on LessonsController
  const pdfBuf = await LessonsController.generateLessonPdf(fakeAnalysis);

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
