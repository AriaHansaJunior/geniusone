import type { TableRow } from "../types";

export function docToSlug(docNumber?: any): string {
  if (!docNumber) return "unknown";
  const str = typeof docNumber === "string" ? docNumber : (typeof docNumber === "object" ? "" : String(docNumber));
  if (!str) return "unknown";
  return str.replace(/\//g, "-").replace(/\s+/g, "_");
}

export function findRowBySlug(rows: TableRow[], slug: string): TableRow | undefined {
  if (!slug) return undefined;
  const cleanSlug = slug.toLowerCase();
  return rows.find((r) => {
    const rawNum = (r._rawNumber || "").toLowerCase();
    const rawPo = (r._rawPo || "").toLowerCase();
    const rawPr = (r._rawPr || "").toLowerCase();
    const rawRn = (r._rawRn || "").toLowerCase();
    const id = (r._id || "").toLowerCase();

    return (
      docToSlug(rawNum).toLowerCase() === cleanSlug ||
      rawNum === cleanSlug ||
      docToSlug(rawPo).toLowerCase() === cleanSlug ||
      rawPo === cleanSlug ||
      docToSlug(rawPr).toLowerCase() === cleanSlug ||
      rawPr === cleanSlug ||
      docToSlug(rawRn).toLowerCase() === cleanSlug ||
      rawRn === cleanSlug ||
      id === cleanSlug
    );
  });
}
