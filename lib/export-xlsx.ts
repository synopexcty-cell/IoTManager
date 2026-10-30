import {
  contrastText,
  dayFill,
  DEFAULT_COLUMN_COLORS,
  WEEKDAY_SHORT,
} from "./column-colors";
import {
  attendanceCellText,
  attendanceCellValue,
  isLeaveCell,
  otCellValue,
  recordWorkplace,
  type GridCellValue,
} from "./grid-cells";
import { mealCount } from "./meal";
import { formatOtDisplay } from "./ot";
import { roleLabel } from "./roles";
import type {
  AttendanceRecord,
  ColumnColors,
  Employee,
  MealRecord,
} from "./types";
import { daysInMonth, formatShortDate, weekdayOf } from "./utils";
import { employeeCompany } from "./workplace";

type Border = { style: "thin"; color: { rgb: string } };
type CellStyle = {
  font: {
    name: string;
    sz: number;
    bold?: boolean;
    color: { rgb: string };
  };
  fill: { patternType: "solid"; fgColor: { rgb: string } };
  alignment: {
    horizontal: "center" | "left";
    vertical: "center";
    wrapText: boolean;
  };
  border: { top: Border; bottom: Border; left: Border; right: Border };
};

type SheetCell = {
  v: string | number;
  t?: "s" | "n";
  s: CellStyle;
  z?: string;
};

function rgb(hex: string): string {
  const h = hex.replace("#", "").toUpperCase();
  const six =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padStart(6, "F").slice(0, 6);
  return `FF${six}`;
}

const BORDER: Border = { style: "thin", color: { rgb: "1F2937" } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function style(opts: {
  bg: string;
  bold?: boolean;
  left?: boolean;
  color?: string;
  sz?: number;
}): CellStyle {
  const bg = rgb(opts.bg);
  const fg = rgb(opts.color || contrastText(opts.bg.startsWith("#") ? opts.bg : `#${opts.bg}`));
  return {
    font: {
      name: "Calibri",
      sz: opts.sz ?? 10,
      bold: opts.bold,
      color: { rgb: fg },
    },
    fill: { patternType: "solid", fgColor: { rgb: bg } },
    alignment: {
      horizontal: opts.left ? "left" : "center",
      vertical: "center",
      wrapText: true,
    },
    border: BORDERS,
  };
}

function cell(
  value: string | number | undefined,
  s: CellStyle
): SheetCell {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { v: value, t: "n", s, z: "0.0" };
  }
  return { v: value == null ? "" : String(value), t: "s", s };
}

