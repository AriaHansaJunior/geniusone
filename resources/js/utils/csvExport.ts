export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildCsvContent(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>
): void {
  const csvString = buildCsvContent(headers, rows);
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
