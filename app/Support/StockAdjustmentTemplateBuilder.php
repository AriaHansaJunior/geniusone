<?php

namespace App\Support;

use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use RuntimeException;
use ZipArchive;

class StockAdjustmentTemplateBuilder
{
    /** @var array<string, int> */
    private array $sharedStringMap = [];

    /** @var array<int, string> */
    private array $sharedStrings = [];

    /**
     * Build a genuine Microsoft Excel .xlsx workbook containing:
     * - Sheet 1 (Adjustment_Stock): Entry table with dropdowns & direct custom entry + auto Item Name VLOOKUP
     * - Sheet 2 (Master_Data): Clean 4-column Master Items list
     * - Sheet 3 (Master_Warehouse): Clean 2-column Master Warehouses list
     */
    public function buildXlsxBinary(): string
    {
        $this->sharedStringMap = [];
        $this->sharedStrings = [];

        $items = Item::with('unit')
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'stock', 'units_of_measurements_id']);

        $warehouses = Warehouse::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $itemRows = [];
        foreach ($items as $item) {
            $code = trim((string) $item->code);
            if ($code === '') {
                continue;
            }
            $unitCode = $item->unit?->code ?? $item->unit?->name ?? 'PCE';
            $itemRows[] = [
                'code' => $code,
                'name' => trim((string) $item->name),
                'unit' => trim((string) $unitCode),
                'stock' => (float) ($item->stock ?? 0),
            ];
        }
        if (empty($itemRows)) {
            $itemRows[] = [
                'code' => '50.112.100.001',
                'name' => 'Sample Material Item',
                'unit' => 'PCE',
                'stock' => 0.0,
            ];
        }

        $whRows = [];
        foreach ($warehouses as $wh) {
            $name = trim((string) $wh->name);
            if ($name === '') {
                continue;
            }
            $whRows[] = [
                'code' => trim((string) ($wh->code ?? '')),
                'name' => $name,
            ];
        }
        if (empty($whRows)) {
            $whRows[] = [
                'code' => 'WH-MAIN',
                'name' => 'Gudang Utama',
            ];
        }

        // Build worksheets first so sharedStrings collects every string cleanly
        $sheet1Xml = $this->entrySheetXml($itemRows[0], $whRows[0]);
        $sheet2Xml = $this->masterItemsSheetXml($itemRows);
        $sheet3Xml = $this->masterWarehousesSheetXml($whRows);
        $sharedStringsXml = $this->sharedStringsXml();

        $tmpFile = tempnam(sys_get_temp_dir(), 'g1_adj_tpl_');
        if ($tmpFile === false) {
            throw new RuntimeException('Unable to allocate temporary file for Excel template.');
        }

        $zip = new ZipArchive;
        if ($zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            @unlink($tmpFile);
            throw new RuntimeException('Unable to create Excel archive.');
        }

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
        $zip->addFromString('_rels/.rels', $this->rootRelsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelsXml());
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFromString('xl/sharedStrings.xml', $sharedStringsXml);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet1Xml);
        $zip->addFromString('xl/worksheets/sheet2.xml', $sheet2Xml);
        $zip->addFromString('xl/worksheets/sheet3.xml', $sheet3Xml);
        $zip->close();

        $binary = file_get_contents($tmpFile);
        @unlink($tmpFile);

        if ($binary === false) {
            throw new RuntimeException('Failed to read generated Excel template binary.');
        }

        return $binary;
    }

    private function sanitizeXmlText(string $value): string
    {
        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? '';
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($this->sanitizeXmlText($value), ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function internString(string $value): int
    {
        $clean = $this->sanitizeXmlText($value);
        if (isset($this->sharedStringMap[$clean])) {
            return $this->sharedStringMap[$clean];
        }
        $idx = count($this->sharedStrings);
        $this->sharedStrings[] = $clean;
        $this->sharedStringMap[$clean] = $idx;

        return $idx;
    }

    private function sharedCell(string $ref, string $value, int $styleIdx = 0): string
    {
        $idx = $this->internString($value);
        $styleAttr = $styleIdx > 0 ? " s=\"{$styleIdx}\"" : '';

        return "<c r=\"{$ref}\"{$styleAttr} t=\"s\"><v>{$idx}</v></c>";
    }

    private function numberCell(string $ref, float|int $value, int $styleIdx = 0): string
    {
        $styleAttr = $styleIdx > 0 ? " s=\"{$styleIdx}\"" : '';

        return "<c r=\"{$ref}\"{$styleAttr}><v>{$value}</v></c>";
    }

    private function formulaCell(string $ref, string $formula, ?string $cachedValue = null, int $styleIdx = 0): string
    {
        $escapedFormula = $this->xmlEscape($formula);
        $styleAttr = $styleIdx > 0 ? " s=\"{$styleIdx}\"" : '';
        if ($cachedValue !== null && $cachedValue !== '') {
            $escapedVal = $this->xmlEscape($cachedValue);

            return "<c r=\"{$ref}\"{$styleAttr} t=\"str\"><f>{$escapedFormula}</f><v>{$escapedVal}</v></c>";
        }

        return "<c r=\"{$ref}\"{$styleAttr} t=\"str\"><f>{$escapedFormula}</f><v/></c>";
    }

    private function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>
XML;
    }

    private function rootRelsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
XML;
    }

    private function workbookXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="22228"/>
  <workbookPr/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="15000"/>
  </bookViews>
  <sheets>
    <sheet name="Adjustment_Stock" sheetId="1" r:id="rId1"/>
    <sheet name="Master_Data" sheetId="2" r:id="rId2"/>
    <sheet name="Master_Warehouse" sheetId="3" r:id="rId3"/>
  </sheets>
  <definedNames>
    <definedName name="MasterItemCodes">OFFSET(Master_Data!$A$2,0,0,MAX(1,COUNTA(Master_Data!$A$2:$A$5000)),1)</definedName>
    <definedName name="MasterWarehouses">OFFSET(Master_Warehouse!$A$2,0,0,MAX(1,COUNTA(Master_Warehouse!$A$2:$A$500)),1)</definedName>
  </definedNames>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>
