declare module "pdf-parse/lib/pdf-parse.js" {
  const parse: (
    data: Uint8Array,
    options?: {
      max?: number;
      pagerender?: (page: {
        pageIndex: number;
        getTextContent: () => Promise<{
          items: { str?: string; transform?: number[] }[];
        }>;
      }) => Promise<string>;
    },
  ) => Promise<{ numpages: number; numrender: number; text: string }>;
  export default parse;
}
