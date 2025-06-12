declare module "unicode-bidirectional/dist/unicode.bidirectional" {
  export function resolve(
    codepoints: number[],
    paragraphLevel: number,
    automaticLevel?: boolean
  ): (number | "x")[];

  export function reorder(
    codepoints: number[],
    levels: (number | "x")[]
  ): number[];
}