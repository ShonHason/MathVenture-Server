// server/src/types/pdfmake-printer.d.ts
import { Readable } from "stream";

declare module "pdfmake/src/printer" {
  export interface TDocumentDefinitions { [key: string]: any }

  export default class PdfPrinter {
    constructor(fonts: Record<string, { normal: string; bold?: string; italics?: string }>);
    createPdfKitDocument(docDefinitions: TDocumentDefinitions): Readable;
  }
}