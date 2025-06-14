// @ts-ignore: no types for internal printer
import PdfPrinter from "pdfmake/src/printer"
import path from "path"
import fs from "fs"

// Load SVG and font resources
const svgPath = path.resolve(__dirname, "../fonts/MathVentureBot - Copy.svg")
const svgContent = fs.readFileSync(svgPath, "utf8")
const fonts = {
  HebrewFont: {
    normal: path.resolve(__dirname, "../fonts/NotoSansHebrew_Condensed-Regular.ttf"),
    bold: path.resolve(__dirname, "../fonts/NotoSansHebrew_Condensed-Bold.ttf"),
    italics: path.resolve(__dirname, "../fonts/NotoSansHebrew_Condensed-Regular.ttf"),
  },
}
const printer = new PdfPrinter(fonts)

export async function generateLessonPdf(analysis: any): Promise<Buffer> {
  // Function to sanitize text by removing ONLY problematic dashes
  function sanitizeText(text: string): string {
    if (!text) return ""
    // Replace em-dashes with spaces, but keep colons
    return text.replace(/—/g, " ")
  }

  // Helper function to clean numbering from text
  function cleanNumbering(text: string): string {
    if (!text) return ""
    // Remove patterns like "1.", "2.", "1)", "2)", etc. from the beginning of text
    return text.replace(/^\s*\d+[.)]\s*/g, "").trim()
  }

  // Improved word reversal that handles punctuation correctly
  function reverseWordOrder(text: string): string {
    if (!text) return ""
    const sanitized = sanitizeText(text)

    // Special handling for question marks - keep them with the word
    const words = sanitized.split(" ")

    // Process each word to handle question marks
    const processedWords = words.map((word) => {
      // If word ends with question mark, keep it attached
      if (word.endsWith("?")) {
        return word
      }
      return word
    })

    return processedWords.reverse().join("  ") // Double spaces between words
  }

  // Better handling of text splitting while keeping reverseWordOrder

  // Helper function to split text into sentences - improved version
  function splitSentences(text: string): string[] {
    if (!text) return []

    // Preprocess the text to handle newlines and dots
    const preprocessed = sanitizeText(text)
      .replace(/\n+/g, " . ") // Convert newlines to period separators
      .replace(/\s{2,}/g, " ") // Normalize multiple spaces
      .trim()

    // First try to split by numbers (1. 2. etc)
    let sentences: string[] = []

    // Look for numbered patterns
    const numberPattern = /\d+[.)][^.!?]*[.!?]?/g
    const numberMatches = preprocessed.match(numberPattern)

    if (numberMatches && numberMatches.length > 0) {
      // If we found numbered patterns, use those
      sentences = numberMatches.map((s) => cleanNumbering(s.trim()))
    } else {
      // Otherwise split by periods, question marks, or exclamation marks
      sentences = preprocessed
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    // Remove any empty sentences and clean numbering
    return sentences.map((sentence) => cleanNumbering(sentence)).filter((sentence) => sentence.trim().length > 2) // Require at least 3 chars
  }

  // Format today's date
  const today = new Date()
  const dateString = today.toLocaleDateString("he-IL") // Hebrew date format

  // Helper function to get field value with fallback
  function getFieldValue(field: string, fieldWithUnderscore: string): any {
    return analysis[field] !== undefined
      ? analysis[field]
      : analysis[fieldWithUnderscore] !== undefined
        ? analysis[fieldWithUnderscore]
        : field.includes("אחוז")
          ? 0
          : ""
  }

  // Sanitize analysis input
  const sanitizedAnalysis = {
    ...analysis,
    "נושא השיעור": sanitizeText(getFieldValue("נושא השיעור", "נושא_השיעור")),
    אחוז_הצלחה: getFieldValue("אחוז הצלחה", "אחוז_הצלחה"),
    טיפים_לשיפור: sanitizeText(getFieldValue("טיפים לשיפור", "טיפים_לשיפור")),
    חוזקות: sanitizeText(getFieldValue("חוזקות", "חוזקות")),
    שיעורי_בית: Array.isArray(getFieldValue("שיעורי בית", "שיעורי_בית"))
      ? getFieldValue("שיעורי בית", "שיעורי_בית").map((hw: any) => {
          if (typeof hw === "string") {
            return { שאלה: sanitizeText(hw) }
          }
          return { ...hw, שאלה: sanitizeText(hw.שאלה || "") }
        })
      : [],
  }

  // Add debugging
  console.log("PDF fields available:", Object.keys(analysis))
  console.log("Success percentage:", sanitizedAnalysis["אחוז_הצלחה"])
  console.log("Homework questions count:", sanitizedAnalysis["שיעורי_בית"].length)

  // Split tips and strengths into sentences
  const tipsSentences = splitSentences(sanitizedAnalysis["טיפים_לשיפור"])
  const strengthsSentences = splitSentences(sanitizedAnalysis["חוזקות"])

  // Improved homework question processing with right-aligned bullet points
  const homeworkItems = (sanitizedAnalysis["שיעורי_בית"] || []).map((hw: any) => {
    let question = hw["שאלה"]

    // Special handling for math equations with "=" and "?"
    if (question.includes("=") || question.includes("+") || question.includes("-")) {
      // First handle the equation formatting
      question = question.replace(/ \?/g, "?")
      question = question.replace(/\?=/g, "= ?")
      question = question.replace(/=\?/g, "= ?")

      // Add bullet point at beginning of RTL text
      return {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            text: reverseWordOrder(question),
            alignment: "right",
          },
          {
            width: 10,
            text: "•",
            alignment: "right",
          },
        ],
        alignment: "right",
        margin: [0, 0, 0, 5],
      }
    } else {
      // For non-equation questions
      question = question.replace(/ \?/g, "?")

      // Same approach for text questions
      return {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            text: reverseWordOrder(question),
            alignment: "right",
          },
          {
            width: 10,
            text: "•",
            alignment: "right",
          },
        ],
        alignment: "right",
        margin: [0, 0, 0, 5],
      }
    }
  })

  // Apply the same column-based bullet point approach to tips and strengths for consistency
  const tipsItems = tipsSentences.map((sentence) => ({
    columns: [
      { width: "*", text: "" },
      {
        width: "auto",
        text: reverseWordOrder(cleanNumbering(sentence)),
        alignment: "right",
      },
      {
        width: 10,
        text: "•",
        alignment: "right",
      },
    ],
    alignment: "right",
    margin: [0, 0, 0, 5],
  }))

  const strengthsItems = strengthsSentences.map((sentence) => ({
    columns: [
      { width: "*", text: "" },
      {
        width: "auto",
        text: reverseWordOrder(cleanNumbering(sentence)),
        alignment: "right",
      },
      {
        width: 10,
        text: "•",
        alignment: "right",
      },
    ],
    alignment: "right",
    margin: [0, 0, 0, 5],
  }))

  // Create success rate visual indicator
  const successRate = sanitizedAnalysis["אחוז_הצלחה"] || 0
  const getSuccessColor = (rate: number) => {
    if (rate >= 80) return "#4CAF50" // Green
    if (rate >= 60) return "#FF9800" // Orange
    return "#F44336" // Red
  }

  // Update the content structure with better Hebrew support
  const dd: any = {
    content: [
      // Header with logo and date
      {
        columns: [
          {
            width: "*",
            text: dateString,
            style: "date",
            alignment: "left",
          },
          {
            width: "auto",
            stack: [
              {
                svg: svgContent,
                width: 60,
                alignment: "right",
              },
              {
                text: "MathVentureTeam",
                style: "footer",
                alignment: "right",
                margin: [0, 5, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // Decorative line
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2,
            lineColor: "#2196F3",
          },
        ],
        margin: [0, 5, 0, 20],
      },

      // Main title with background
      {
        text: reverseWordOrder("דוח שיעור"),
        style: "mainTitle",
        alignment: "center",
        background: "#E3F2FD",
        margin: [0, 10, 0, 20],
      },

      // Lesson topic with background box
      {
        stack: [
          {
            text: reverseWordOrder("נושא השיעור:"),
            style: "sectionHeader",
            alignment: "right",
            fillColor: "#E8F5E8",
            margin: [10, 8, 10, 5],
          },
          {
            text: reverseWordOrder(sanitizedAnalysis["נושא השיעור"]),
            alignment: "right",
            margin: [10, 5, 10, 8],
            fontSize: 11,
          },
        ],
        background: "#F8F9FA",
        margin: [0, 0, 0, 15],
      },

      // Success rate with visual bar
      {
        stack: [
          {
            text: reverseWordOrder("אחוז הצלחה:"),
            style: "sectionHeader",
            alignment: "right",
            margin: [10, 8, 10, 5],
          },
          {
            columns: [
              { width: "*", text: "" },
              {
                width: "auto",
                stack: [
                  {
                    text: `${successRate}%`,
                    color: getSuccessColor(successRate),
                    fontSize: 16,
                    bold: true,
                    alignment: "right",
                    margin: [0, 0, 10, 5],
                  },
                  // Progress bar
                  {
                    canvas: [
                      {
                        type: "rect",
                        x: 0,
                        y: 0,
                        w: 150,
                        h: 10,
                        color: "#E0E0E0",
                      },
                      {
                        type: "rect",
                        x: 0,
                        y: 0,
                        w: (successRate / 100) * 150,
                        h: 10,
                        color: getSuccessColor(successRate),
                      },
                    ],
                    margin: [0, 0, 10, 8],
                  },
                ],
              },
            ],
          },
        ],
        background: "#F8F9FA",
        margin: [0, 0, 0, 20],
      },

      // Tips section with colored background
      {
        stack: [
          {
            text: reverseWordOrder("טיפים לשיפור:"),
            style: "sectionHeader",
            alignment: "right",
            margin: [0, 0, 0, 10],
          },
          {
            stack: tipsItems,
            margin: [10, 0, 10, 10],
          },
        ],
        background: "#FFF3E0",
        margin: [0, 0, 0, 15],
      },

      // Strengths section with colored background
      {
        stack: [
          {
            text: reverseWordOrder("חוזקות:"),
            style: "sectionHeader",
            alignment: "right",
            margin: [0, 0, 0, 10],
          },
          {
            stack: strengthsItems,
            margin: [10, 0, 10, 10],
          },
        ],
        background: "#E8F5E8",
        margin: [0, 0, 0, 15],
      },

      // Homework section with colored background
      {
        stack: [
          {
            text: reverseWordOrder("שיעורי בית:"),
            style: "sectionHeader",
            alignment: "right",
            margin: [0, 0, 0, 10],
          },
          {
            stack: homeworkItems,
            margin: [10, 0, 10, 10],
          },
        ],
        background: "#F3E5F5",
        margin: [0, 0, 0, 20],
      },

      // Footer with decorative line
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2,
            lineColor: "#2196F3",
          },
        ],
        margin: [0, 10, 0, 10],
      },
      {
        text: reverseWordOrder("המשך הצלחה בלימודים!"),
        alignment: "center",
        fontSize: 12,
        color: "#2196F3",
        margin: [0, 5, 0, 0],
      },
    ],
    defaultStyle: {
      font: "HebrewFont",
      fontSize: 10,
    },
    styles: {
      mainTitle: {
        fontSize: 18,
        bold: true,
        color: "#1976D2",
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: "#424242",
      },
      date: {
        fontSize: 9,
        italics: true,
        color: "#666666",
      },
      footer: {
        fontSize: 9,
        color: "#666666",
      },
    },
  }

  const pdfDoc = printer.createPdfKitDocument(dd)
  const buffers: Buffer[] = []
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (b: Buffer) => buffers.push(b))
    pdfDoc.on("end", () => resolve(Buffer.concat(buffers)))
    pdfDoc.on("error", (e: Error) => reject(e))
    pdfDoc.end()
  })
}
