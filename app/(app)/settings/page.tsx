"use client";

import { MonthGrid } from "@/components/attendance/MonthGrid";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  colorsForMonth,
  DEFAULT_COLUMN_COLORS,
  expandDayColors,
  monthColorKey,
  normalizeColumnColors,
  normalizeHexColor,
  WEEKDAY_SHORT,
} from "@/lib/column-colors";
import { getQueue } from "@/lib/offline-queue";
import { flushOfflineQueue, getSettings, updateSettings } from "@/lib/sheets";
import type { AppSettings, ColumnColors, Employee } from "@/lib/types";
import { daysInMonth, todayISO, weekdayOf } from "@/lib/utils";
import { AlertTriangle, Database, LogOut, Palette, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SWATCHES = [
  "#ffffff",
  "#fff1a6",
  "#ffc000",
  "#ed7d31",
  "#f8cbad",
  "#c6efce",
  "#bdd7ee",
  "#d9d9d9",
];

const PAINT_SAMPLE: Employee[] = [
  {
    name: "Bấm cột ngày để tô",
    role: "employee",
    active: true,
    employeeCode: "",
    phone: "",
    cccd: "",
    address: "",
    team: "—",
    shift: "—",
  },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [dbInfo, setDbInfo] = useState("");
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [settings, setSettings] = useState<AppSettings>({
    columnColors: DEFAULT_COLUMN_COLORS,
    monthColors: {},
  });
  const [colors, setColors] = useState<ColumnColors>(DEFAULT_COLUMN_COLORS);
  const [brush, setBrush] = useState("#ed7d31");
  const [brushDraft, setBrushDraft] = useState("#ed7d31");
  const [savingColors, setSavingColors] = useState(false);
  const [colorsLoaded, setColorsLoaded] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (!user) return;
    setQueueCount(getQueue().length);
    fetch("/api/sheets")
      .then(async (res) => {
        const data = await res.json();
        setDbOk(res.ok && data.ok === true);
        if (data.ok) {
          setDbInfo(
            `${data.host || "MongoDB"} · ${data.employees ?? "?"} nhân viên`
          );
        } else {
          setDbInfo(data.error || "Lỗi kết nối");
        }
      })
      .catch(() => {
        setDbOk(false);
        setDbInfo("Không gọi được API");
      });
    getSettings()
      .then((s) => {
        const next: AppSettings = {
          columnColors: normalizeColumnColors(s.columnColors),
          monthColors: s.monthColors || {},
        };
        setSettings(next);
      })
      .finally(() => setColorsLoaded(true));
  }, [user, router]);

  useEffect(() => {
    if (!colorsLoaded) return;
    setColors(
      expandDayColors(colorsForMonth(settings, year, month), year, month)
    );
  }, [year, month, settings, colorsLoaded]);

  const paintHex = normalizeHexColor(brush, "#ed7d31");

  const paintDay = (day: number) => {
    setColors((prev) => ({
      ...prev,
      days: { ...prev.days, [String(day)]: paintHex },
    }));
  };

  const paintWeekday = (wd: number) => {
    setColors((prev) => {
      const last = daysInMonth(year, month);
      const days = { ...prev.days };
      for (let d = 1; d <= last; d++) {
        if (weekdayOf(year, month, d) === wd) days[String(d)] = paintHex;
      }
      const weekdays = [...prev.weekdays];
      weekdays[wd] = paintHex;
      return { ...prev, days, weekdays };
    });
  };

  const paintTotal = () => {
    setColors((prev) => ({ ...prev, total: paintHex }));
  };

  const commitBrush = (hex: string) => {
    const next = normalizeHexColor(hex, paintHex);
    setBrush(next);
    setBrushDraft(next);
  };

  const handleSaveColors = async () => {
    setSavingColors(true);
    try {
      const next = expandDayColors(normalizeColumnColors(colors), year, month);
      const key = monthColorKey(year, month);
      const res = await updateSettings({ columnColors: next, monthKey: key });
      if (!res.ok) {
        toast(res.error || "Không lưu được màu cột", "error");
        return;
      }
      if (res.data) {
        setSettings({
          columnColors: normalizeColumnColors(res.data.columnColors),
          monthColors: res.data.monthColors || {},
        });
      }
      setColors(next);
      toast(`Đã lưu màu cột tháng ${month}/${year}`, "success");
    } finally {
      setSavingColors(false);
    }
  };

  const handleResetColors = () => {
    setColors(expandDayColors(DEFAULT_COLUMN_COLORS, year, month));
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { success, failed } = await flushOfflineQueue();
      setQueueCount(getQueue().length);
      if (success > 0) {
        toast(`Đã đồng bộ ${success} thao tác`, "success");
      } else if (failed > 0) {
        toast("Đồng bộ thất bại — vẫn mất kết nối", "error");
      } else {
        toast("Không có thao tác nào trong hàng đợi", "info");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
          <CardDescription>Thông tin đăng nhập hiện tại</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Họ tên</span>
            <span className="font-medium text-black">{user?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Vai trò</span>
            <span className="font-medium text-black">
              {isAdmin ? "Quản trị" : "Nhân viên"}
            </span>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-neutral-400" />
              Màu cột lịch tháng
            </CardTitle>
            <CardDescription>
              Chọn tháng, chọn màu, rồi bấm vào từng cột ngày trên bảng (giống Lịch sử / Lịch OT). T7 tuần này có thể khác T7 tuần kia; lễ chỉ tô đúng ngày đó.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Tháng"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Năm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Array.from(
                  { length: 6 },
                  (_, i) => Number(today.slice(0, 4)) - 2 + i
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-sm text-neutral-500">
                {settings.monthColors?.[monthColorKey(year, month)]
                  ? "Đã có màu riêng"
                  : "Chưa lưu — đang dùng mặc định"}
              </span>
            </div>

            <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-sm font-medium text-black">Màu đang tô</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  aria-label="Chọn màu tô"
                  value={paintHex}
                  disabled={!colorsLoaded}
                  onChange={(e) => commitBrush(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-200 bg-white p-0.5 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  aria-label="Mã màu tô"
                  value={brushDraft}
                  disabled={!colorsLoaded}
                  maxLength={7}
                  onChange={(e) => setBrushDraft(e.target.value)}
                  onBlur={() => commitBrush(brushDraft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitBrush(brushDraft);
                  }}
                  className="h-10 w-[6.5rem] rounded-lg border border-neutral-200 bg-white px-2 font-mono text-sm uppercase"
                />
                {SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    disabled={!colorsLoaded}
                    title={hex}
                    onClick={() => commitBrush(hex)}
                    className={`h-8 w-8 rounded-full border-2 disabled:opacity-50 ${
                      paintHex === hex
                        ? "border-black ring-2 ring-primary"
                        : "border-neutral-300"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-neutral-500">Tô hết thứ:</span>
                {WEEKDAY_SHORT.map((label, i) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!colorsLoaded}
                    onClick={() => paintWeekday(i)}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!colorsLoaded}
                  onClick={paintTotal}
                >
                  Tổng
                </Button>
              </div>
            </div>

            <MonthGrid
              year={year}
              month={month}
              employees={PAINT_SAMPLE}
              records={[]}
              columnColors={colors}
              title={`Màu cột — Tháng ${month}/${year}`}
              hoursLabel="Giờ"
              footerLabel="Bấm cột để tô"
              showNote={false}
              onPaintDay={paintDay}
              onPaintTotal={paintTotal}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="sm:flex-1"
                onClick={handleResetColors}
                disabled={!colorsLoaded || savingColors}
              >
                Đặt lại trắng
              </Button>
              <Button
                className="sm:flex-1"
                onClick={handleSaveColors}
                loading={savingColors}
                disabled={!colorsLoaded}
              >
                Lưu màu tháng {month}/{year}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-neutral-400" />
            Kết nối dữ liệu
          </CardTitle>
          <CardDescription>
            MongoDB Atlas và hàng đợi offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
            {dbOk === false ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-black">
                    Không kết nối được DB
                  </p>
                  <p className="text-xs text-neutral-500 break-all">{dbInfo}</p>
                </div>
              </>
            ) : (
              <>
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-black">MongoDB Atlas</p>
                  <p className="text-xs text-neutral-500">
                    {dbOk === null ? "Đang kiểm tra…" : dbInfo || "Đã kết nối"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Hàng đợi offline</span>
            <span className="font-medium tabular-nums text-black">
              {queueCount} thao tác
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSync}
            loading={syncing}
            disabled={dbOk === false}
          >
            <RefreshCw className="h-4 w-4" />
            Đồng bộ lại
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="danger"
        size="lg"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        Đăng xuất
      </Button>
    </div>
  );
}