XML;
    }

    private function workbookRelsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>
XML;
    }

    private function sharedStringsXml(): string
    {
        $count = count($this->sharedStrings);
        $itemsXml = '';
        foreach ($this->sharedStrings as $str) {
            $escaped = $this->xmlEscape($str);
            $preserve = ($str !== trim($str)) ? ' xml:space="preserve"' : '';
            $itemsXml .= "<si><t{$preserve}>{$escaped}</t></si>";
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{$count}" uniqueCount="{$count}">{$itemsXml}</sst>
XML;
    }

    private function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><sz val="11"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>
XML;
    }

    /**
     * @param  array{code:string,name:string,unit:string,stock:float}  $firstItem
     * @param  array{code:string,name:string}  $firstWh
     */
    private function entrySheetXml(array $firstItem, array $firstWh): string
    {
        $rowsXml = '';

        // Row 1: Column Headers
        $headers = ['Item Code', 'Item Name', 'Warehouse', 'Type', 'Quantity', 'Lot Number', 'Coordinate', 'Remark'];
        $rowsXml .= '<row r="1" ht="24" customHeight="1">';
        foreach ($headers as $idx => $label) {
            $col = chr(ord('A') + $idx);
            $rowsXml .= $this->sharedCell("{$col}1", $label, 1);
        }
        $rowsXml .= '</row>';

        // Row 2: Live Sample Row with VLOOKUP formula for Item Name
        $vlookupRow2 = 'IF(A2="","",IFERROR(VLOOKUP(A2,Master_Data!$A$2:$D$5000,2,FALSE),""))';
        $rowsXml .= '<row r="2">';
        $rowsXml .= $this->sharedCell('A2', $firstItem['code'], 0);
        $rowsXml .= $this->formulaCell('B2', $vlookupRow2, $firstItem['name'], 2);
        $rowsXml .= $this->sharedCell('C2', $firstWh['name'], 0);
        $rowsXml .= $this->sharedCell('D2', 'IN', 0);
        $rowsXml .= $this->numberCell('E2', 100, 3);
        $rowsXml .= $this->sharedCell('F2', 'LOT-2026-001', 0);
        $rowsXml .= $this->sharedCell('G2', 'A-01', 0);
        $rowsXml .= $this->sharedCell('H2', 'Initial stock injection', 0);
        $rowsXml .= '</row>';

        // Rows 3..200: Pre-wire Item Name VLOOKUP while still allowing users to overwrite B with a new Item Name directly
        for ($r = 3; $r <= 200; $r++) {
            $formula = "IF(A{$r}=\"\",\"\",IFERROR(VLOOKUP(A{$r},Master_Data!\$A\$2:\$D\$5000,2,FALSE),\"\"))";
            $rowsXml .= "<row r=\"{$r}\">";
            $rowsXml .= $this->formulaCell("B{$r}", $formula, null, 2);
            $rowsXml .= '</row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:H200"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="2" width="34" customWidth="1"/>
    <col min="3" max="3" width="24" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="30" customWidth="1"/>
  </cols>
  <sheetData>{$rowsXml}</sheetData>
  <dataValidations count="3">
    <dataValidation type="list" errorStyle="information" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="New Item Code" error="This Item Code is not in Master_Data yet. Type Item Name in Column B and enable Auto-create on upload." promptTitle="Select or Type Item Code" prompt="Pick an existing Item Code from dropdown, or type a new Item Code + Item Name directly." sqref="A2:A500">
      <formula1>MasterItemCodes</formula1>
    </dataValidation>
    <dataValidation type="list" errorStyle="information" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Custom Warehouse" error="Choose a Warehouse from Master_Warehouse or use Quick Add Master on the portal." promptTitle="Select Warehouse" prompt="Choose a destination Warehouse from dropdown." sqref="C2:C500">
      <formula1>MasterWarehouses</formula1>
    </dataValidation>
    <dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Invalid Type" error="Type must be IN, OUT, or SET." promptTitle="Adjustment Type" prompt="Choose IN, OUT, or SET." sqref="D2:D500">
      <formula1>&quot;IN,OUT,SET&quot;</formula1>
    </dataValidation>
  </dataValidations>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>
XML;
    }

    /**
     * Clean 4-column Master Items sheet (dynamic range grows automatically when rows are appended).
     *
     * @param  array<int, array{code:string,name:string,unit:string,stock:float}>  $itemRows
     */
    private function masterItemsSheetXml(array $itemRows): string
    {
        $lastRow = 1 + count($itemRows);
        $rowsXml = '<row r="1" ht="24" customHeight="1">'
            . $this->sharedCell('A1', 'Item Code', 1)
            . $this->sharedCell('B1', 'Item Name', 1)
            . $this->sharedCell('C1', 'Unit', 1)
            . $this->sharedCell('D1', 'Current Stock', 1)
            . '</row>';

        foreach ($itemRows as $i => $it) {
            $r = $i + 2;
            $rowsXml .= "<row r=\"{$r}\">"
                . $this->sharedCell("A{$r}", $it['code'], 0)
                . $this->sharedCell("B{$r}", $it['name'], 0)
                . $this->sharedCell("C{$r}", $it['unit'], 0)
                . $this->numberCell("D{$r}", $it['stock'], 3)
                . '</row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:D{$lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="40" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
  </cols>
  <sheetData>{$rowsXml}</sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>
XML;
    }

    /**
     * Clean 2-column Master Warehouses sheet.
     *
     * @param  array<int, array{code:string,name:string}>  $whRows
     */
    private function masterWarehousesSheetXml(array $whRows): string
    {
        $lastRow = 1 + count($whRows);
        $rowsXml = '<row r="1" ht="24" customHeight="1">'
            . $this->sharedCell('A1', 'Warehouse Name', 1)
            . $this->sharedCell('B1', 'Warehouse Code', 1)
            . '</row>';

        foreach ($whRows as $i => $wh) {
            $r = $i + 2;
            $rowsXml .= "<row r=\"{$r}\">"
                . $this->sharedCell("A{$r}", $wh['name'], 0)
                . $this->sharedCell("B{$r}", $wh['code'], 0)
                . '</row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:B{$lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="20" customWidth="1"/>
  </cols>
  <sheetData>{$rowsXml}</sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>
XML;
    }
}
