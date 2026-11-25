export interface XlsxSheetSpec {
  name: string;
  rows: Array<Array<string | number | boolean | null | undefined>>;
  colWidths?: Array<{ wch: number }>;
}

export async function loadXlsxModule() {
  return import("xlsx");
}

export async function exportSheetsToXlsx(
  filename: string,
  sheets: XlsxSheetSpec[]
): Promise<void> {
  const XLSX = await loadXlsxModule();
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (sheet.colWidths && sheet.colWidths.length > 0) {
      worksheet["!cols"] = sheet.colWidths;
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  XLSX.writeFile(workbook, filename);
}