function colLetter(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function addr(r: number, c: number) {
  return `${colLetter(c)}${r + 1}`;
}

async function loadXlsx() {
  const mod = await import("xlsx-js-style");
  const XLSX = (mod as unknown as { default?: typeof mod }).default ?? mod;
  if (!XLSX.utils || !XLSX.writeFile) {
    throw new Error("Không tải được thư viện Excel");
  }
  return XLSX;
}

async function writeSheet(
  rows: (SheetCell | undefined)[][],
  merges: { s: { r: number; c: number }; e: { r: number; c: number } }[],
  colCount: number,
  filename: string,
  sheetName: string,
  layout?: { cols?: number[]; rowHpt?: number }
) {
  const XLSX = await loadXlsx();
  const aoa: (string | number)[][] = rows.map((row) =>
    Array.from({ length: colCount }, (_, c) => {
      const item = row[c];
      return item ? item.v : "";
    })
  );
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  rows.forEach((row, r) => {
    row.forEach((item, c) => {
      if (!item) return;
      const ref = addr(r, c);
      const target = ws[ref] as Record<string, unknown> | undefined;
      if (!target) return;
      target.s = item.s;
      if (item.t) target.t = item.t;
      if (item.z && item.t === "n") target.z = item.z;
    });
  });
  ws["!merges"] = merges;
  ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
    if (layout?.cols?.[i] != null) return { wch: layout.cols[i] };
    if (i === 0) return { wch: 5 };
    if (i === 1) return { wch: 10 };
    if (i === 2) return { wch: 12 };
    if (i === 3) return { wch: 24 };
    if (i === colCount - 1) return { wch: 8 };
    return { wch: 6 };
  });
  ws["!rows"] = rows.map((_, r) => ({
    hpt: layout?.rowHpt ?? (r < 2 ? 22 : 28),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

function nameText(emp: Employee) {
  const company = employeeCompany(emp);
  return company ? `${emp.name}\n${company}` : emp.name;
}

function dayStyle(
  colors: ColumnColors,
  year: number,
  month: number,
  day: number,
  extra?: { leave?: boolean; bold?: boolean }
): CellStyle {
  if (extra?.leave) {
    return style({ bg: "#000000", bold: true, color: "#ffffff" });
  }
  const bg = dayFill(colors, year, month, day);
  return style({ bg, bold: extra?.bold });
}

export async function exportMonthGridXlsx(opts: {
  year: number;
  month: number;
  employees: Employee[];
  records?: AttendanceRecord[];
  entries?: { employeeName: string; date: string; value: string }[];
  columnColors?: ColumnColors;
  title: string;
  hoursLabel?: string;
  footerLabel?: string;
  notes?: string[];
  filename: string;
  sheetName: string;
}) {
  const colors = opts.columnColors || DEFAULT_COLUMN_COLORS;
  const lastDay = daysInMonth(opts.year, opts.month);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const mm = String(opts.month).padStart(2, "0");
  const useEntries = Boolean(opts.entries);
  const hoursLabel = opts.hoursLabel || "Giờ";
  const footerLabel = opts.footerLabel || "Tổng người có mặt";
  const colCount = 4 + lastDay + 1;
  const totalBg = colors.total;

  const byEmpDate = new Map<string, AttendanceRecord>();
  for (const r of opts.records || []) {
    byEmpDate.set(`${r.employeeName}|${r.date}`, r);
  }
  const byEntry = new Map<string, string>();
  for (const e of opts.entries || []) {
    byEntry.set(`${e.employeeName}|${e.date}`, e.value);
  }

  const empRows = opts.employees.map((emp) => {
    const cells: GridCellValue[] = days.map((day) => {
      const date = `${opts.year}-${mm}-${String(day).padStart(2, "0")}`;
      const key = `${emp.name}|${date}`;
      return useEntries
        ? otCellValue(byEntry.get(key))
        : attendanceCellValue(byEmpDate.get(key));
    });
    const sites = days.map((day) => {
      if (useEntries) return "";
      const date = `${opts.year}-${mm}-${String(day).padStart(2, "0")}`;
      return recordWorkplace(byEmpDate.get(`${emp.name}|${date}`));
    });
    const total = cells.reduce<number>(
      (sum, v) => (typeof v === "number" ? sum + v : sum),
      0
    );
    return { emp, cells, sites, total };
  });

  const sameTeam =
    opts.employees.length > 0 &&
    opts.employees.every(
      (e) => (e.team || "") === (opts.employees[0].team || "")
    );
  const sameShift =
    opts.employees.length > 0 &&
    opts.employees.every(
      (e) => (e.shift || "") === (opts.employees[0].shift || "")
    );

  const header = style({ bg: "#ffffff", bold: true });
  const nameHead = style({ bg: "#ffffff", bold: true, left: true });
  const totalHead = style({ bg: totalBg, bold: true });

  const row0: SheetCell[] = [
    cell(opts.title, nameHead),
    cell("", header),
    cell("", header),
    cell("", header),
    ...days.map((day) =>
      cell(day, dayStyle(colors, opts.year, opts.month, day, { bold: true }))
    ),
    cell("Tổng", totalHead),
  ];
  const row1: SheetCell[] = [
    cell("No", header),
    cell("Team", header),
    cell("Ca", header),
    cell("Họ và Tên\nFull Name", nameHead),
    ...days.map((day) =>
      cell(
        WEEKDAY_SHORT[weekdayOf(opts.year, opts.month, day)],
        dayStyle(colors, opts.year, opts.month, day, { bold: true })
      )
    ),
    cell(hoursLabel, totalHead),
  ];

  const body = empRows.map((row, index) => {
    const line: (SheetCell | undefined)[] = [
      cell(index + 1, style({ bg: "#ffffff", bold: true })),
      sameTeam && index > 0
        ? undefined
        : cell(row.emp.team || "—", header),
      sameShift && index > 0
        ? undefined
        : cell(row.emp.shift || "—", header),
      cell(nameText(row.emp), style({ bg: "#ffffff", bold: true, left: true })),
    ];
    row.cells.forEach((value, i) => {
      const day = i + 1;
      const leave = isLeaveCell(value);
      const s = dayStyle(colors, opts.year, opts.month, day, { leave });
      const text = useEntries
        ? formatOtDisplay(value)
        : attendanceCellText(value, row.sites[i]);
      if (!useEntries && typeof value === "number" && !row.sites[i]) {
        line.push(cell(value, s));
      } else if (useEntries && typeof value === "number") {
        line.push(cell(value, s));
      } else {
        line.push(cell(text || undefined, s));
      }
    });
    line.push(
      cell(row.total ? row.total : undefined, style({ bg: totalBg, bold: true }))
    );
    return line;
  });

  const footer: SheetCell[] = [
    cell(footerLabel, style({ bg: "#ffffff", bold: true, left: true })),
    cell("", header),
    cell("", header),
    cell("", header),
    ...days.map((day) => {
      const count = empRows.filter(
        (r) => typeof r.cells[day - 1] === "number"
      ).length;
      return cell(
        count || undefined,
        dayStyle(colors, opts.year, opts.month, day, { bold: true })
      );
    }),
    cell(
      empRows.reduce(
        (sum, r) => sum + r.cells.filter((v) => typeof v === "number").length,
        0
      ) || undefined,
      style({ bg: totalBg, bold: true })
    ),
  ];

  const sheet: (SheetCell | undefined)[][] = [row0, row1, ...body, footer];

  if (opts.notes?.length) {
    sheet.push([]);
    opts.notes.forEach((line, i) => {
      const noteStyle = style({
        bg: "#dceaf7",
        left: true,
        bold: i === 0,
        color: i === 0 ? "#000000" : "#374151",
      });
      sheet.push([cell(line, noteStyle)]);
    });
  }

  const dataStart = 2;
  const footerRow = dataStart + empRows.length;
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: footerRow, c: 0 }, e: { r: footerRow, c: 3 } },
  ];
  if (sameTeam && empRows.length > 1) {
    merges.push({
      s: { r: dataStart, c: 1 },
      e: { r: footerRow - 1, c: 1 },
    });
  }
  if (sameShift && empRows.length > 1) {
    merges.push({
      s: { r: dataStart, c: 2 },
      e: { r: footerRow - 1, c: 2 },
    });
  }

  await writeSheet(sheet, merges, colCount, opts.filename, opts.sheetName);
}

