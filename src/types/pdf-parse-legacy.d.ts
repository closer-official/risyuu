declare module "pdf-parse-legacy" {
  function pdfParse(data: Buffer): Promise<{ text: string; numpages?: number }>;
  export default pdfParse;
}
