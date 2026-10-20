"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { listAttendance, listEmployees } from "@/lib/sheets";
import type { AttendanceRecord } from "@/lib/types";
import { addDaysISO, formatShortDate, statusLabel, todayISO } from "@/lib/utils";
import { Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function HistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [nameFilter, setNameFilter] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters: { name?: string; from?: string; to?: string } = {
        from,
        to,
      };
      if (isAdmin) {
        if (nameFilter) filters.name = nameFilter;
      } else {
        filters.name = user.name;
      }
      const data = await listAttendance(filters);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [user, from, to, nameFilter, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    listEmployees().then((emps) =>
      setNames(emps.filter((e) => e.active).map((e) => e.name))
    );
  }, [isAdmin]);

  const exportCsv = () => {
    const header = [
      "Timestamp",
      "EmployeeName",
      "Date",
      "CheckIn",
      "CheckOut",
      "Status",
      "Note",
    ];
    const rows = records.map((r) =>
      [
        r.timestamp,
        r.employeeName,
        r.date,
        r.checkIn,
        r.checkOut,
        r.status,
        r.note,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chamcong_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const title = useMemo(
    () => (isAdmin ? "Tất cả bản ghi" : "Lịch sử của tôi"),
    [isAdmin]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            label="Từ ngày"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="sm:w-40"
          />
          <Input
            label="Đến ngày"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="sm:w-40"
          />
          {isAdmin && (
            <div className="flex w-full flex-col gap-1.5 sm:w-48">
              <label
                htmlFor="filter-name"
                className="text-sm font-medium text-neutral-800"
              >
                Nhân viên
              </label>
              <select
                id="filter-name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Tất cả</option>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={records.length === 0}
              className="sm:ml-auto"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <TableSkeleton />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có dữ liệu"
          description="Thử đổi khoảng ngày hoặc bộ lọc tên."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <CardHeader className="border-b border-neutral-100 pb-4">
              <CardTitle>
                {title}{" "}
                <span className="font-normal text-neutral-400">
                  ({records.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Nhân viên</TableHead>}
                    <TableHead>Ngày</TableHead>
                    <TableHead>Vào</TableHead>
                    <TableHead>Ra</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={`${r.date}-${r.employeeName}-${r.timestamp}`}>
                      {isAdmin && (
                        <TableCell className="font-medium">
                          {r.employeeName}
                        </TableCell>
                      )}
                      <TableCell>{formatShortDate(r.date)}</TableCell>
                      <TableCell className="tabular-nums">
                        {r.checkIn || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.checkOut || "—"}
                      </TableCell>
                      <TableCell>{statusLabel(r.status)}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-neutral-500">
                        {r.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            <p className="text-sm text-neutral-500">
              {title} ({records.length})
            </p>
            {records.map((r) => (
              <Card
                key={`${r.date}-${r.employeeName}-${r.timestamp}-m`}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isAdmin && (
                      <p className="font-medium text-black">{r.employeeName}</p>
                    )}
                    <p className="text-sm text-neutral-600">
                      {formatShortDate(r.date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                    {statusLabel(r.status)}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-sm tabular-nums text-neutral-800">
                  <span>Vào: {r.checkIn || "—"}</span>
                  <span>Ra: {r.checkOut || "—"}</span>
                </div>
                {r.note && (
                  <p className="mt-2 text-xs text-neutral-500">{r.note}</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
