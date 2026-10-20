"use client";

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
  contrastText,
  DEFAULT_COLUMN_COLORS,
  monthColorKey,
  normalizeColumnColors,
  normalizeHexColor,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from "@/lib/column-colors";
import { getQueue } from "@/lib/offline-queue";
import { flushOfflineQueue, getSettings, updateSettings } from "@/lib/sheets";
import type { AppSettings, ColumnColors } from "@/lib/types";
import { todayISO } from "@/lib/utils";
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
    setColors(colorsForMonth(settings, year, month));
  }, [year, month, settings, colorsLoaded]);

  const setWeekdayColor = (index: number, hex: string) => {
    setColors((prev) => {
      const weekdays = [...prev.weekdays];
      weekdays[index] = normalizeHexColor(hex, weekdays[index]);
      return { ...prev, weekdays };
    });
  };

  const handleSaveColors = async () => {
    setSavingColors(true);
    try {
      const next = normalizeColumnColors(colors);
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
    setColors(DEFAULT_COLUMN_COLORS);
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
    <div className="mx-auto max-w-2xl space-y-4">
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
              Mỗi tháng có bộ màu riêng. Chọn tháng/năm rồi lưu — trang Lịch sử dùng đúng màu của tháng đang xem.
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

            <div className="overflow-x-auto">
              <div className="flex min-w-max overflow-hidden rounded-lg border border-neutral-200 text-center text-xs font-semibold">
                {WEEKDAY_SHORT.map((label, i) => (
                  <div
                    key={label}
                    className="w-12 border-r border-neutral-200 py-2 last:border-r-0"
                    style={{
                      backgroundColor: colors.weekdays[i],
                      color: contrastText(colors.weekdays[i]),
                    }}
                  >
                    {label}
                  </div>
                ))}
                <div
                  className="w-14 py-2"
                  style={{
                    backgroundColor: colors.total,
                    color: contrastText(colors.total),
                  }}
                >
                  Tổng
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {WEEKDAY_LABELS.map((label, i) => (
                <ColorRow
                  key={label}
                  label={`${label} (${WEEKDAY_SHORT[i]})`}
                  value={colors.weekdays[i]}
                  disabled={!colorsLoaded}
                  onChange={(hex) => setWeekdayColor(i, hex)}
                />
              ))}
              <ColorRow
                label="Cột Tổng"
                value={colors.total}
                disabled={!colorsLoaded}
                onChange={(hex) =>
                  setColors((prev) => ({
                    ...prev,
                    total: normalizeHexColor(hex, prev.total),
                  }))
                }
              />
            </div>

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

function ColorRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitDraft = () => {
    const next = normalizeHexColor(draft, value);
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-[140px] items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-md border border-neutral-200"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-medium text-black">{label}</span>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-neutral-200 bg-white p-0.5 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          aria-label={`${label} mã màu`}
          value={draft}
          disabled={disabled}
          maxLength={7}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
          }}
          className="h-10 w-[6.5rem] rounded-lg border border-neutral-200 bg-white px-2 font-mono text-sm uppercase"
        />
        {SWATCHES.map((hex) => (
          <button
            key={`${label}-${hex}`}
            type="button"
            disabled={disabled}
            title={hex}
            onClick={() => onChange(hex)}
            className="h-7 w-7 rounded-full border border-neutral-300 disabled:opacity-50"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </div>
  );
}
