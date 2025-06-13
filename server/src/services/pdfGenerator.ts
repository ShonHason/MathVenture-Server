// @ts-ignore: no types for internal printer
import PdfPrinter from "pdfmake/src/printer";
import path from "path";
import fs from "fs";

// Load SVG and font resources
const svgPath = path.resolve(__dirname, "../fonts/MathVentureBot - Copy.svg");
const svgContent = fs.readFileSync(svgPath, "utf8");
const fonts = {
  HebrewFont: {
    normal: path.resolve(
      __dirname,
      "../fonts/NotoSansHebrew_Condensed-Regular.ttf"
    ),
    bold: path.resolve(__dirname, "../fonts/NotoSansHebrew_Condensed-Bold.ttf"),
    italics: path.resolve(
      __dirname,
      "../fonts/NotoSansHebrew_Condensed-Regular.ttf"
    ),
  },
};
const printer = new PdfPrinter(fonts);

export async function generateLessonPdf(analysis: any): Promise<Buffer> {
  // Function to sanitize text by removing ONLY problematic dashes
  function sanitizeText(text: string): string {
    if (!text) return "";
    // Replace em-dashes with spaces, but keep colons
    return text.replace(/—/g, " ");
  }

  // Simple word reversal without handling special punctuation
  function reverseWordOrder(text: string): string {
    // First sanitize the text
    const sanitized = sanitizeText(text);
    return sanitized.split(" ").reverse().join("  "); // Double spaces between words
  }

  // Helper function to split text into sentences
  function splitSentences(text: string): string[] {
    if (!text) return [];
    // First sanitize the text
    const sanitized = sanitizeText(text);
    // Split text on period, question mark, or exclamation mark followed by space
    return sanitized
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
  }

  // Format today's date
  const today = new Date();
  const dateString = today.toLocaleDateString("he-IL"); // Hebrew date format

  // First sanitize all text inputs - ONLY REMOVING DASHES
  const sanitizedAnalysis = {
    ...analysis,
    "נושא השיעור": sanitizeText(analysis["נושא השיעור"] || ""),
    טיפים_לשיפור: sanitizeText(analysis["טיפים_לשיפור"] || ""),
    חוזקות: sanitizeText(analysis["חוזקות"] || ""),
    שיעורי_בית: (analysis["שיעורי_בית"] || []).map((hw: any) => ({
      ...hw,
      שאלה: sanitizeText(hw.שאלה || ""),
    })),
  };

  // Split tips and strengths into sentences
  const tipsSentences = splitSentences(sanitizedAnalysis["טיפים_לשיפור"]);
  const strengthsSentences = splitSentences(sanitizedAnalysis["חוזקות"]);

  // Process paragraphs by handling each sentence individually but combining into one text element
  const tipsText = tipsSentences
    .map((sentence) => reverseWordOrder(sentence))
    .join("\n\n");
  const strengthsText = strengthsSentences
    .map((sentence) => reverseWordOrder(sentence))
    .join("\n\n");

  const dd: any = {
    content: [
      // Add date at the top left
      {
        text: dateString,
        style: "date",
        alignment: "left",
        margin: [0, 0, 0, 20],
      },
      {
        text: reverseWordOrder("דוח שיעור"),
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      {
        text: reverseWordOrder(
          `נושא השיעור: ${sanitizedAnalysis["נושא השיעור"]}`
        ),
        style: "subheader",
        alignment: "right",
        margin: [0, 0, 0, 10],
      },
      {
        text: reverseWordOrder(
          `אחוז הצלחה: ${sanitizedAnalysis["אחוז_הצלחה"]}%`
        ),
        alignment: "right",
        margin: [0, 0, 0, 10],
      },
      // Tips section header - WITH COLON
      {
        text: reverseWordOrder("טיפים לשיפור:"),
        style: "subheader",
        alignment: "right",
        margin: [0, 0, 0, 5],
      },
      // Tips text (all sentences in one element)
      {
        text: tipsText,
        alignment: "right",
        margin: [0, 0, 0, 15],
      },
      // Strengths section header - WITH COLON
      {
        text: reverseWordOrder("חוזקות:"),
        style: "subheader",
        alignment: "right",
        margin: [0, 0, 0, 5],
      },
      // Strengths text (all sentences in one element)
      {
        text: strengthsText,
        alignment: "right",
        margin: [0, 0, 0, 15],
      },
      // Homework section - WITH COLON
      {
        text: reverseWordOrder("שיעורי בית:"),
        style: "subheader",
        alignment: "right",
        margin: [0, 0, 0, 10],
      },
      {
        stack: (sanitizedAnalysis["שיעורי_בית"] || []).map(
          (hw: any, index: number) => ({
            text: reverseWordOrder(`${index + 1}. ${hw["שאלה"]}`), // Using period after number
            alignment: "right",
            margin: [0, 0, 0, 5],
            style: "homework", // Add homework style
          })
        ),
        margin: [0, 0, 0, 20],
      },
      // Combined SVG and text in a stack with left alignment
      {
        stack: [
          {
            svg: svgContent,
            width: 60,
            alignment: "left",
          },
          {
            text: "MathVentureTeam",
            style: "footer",
            alignment: "left",
            margin: [0, 5, 0, 0],
          },
        ],
        alignment: "left",
        margin: [0, 20, 0, 0],
      },
    ],
    defaultStyle: {
      font: "HebrewFont",
    },
    styles: {
      header: { fontSize: 14, bold: true },
      subheader: { fontSize: 10, bold: true },
      date: { fontSize: 10, italics: true },
      footer: { fontSize: 10 },
      homework: { fontSize: 9 }, // Smaller font for homework
    },
  };

  const pdfDoc = printer.createPdfKitDocument(dd);
  const buffers: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (b: Buffer) => buffers.push(b));
    pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
    pdfDoc.on("error", (e: Error) => reject(e));
    pdfDoc.end();
  });
}