/**
 * Generates an Excel file matching the exact format of the
 * "[RVJP-RVKR] Weekly Report.xlsx" Daily_raw sheet.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DailySale } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants matching the original sheet                              */
/* ------------------------------------------------------------------ */

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E2F3' },
};

const FONT_DEFAULT: Partial<ExcelJS.Font> = {
  name: 'Arial',
  size: 10,
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
};

const COL_WIDTHS: number[] = [25.63, 31.25, 36.63, 14.88, 15.5, 22.5];

const HEADERS = [
  'Title(JP)',
  'Title(KR)',
  'Channel Title(JP)',
  'Channel',
  'Date',
  'Sales(without tax)',
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function generateDailyRawExcel(
  dailySales: DailySale[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Daily_raw');

  /* ---------- Column widths ---------- */
  ws.columns = COL_WIDTHS.map((width, i) => ({ width, key: String(i + 1) }));

  /* ---------- Row 1: SUBTOTAL formula ---------- */
  const lastDataRow = dailySales.length + 2; // header=row2, data starts row3
  const row1 = ws.getRow(1);
  row1.getCell(6).value = {
    formula: `SUBTOTAL(9,F3:F${lastDataRow})`,
    result: undefined,
  } as ExcelJS.CellFormulaValue;
  row1.getCell(6).font = { ...FONT_DEFAULT };
  row1.getCell(6).numFmt = '[$¥]#,##0';

  /* ---------- Row 2: Headers ---------- */
  const row2 = ws.getRow(2);
  HEADERS.forEach((header, idx) => {
    const cell = row2.getCell(idx + 1);
    cell.value = header;
    cell.font = { ...FONT_DEFAULT, bold: true };
    cell.fill = HEADER_FILL;
    cell.alignment = HEADER_ALIGNMENT;
  });

  /* ---------- Row 3+: Data rows ---------- */
  dailySales.forEach((sale, i) => {
    const rowNum = i + 3;
    const row = ws.getRow(rowNum);

    row.getCell(1).value = sale.title_jp;
    row.getCell(2).value = sale.title_kr ?? '';
    row.getCell(3).value = sale.title_jp; // channel_title_jp fallback
    row.getCell(4).value = sale.channel;
    row.getCell(5).value = parseDate(sale.sale_date);
    row.getCell(5).numFmt = 'yyyy/mm/d';
    row.getCell(6).value = sale.sales_amount;
    row.getCell(6).numFmt = '[$¥]#,##0';

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).font = { ...FONT_DEFAULT };
    }
  });

  /* ---------- Auto filter (A2:F{lastRow}) ---------- */
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: lastDataRow, column: 6 },
  };

  /* ---------- Freeze panes at A3 (rows 1-2 frozen) ---------- */
  ws.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 2,
      topLeftCell: 'A3',
      activeCell: 'A3',
    },
  ];

  /* ---------- Generate and download ---------- */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().substring(0, 10);
  saveAs(blob, `RVJP_daily_raw_${today}.xlsx`);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }
  return new Date(dateStr);
}