export async function exportMealGridXlsx(opts: {
  year: number;
  month: number;
  employees: Employee[];
  records: MealRecord[];
  columnColors?: ColumnColors;
  filename: string;
}) {
  const colors = opts.columnColors || DEFAULT_COLUMN_COLORS;
  const lastDay = daysInMonth(opts.year, opts.month);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const mm = String(opts.month).padStart(2, "0");
  const colCount = 4 + lastDay + 1;
  const totalBg = colors.total;
  const title = `Ăn ngoài — Tháng ${opts.month}/${opts.year}`;

  const byEmpDate = new Map<string, MealRecord>();
  for (const r of opts.records) {
    byEmpDate.set(`${r.employeeName}|${r.date}`, r);
  }

  const empRows = opts.employees.map((emp) => {
    const cells = days.map((day) => {
      const date = `${opts.year}-${mm}-${String(day).padStart(2, "0")}`;
      const rec = byEmpDate.get(`${emp.name}|${date}`);
      return {
        lunch: Boolean(rec?.lunch),
        dinner: Boolean(rec?.dinner),
      };
    });
    const total = cells.reduce(
      (sum, c) => sum + mealCount(c.lunch, c.dinner),
      0
    );
    return { emp, cells, total };
  });

  const sameTeam =
    opts.employees.length > 0 &&
    opts.employees.every(
      (e) => (e.team || "") === (opts.employees[0].team || "")
    );
  const sameShift =
    opts.employees.length > 0 &&
    opts.employees.every(
      (e) => (e.shift || "") === (opts.employees[0].shift || "")
    );

  const header = style({ bg: "#ffffff", bold: true });
  const nameHead = style({ bg: "#ffffff", bold: true, left: true });
  const totalHead = style({ bg: totalBg, bold: true });

  const row0: SheetCell[] = [
    cell(title, nameHead),
    cell("", header),
    cell("", header),
    cell("", header),
    ...days.map((day) =>
      cell(day, dayStyle(colors, opts.year, opts.month, day, { bold: true }))
    ),
    cell("Tổng", totalHead),
  ];
  const row1: SheetCell[] = [
    cell("No", header),
    cell("Team", header),
    cell("Ca", header),
    cell("Họ và Tên\nFull Name", nameHead),
    ...days.map((day) =>
      cell(
        WEEKDAY_SHORT[weekdayOf(opts.year, opts.month, day)],
        dayStyle(colors, opts.year, opts.month, day, { bold: true })
      )
    ),
    cell("Bữa", totalHead),
  ];

  const body = empRows.map((row, index) => {
    const line: (SheetCell | undefined)[] = [
      cell(index + 1, style({ bg: "#ffffff", bold: true })),
      sameTeam && index > 0 ? undefined : cell(row.emp.team || "—", header),
      sameShift && index > 0 ? undefined : cell(row.emp.shift || "—", header),
      cell(nameText(row.emp), style({ bg: "#ffffff", bold: true, left: true })),
    ];
    row.cells.forEach((c, i) => {
      const day = i + 1;
      const s = dayStyle(colors, opts.year, opts.month, day);
      const text =
        c.lunch && c.dinner ? "T\nC" : c.lunch ? "T" : c.dinner ? "C" : "";
      line.push(cell(text || undefined, s));
    });
    line.push(
      cell(row.total ? row.total : undefined, style({ bg: totalBg, bold: true }))
    );
    return line;
  });

  const lunchFooter: SheetCell[] = [
    cell("Tổng ăn trưa", style({ bg: "#ffffff", bold: true, left: true })),
    cell("", header),
    cell("", header),
    cell("", header),
    ...days.map((day) => {
      const count = empRows.filter((r) => r.cells[day - 1].lunch).length;
      return cell(
        count || undefined,
        dayStyle(colors, opts.year, opts.month, day, { bold: true })
      );
    }),
    cell(
      empRows.reduce((sum, r) => sum + r.cells.filter((c) => c.lunch).length, 0) ||
        undefined,
      style({ bg: totalBg, bold: true })
    ),
  ];
  const dinnerFooter: SheetCell[] = [
    cell("Tổng ăn chiều", style({ bg: "#ffffff", bold: true, left: true })),
    cell("", header),
    cell("", header),
    cell("", header),
    ...days.map((day) => {
      const count = empRows.filter((r) => r.cells[day - 1].dinner).length;
      return cell(
        count || undefined,
        dayStyle(colors, opts.year, opts.month, day, { bold: true })
      );
    }),
    cell(
      empRows.reduce(
        (sum, r) => sum + r.cells.filter((c) => c.dinner).length,
        0
      ) || undefined,
      style({ bg: totalBg, bold: true })
    ),
  ];

  const notes = [
    "Note",
    "T --> Ăn trưa",
    "C --> Ăn chiều",
    "Mỗi ngày chỉ 2 bữa.",
  ];
  const sheet: (SheetCell | undefined)[][] = [
    row0,
    row1,
    ...body,
    lunchFooter,
    dinnerFooter,
    [],
    ...notes.map((line, i) => [
      cell(
        line,
        style({
          bg: "#dceaf7",
          left: true,
          bold: i === 0,
          color: "#000000",
        })
      ),
    ]),
  ];

  const dataStart = 2;
  const lunchFooterRow = dataStart + empRows.length;
  const dinnerFooterRow = lunchFooterRow + 1;
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: lunchFooterRow, c: 0 }, e: { r: lunchFooterRow, c: 3 } },
    { s: { r: dinnerFooterRow, c: 0 }, e: { r: dinnerFooterRow, c: 3 } },
  ];
  if (sameTeam && empRows.length > 1) {
    merges.push({
      s: { r: dataStart, c: 1 },
      e: { r: lunchFooterRow - 1, c: 1 },
    });
  }
  if (sameShift && empRows.length > 1) {
    merges.push({
      s: { r: dataStart, c: 2 },
      e: { r: lunchFooterRow - 1, c: 2 },
    });
  }

  await writeSheet(sheet, merges, colCount, opts.filename, "An ngoai");
}

