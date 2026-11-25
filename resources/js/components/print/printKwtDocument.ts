/**
 * Isolated Chrome/Edge/Firefox Print Engine for KWT Official Documents.
 *
 * Printing inside a dedicated hidden iframe completely isolates the printed
 * document from global SPA CSS (app-shell overflow:hidden, tables.css 52px td,
 * Tailwind layers, and theme overrides), guaranteeing 1:1 WYSIWYG output with
 * zero vertical clipping on A4 Landscape across all KWT forms.
 */

const KWT_IFRAME_PRINT_CSS = `
@page {
  size: A4 landscape;
  margin: 8mm 10mm;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: auto;
  background: #ffffff;
  color: #000000;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 0;
  background: #ffffff;
}

th, td {
  margin: 0;
  padding: 0;
  height: auto;
  text-transform: none;
  letter-spacing: normal;
  color: #000000;
  line-height: 1.25;
  vertical-align: middle;
}

.kwt-print-sheet {
  width: 100%;
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: "Times New Roman", Times, Georgia, serif;
  line-height: 1.25;
}

/* Top Form Identification */
.kwt-doc-header-meta {
  font-family: "Times New Roman", Times, Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 5px;
  color: #000000;
}

.kwt-doc-header-meta-table {
  width: auto;
  max-width: 260px;
}

.kwt-doc-header-meta-table td {
  padding: 1px 4px 1px 0;
  font-size: 11px;
  white-space: nowrap;
}

.kwt-doc-header-meta-label { width: 42px; }
.kwt-doc-header-meta-colon { width: 10px; text-align: center; }

/* Outer Double-Border Box (PPIC 001 / 002 / 003 / 004 / 006) */
.kwt-doc-box {
  border: 3px double #000000;
  width: 100%;
  margin: 0;
  padding: 0;
}

/* Header Table */
.kwt-header-table {
  width: 100%;
  table-layout: fixed;
  border-bottom: 1px solid #000000;
}

.kwt-doc-box--double-header .kwt-header-table {
  border-bottom: 3px double #000000;
}

.kwt-header-left {
  width: 58%;
  vertical-align: middle;
  padding: 6px 12px;
  border-right: 1px solid #000000;
}

.kwt-header-left-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kwt-header-logo {
  height: 46px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

.kwt-header-titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-width: 0;
}

.kwt-header-company-name {
  font-family: "Times New Roman", Times, serif;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.4px;
  color: #000000;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.kwt-header-company-addr {
  font-family: "Times New Roman", Times, serif;
  font-size: 10.5px;
  font-weight: 700;
  color: #000000;
  margin: 2px 0 0 0;
  line-height: 1.25;
}

.kwt-header-doc-title {
  font-family: "Times New Roman", Times, serif;
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  color: #000000;
  margin: 3px 0 0 0;
  line-height: 1.2;
}

.kwt-header-right {
  width: 42%;
  vertical-align: middle;
  padding: 5px 10px;
}

.kwt-meta-table {
  width: 100%;
  table-layout: fixed;
  font-family: "Times New Roman", Times, serif;
  font-size: 11px;
}

.kwt-meta-table td {
  padding: 1.5px 2px;
  vertical-align: top;
  font-size: 11px;
}

.kwt-meta-table td.kwt-meta-label {
  width: 92px;
  font-weight: 700;
  white-space: nowrap;
}

.kwt-meta-table td.kwt-meta-colon {
  width: 10px;
  font-weight: 700;
  text-align: center;
}

.kwt-meta-table td.kwt-meta-val {
  font-weight: 600;
  word-break: break-word;
}

/* Delivery Order (KWT-PPIC-006) Header & Subheader */
.kwt-do-header-band {
  width: 100%;
  padding: 7px 16px;
  border-bottom: 1px solid #000000;
  display: flex;
  align-items: center;
  gap: 16px;
}

.kwt-do-header-titles {
  flex: 1;
  text-align: center;
  padding-right: 46px;
}

.kwt-do-subheader-table {
  width: 100%;
  table-layout: fixed;
  border-bottom: 1px solid #000000;
}

.kwt-do-subheader-left {
  width: 55%;
  padding: 5px 10px;
  vertical-align: top;
}

.kwt-do-subheader-right {
  width: 45%;
  padding: 5px 10px;
  vertical-align: top;
}

.kwt-do-kepada-box {
  display: flex;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
}

.kwt-do-kepada-val {
  font-weight: 600;
  white-space: pre-line;
}

/* Items Table */
.kwt-items-table {
  width: 100%;
  table-layout: fixed;
  font-family: "Times New Roman", Times, serif;
  font-size: 11px;
}

.kwt-items-table th,
.kwt-items-table td {
  border: 1px solid #000000;
  padding: 3.5px 6px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  font-size: 11px;
  height: 22px;
}

.kwt-items-table th {
  font-weight: 800;
  text-align: center;
  padding: 4.5px 4px;
  height: auto;
  border-top: none;
}

.kwt-items-table th:first-child,
.kwt-items-table td:first-child { border-left: none; }

.kwt-items-table th:last-child,
.kwt-items-table td:last-child { border-right: none; }

.kwt-items-table tr.kwt-row-empty td { height: 22px; }

.kwt-col-center { text-align: center; }
.kwt-col-right { text-align: right; }
.kwt-col-left { text-align: left; }

.kwt-w-4 { width: 4%; }
.kwt-w-5 { width: 5%; }
.kwt-w-6 { width: 6%; }
.kwt-w-7 { width: 7%; }
.kwt-w-8 { width: 8%; }
.kwt-w-9 { width: 9%; }
.kwt-w-10 { width: 10%; }
.kwt-w-11 { width: 11%; }
.kwt-w-12 { width: 12%; }
.kwt-w-13 { width: 13%; }
.kwt-w-15 { width: 15%; }
.kwt-w-16 { width: 16%; }
.kwt-w-17 { width: 17%; }
.kwt-w-18 { width: 18%; }
.kwt-w-22 { width: 22%; }
.kwt-w-24 { width: 24%; }
.kwt-w-30 { width: 30%; }
.kwt-w-32 { width: 32%; }
.kwt-w-33 { width: 33%; }
.kwt-w-35 { width: 35%; }
.kwt-w-42 { width: 42%; }
.kwt-w-72 { width: 72%; }

/* Legend Box */
.kwt-legend-box {
  width: 100%;
  border-bottom: 1px solid #000000;
  padding: 3px 10px;
  font-family: "Times New Roman", Times, serif;
  font-size: 11px;
  line-height: 1.3;
}

/* Open Footer & Signatures (001, 002, 003, 006) */
.kwt-footer-table {
  width: 100%;
  table-layout: fixed;
  font-family: "Times New Roman", Times, serif;
  font-size: 11px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.kwt-footer-table td {
  vertical-align: top;
}

.kwt-distribution-cell {
  width: 28%;
  border-right: 1px solid #000000;
  padding: 6px 8px 6px 10px;
  font-size: 11px;
  line-height: 1.4;
}

.kwt-footer-table--open .kwt-distribution-cell {
  border-right: none;
}

.kwt-distribution-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kwt-distribution-item { display: flex; gap: 6px; }
.kwt-dist-num { width: 12px; font-weight: 600; }
.kwt-dist-color { width: 48px; }
.kwt-dist-colon { width: 6px; }
.kwt-dist-target { font-weight: 500; }

.kwt-signatures-container {
  display: flex;
  width: 100%;
}

.kwt-sign-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  min-height: 82px;
  text-align: center;
}

.kwt-sign-col + .kwt-sign-col { border-left: 1px solid #000000; }
.kwt-signatures-container--open .kwt-sign-col + .kwt-sign-col { border-left: none; }

.kwt-sign-title { font-weight: 800; font-size: 11px; }
.kwt-sign-space { height: 42px; display: flex; align-items: center; justify-content: center; }
.kwt-sign-actor { font-size: 10px; font-style: italic; color: #1e293b; }
.kwt-sign-role { font-weight: 800; font-size: 11px; }

/* NPB (KWT-PPIC-004) Footer */
.kwt-npb-footer {
  width: 100%;
  table-layout: fixed;
  border-top: 3px double #000000;
  break-inside: avoid;
  page-break-inside: avoid;
}

.kwt-npb-notes-cell {
  width: 50%;
  padding: 6px 10px;
  min-height: 76px;
  font-size: 11px;
  vertical-align: top;
  border-right: 3px double #000000;
}

.kwt-npb-notes-title { font-weight: 800; margin-bottom: 4px; }
.kwt-npb-notes-content { font-size: 11px; line-height: 1.35; }

.kwt-npb-signs-cell {
  width: 50%;
  padding: 0;
  vertical-align: top;
}

.kwt-npb-signs-table {
  width: 100%;
  table-layout: fixed;
  height: 100%;
}

.kwt-npb-signs-table th {
  border-bottom: 1px solid #000000;
  border-right: 1px solid #000000;
  padding: 3px;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}

.kwt-npb-signs-table th:last-child,
.kwt-npb-signs-table td:last-child { border-right: none; }

.kwt-npb-signs-table td {
  border-right: 1px solid #000000;
  height: 54px;
  padding: 4px;
  text-align: center;
  vertical-align: bottom;
  font-size: 10.5px;
}

/* Purchase Order (KWT-PURC-001) */
.kwt-po-sheet {
  font-family: Arial, Helvetica, sans-serif;
}

.kwt-po-box {
  border: 1px solid #000000;
  width: 100%;
  background: #ffffff;
}

.kwt-po-top-header {
  display: flex;
  align-items: center;
  padding: 7px 14px;
  border-bottom: 1px solid #000000;
  gap: 12px;
}

.kwt-po-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

.kwt-po-company-block {
  flex: 1;
  text-align: center;
  padding-right: 42px;
}

.kwt-po-company-name {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.4px;
  line-height: 1.2;
}

.kwt-po-company-addr {
  margin: 2px 0 0 0;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.25;
}

.kwt-po-title-band {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #000000;
  padding: 5px 10px;
}

.kwt-po-title-text {
  width: 56%;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.kwt-po-number-grid { width: 44%; }

.kwt-po-meta-table {
  width: 100%;
  table-layout: fixed;
  font-size: 10px;
}

.kwt-po-meta-table td {
  padding: 1.5px 3px;
  vertical-align: top;
  font-size: 10px;
}

.kwt-po-meta-lbl { width: 82px; font-weight: 700; }
.kwt-po-meta-lbl-sm { width: 72px; font-weight: 700; }
.kwt-po-meta-col { width: 8px; text-align: center; font-weight: 700; }
.kwt-po-meta-val { font-weight: 600; word-break: break-word; }

.kwt-po-supplier-band {
  display: flex;
  border-bottom: 1px solid #000000;
  padding: 5px 10px;
  font-size: 10px;
}

.kwt-po-supplier-left { width: 56%; padding-right: 12px; }
.kwt-po-supplier-heading { font-weight: 800; font-size: 10.5px; margin-bottom: 3px; }
.kwt-po-supplier-name { font-size: 10.5px; font-weight: 600; }
.kwt-po-supplier-right { width: 44%; }

.kwt-po-items-table {
  width: 100%;
  table-layout: fixed;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10px;
}

.kwt-po-items-table th {
  background-color: #fdf2f2 !important;
  border-bottom: 1px solid #000000;
  border-left: 1px solid #000000;
  border-right: 1px solid #000000;
  padding: 5px 6px;
  font-size: 10px;
  font-weight: 800;
  text-align: center;
}

.kwt-po-items-table th:first-child,
.kwt-po-items-table td:first-child { border-left: none; }

.kwt-po-items-table th:last-child,
.kwt-po-items-table td:last-child { border-right: none; }

.kwt-po-items-table tbody td {
  border-left: 1px solid #000000;
  border-right: 1px solid #000000;
  padding: 4px 6px;
  vertical-align: top;
  font-size: 10px;
  word-wrap: break-word;
}

.kwt-po-items-filler td { height: 135px; }

.kwt-po-bottom-table {
  width: 100%;
  table-layout: fixed;
  border-top: 1px solid #000000;
  font-size: 10px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.kwt-po-terms-cell {
  width: 56%;
  vertical-align: top;
  padding: 6px 10px;
  border-right: 1px solid #000000;
}

.kwt-po-terms-title { font-weight: 800; font-size: 10.5px; margin-bottom: 5px; }
.kwt-po-terms-table { width: 100%; font-size: 10px; }
.kwt-po-terms-table td { padding: 1.5px 3px; vertical-align: top; font-size: 10px; }
.kwt-po-term-num { width: 16px; }
.kwt-po-term-lbl { width: 95px; }
.kwt-po-term-col { width: 8px; text-align: center; }

.kwt-po-right-cell { width: 44%; vertical-align: top; padding: 0; }

.kwt-po-totals-table { width: 100%; table-layout: fixed; font-size: 10px; }
.kwt-po-totals-table td { padding: 3px 8px; font-size: 10px; }
.kwt-po-totals-lbl { width: 45%; font-weight: 700; border-right: 1px solid #000000; }
.kwt-po-totals-val { width: 55%; text-align: right; font-weight: 700; }
.kwt-po-totals-grand td {
  border-top: 1px solid #000000;
  border-bottom: 1px solid #000000;
  font-weight: 800;
}

.kwt-po-sign-table { width: 100%; table-layout: fixed; font-size: 10px; }
.kwt-po-sign-cell {
  width: 48%;
  padding: 5px 8px;
  text-align: center;
  vertical-align: top;
  border-top: 1px solid #000000;
}
.kwt-po-sign-spacer {
  width: 4%;
  border-top: 1px solid #000000;
  border-left: 1px solid #000000;
  border-right: 1px solid #000000;
}
.kwt-po-sign-title { font-weight: 700; margin-bottom: 42px; }
.kwt-po-sign-name { font-weight: 700; min-height: 14px; }

.kwt-po-distribution {
  border-top: 1px solid #000000;
  padding: 4px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  font-size: 10px;
  font-weight: 700;
}

.kwt-po-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 9.5px;
  font-weight: 600;
}

.kwt-po-form-meta-left {
  display: flex;
  gap: 22px;
}
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printKwtSheet(sheetElement: HTMLElement | null, documentTitle = "KWT Document"): void {
  if (!sheetElement || typeof document === "undefined") {
    window.print();
    return;
  }

  // Remove any stale print iframe first
  const existing = document.getElementById("kwt-isolated-print-frame");
  if (existing) {
    existing.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "kwt-isolated-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const iframeWin = iframe.contentWindow;
  const iframeDoc = iframeWin?.document;
  if (!iframeWin || !iframeDoc) {
    iframe.remove();
    window.print();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>${KWT_IFRAME_PRINT_CSS}</style>
</head>
<body>${sheetElement.outerHTML}</body>
</html>`;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  let printed = false;
  const cleanup = () => {
    setTimeout(() => {
      iframe.remove();
    }, 500);
  };

  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    iframeWin.addEventListener("afterprint", cleanup, { once: true });
    iframeWin.focus();
    iframeWin.print();
    // Fallback cleanup in case afterprint does not fire
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    }, 60_000);
  };

  const imgs = Array.from(iframeDoc.querySelectorAll("img"));
  const pendingImgs = imgs.filter((img) => !img.complete);

  if (pendingImgs.length === 0) {
    requestAnimationFrame(() => requestAnimationFrame(triggerPrint));
  } else {
    let remaining = pendingImgs.length;
    const onDone = () => {
      remaining -= 1;
      if (remaining <= 0) {
        requestAnimationFrame(triggerPrint);
      }
    };
    pendingImgs.forEach((img) => {
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
    });
    // Safety fallback if an image never resolves
    setTimeout(triggerPrint, 800);
  }
}
