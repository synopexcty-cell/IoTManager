"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  downloadEmployeeTemplate,
  parseEmployeeFile,
  type ImportRow,
} from "@/lib/employee-import";
import {
  addEmployee,
  deleteEmployee,
  importEmployees,
  listEmployees,
  updateEmployee,
} from "@/lib/sheets";
import type { Employee, Role } from "@/lib/types";
import { isValidPin } from "@/lib/utils";
import { FileSpreadsheet, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ModalMode = "add" | "edit";

const emptyForm = {
  name: "",
  pin: "",
  role: "employee" as Role,
  active: true,
  employeeCode: "",
  phone: "",
  cccd: "",
  address: "",
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [originalName, setOriginalName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listEmployees({ force: true });
      setEmployees(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (user) load();
  }, [user, router, load]);

  const openAdd = () => {
    setModalMode("add");
    setOriginalName("");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setModalMode("edit");
    setOriginalName(emp.name);
    setForm({
      name: emp.name,
      pin: "",
      role: emp.role,
      active: emp.active,
      employeeCode: emp.employeeCode || "",
      phone: emp.phone || "",
      cccd: emp.cccd || "",
      address: emp.address || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const employeeCode = form.employeeCode.trim();
    if (!name || !employeeCode) {
      toast("Vui lòng nhập họ tên và mã nhân viên", "error");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "add") {
        if (!isValidPin(form.pin)) {
          toast("Mật khẩu phải gồm 4–8 chữ số", "error");
          return;
        }
        const res = await addEmployee({
          name,
          pin: form.pin,
          role: form.role,
          employeeCode,
          phone: form.phone.trim(),
          cccd: form.cccd.trim(),
          address: form.address.trim(),
        });
        if (res.ok) {
          toast("Đã thêm nhân viên", "success");
          setModalOpen(false);
          await load();
        } else {
          toast(res.error || "Thêm thất bại", "error");
        }
        return;
      }

      if (form.pin && !isValidPin(form.pin)) {
        toast("Mật khẩu phải gồm 4–8 chữ số (hoặc để trống để giữ cũ)", "error");
        return;
      }

      const res = await updateEmployee({
        originalName,
        name,
        pin: form.pin || undefined,
        role: form.role,
        active: form.active,
        employeeCode,
        phone: form.phone.trim(),
        cccd: form.cccd.trim(),
        address: form.address.trim(),
      });
      if (res.ok) {
        toast("Đã cập nhật nhân viên", "success");
        setModalOpen(false);
        await load();
      } else {
        toast(res.error || "Cập nhật thất bại", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const rows = await parseEmployeeFile(file);
      if (rows.length === 0) {
        toast("Không đọc được dòng nhân viên trong file", "error");
        return;
      }
      setImportRows(rows);
      setImportOpen(true);
    } catch {
      toast("Không đọc được file Excel", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImport = async () => {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast("Không có dòng hợp lệ để import", "error");
      return;
    }
    setImporting(true);
    try {
      const res = await importEmployees(valid);
      if (!res.ok || !res.data) {
        toast(res.error || "Import thất bại", "error");
        return;
      }
      const { inserted, skipped, errors } = res.data;
      toast(
        `Đã thêm ${inserted} NV` +
          (skipped ? `, bỏ qua ${skipped}` : "") +
          (errors[0] ? `. ${errors[0].message}` : ""),
        inserted > 0 ? "success" : "error"
      );
      setImportOpen(false);
      setImportRows([]);
      await load();
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (empName: string) => {
    if (empName === user?.name) {
      toast("Không thể xóa tài khoản đang đăng nhập", "error");
      return;
    }
    if (
      !confirm(
        `Xóa vĩnh viễn nhân viên "${empName}"?\nThao tác này không thể hoàn tác.`
      )
    ) {
      return;
    }
    setBusyName(empName);
    try {
      const res = await deleteEmployee(empName);
      if (res.ok) {
        toast("Đã xóa nhân viên", "success");
        await load();
      } else {
        toast(res.error || "Xóa thất bại", "error");
      }
    } finally {
      setBusyName(null);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const actionButtons = (emp: Employee) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
        <Pencil className="h-3.5 w-3.5" />
        Sửa
      </Button>
      {emp.name !== user.name && (
        <Button
          variant="danger"
          size="sm"
          loading={busyName === emp.name}
          onClick={() => handleDelete(emp.name)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Quản lý hồ sơ nhân viên (mã NV, SĐT, CCCD, địa chỉ…)
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handlePickFile(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={downloadEmployeeTemplate}>
            <FileSpreadsheet className="h-4 w-4" />
            Tải mẫu Excel
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={openAdd}>
            <UserPlus className="h-4 w-4" />
            Thêm
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có nhân viên"
          description="Thêm nhân viên đầu tiên để bắt đầu."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </Button>
              <Button onClick={openAdd}>
                <UserPlus className="h-4 w-4" />
                Thêm nhân viên
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden lg:block">
            <CardHeader className="border-b border-neutral-100 pb-4">
              <CardTitle>
                Nhân viên{" "}
                <span className="font-normal text-neutral-400">
                  ({employees.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>CCCD</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.name}>
                      <TableCell className="font-medium tabular-nums">
                        {emp.employeeCode || "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          {emp.address ? (
                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-neutral-500">
                              {emp.address}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {emp.phone || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {emp.cccd || "—"}
                      </TableCell>
                      <TableCell>
                        {emp.role === "admin" ? "Quản trị" : "Nhân viên"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            emp.active
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {emp.active ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {actionButtons(emp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-3 lg:hidden">
            {employees.map((emp) => (
              <Card key={emp.name} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500">
                      {emp.employeeCode || "—"}
                    </p>
                    <p className="font-medium text-black">{emp.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {emp.role === "admin" ? "Quản trị" : "Nhân viên"}
                      {emp.phone ? ` · ${emp.phone}` : ""}
                    </p>
                    {emp.cccd ? (
                      <p className="text-xs text-neutral-500">CCCD: {emp.cccd}</p>
                    ) : null}
                    {emp.address ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        {emp.address}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      emp.active
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {emp.active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>
                <div className="mt-3">{actionButtons(emp)}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalMode === "add" ? "Thêm nhân viên" : "Sửa nhân viên"}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Mã nhân viên"
              value={form.employeeCode}
              onChange={(e) => setField("employeeCode", e.target.value)}
              required
              placeholder="NV001"
            />
            <Input
              label="Họ và tên"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              placeholder="Nguyễn Văn A"
            />
          </div>
          <Input
            label={
              modalMode === "add"
                ? "Mật khẩu (4–8 số)"
                : "Mật khẩu mới (để trống = giữ cũ)"
            }
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={form.pin}
            onChange={(e) =>
              setField("pin", e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            required={modalMode === "add"}
            placeholder="••••"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Số điện thoại"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                setField("phone", e.target.value.replace(/[^\d+\s-]/g, ""))
              }
              placeholder="0901234567"
            />
            <Input
              label="CCCD / CMND"
              inputMode="numeric"
              value={form.cccd}
              onChange={(e) =>
                setField("cccd", e.target.value.replace(/\D/g, "").slice(0, 12))
              }
              placeholder="079085001234"
            />
          </div>
          <Input
            label="Địa chỉ"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Số nhà, đường, quận/huyện, tỉnh/TP"
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="emp-role"
              className="text-sm font-medium text-neutral-800"
            >
              Vai trò
            </label>
            <select
              id="emp-role"
              value={form.role}
              onChange={(e) => setField("role", e.target.value as Role)}
              className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="employee">Nhân viên</option>
              <option value="admin">Quản trị</option>
            </select>
          </div>
          {modalMode === "edit" && (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              Đang hoạt động (bỏ chọn = khóa đăng nhập)
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeModal}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {modalMode === "add" ? "Thêm" : "Lưu"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        title="Import nhân viên từ Excel"
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        <p className="mb-3 text-sm text-neutral-500">
          {importRows.filter((r) => !r.error).length} dòng hợp lệ /{" "}
          {importRows.length} dòng. PIN trống sẽ mặc định{" "}
          <span className="font-medium text-black">1234</span>. Trùng mã NV hoặc
          họ tên sẽ bỏ qua.
        </p>
        <div className="mb-4 max-h-64 overflow-auto rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-50">
              <tr>
                <th className="px-2 py-2">Mã</th>
                <th className="px-2 py-2">Họ tên</th>
                <th className="px-2 py-2">PIN</th>
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {importRows.map((r, i) => (
                <tr
                  key={`${r.employeeCode}-${i}`}
                  className={r.error ? "bg-red-50 text-red-700" : ""}
                >
                  <td className="px-2 py-1.5 tabular-nums">{r.employeeCode}</td>
                  <td className="px-2 py-1.5">{r.name}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.pin}</td>
                  <td className="px-2 py-1.5">{r.team || "—"}</td>
                  <td className="px-2 py-1.5 text-xs">{r.error || "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setImportOpen(false)}
            disabled={importing}
          >
            Hủy
          </Button>
          <Button
            className="flex-1"
            loading={importing}
            onClick={handleImport}
            disabled={importRows.every((r) => r.error)}
          >
            Import {importRows.filter((r) => !r.error).length} dòng
          </Button>
        </div>
      </Modal>
    </div>
  );
}