/** Danh sách nhân viên — cùng cột với bảng /employees (không gồm cột Thao tác) */
export async function exportEmployeeListXlsx(opts: {
  employees: Employee[];
  filename?: string;
}) {
  const headers = [
    "Mã NV",
    "Họ tên",
    "Đơn vị",
    "Giới tính",
    "Ngày sinh",
    "SĐT",
    "CCCD",
    "Vai trò",
    "Trạng thái",
  ];
  const colCount = headers.length;
  const title = `Nhân viên (${opts.employees.length})`;
  const head = style({ bg: "#f5f5f5", bold: true });
  const titleStyle = style({ bg: "#ffffff", bold: true, left: true, sz: 12 });
  const left = style({ bg: "#ffffff", left: true });
  const center = style({ bg: "#ffffff" });
  const activeStyle = style({ bg: "#dcfce7", color: "#15803d", bold: true });
  const lockedStyle = style({ bg: "#f5f5f5", color: "#737373" });

  const dash = (v: string | undefined) => (v && v.trim() ? v : "—");

  const headerRow = headers.map((h) => cell(h, head));
  const body = opts.employees.map((emp) => {
    const row: SheetCell[] = [
      cell(dash(emp.employeeCode), center),
      cell(emp.name, style({ bg: "#ffffff", bold: true, left: true })),
      cell(dash(employeeCompany(emp)), center),
      cell(dash(emp.gender), center),
      cell(emp.birthDate ? formatShortDate(emp.birthDate) : "—", center),
      cell(dash(emp.phone), center),
      cell(dash(emp.cccd), center),
      cell(roleLabel(emp.role), left),
      cell(
        emp.active ? "Hoạt động" : "Đã khóa",
        emp.active ? activeStyle : lockedStyle
      ),
    ];
    return row;
  });

  const sheet: SheetCell[][] = [
    [cell(title, titleStyle), ...Array.from({ length: colCount - 1 }, () => cell("", titleStyle))],
    headerRow,
    ...body,
  ];

  await writeSheet(
    sheet,
    [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }],
    colCount,
    opts.filename || "nhan_vien.xlsx",
    "Nhan vien",
    {
      cols: [12, 24, 12, 10, 12, 14, 16, 12, 12],
      rowHpt: 20,
    }
  );
}
