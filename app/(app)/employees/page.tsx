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
  addEmployee,
  deactivateEmployee,
  listEmployees,
} from "@/lib/sheets";
import type { Employee, Role } from "@/lib/types";
import { UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listEmployees();
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await addEmployee(name.trim(), pin, role);
      if (res.ok) {
        toast("Đã thêm nhân viên", "success");
        setModalOpen(false);
        setName("");
        setPin("");
        setRole("employee");
        await load();
      } else {
        toast(res.error || "Thêm thất bại", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (empName: string) => {
    if (!confirm(`Vô hiệu hóa "${empName}"?`)) return;
    setDeactivating(empName);
    try {
      const res = await deactivateEmployee(empName);
      if (res.ok) {
        toast("Đã vô hiệu hóa nhân viên", "success");
        await load();
      } else {
        toast(res.error || "Thao tác thất bại", "error");
      }
    } finally {
      setDeactivating(null);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Quản lý danh sách nhân viên trên Google Sheet
        </p>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Thêm
        </Button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có nhân viên"
          description="Thêm nhân viên đầu tiên để bắt đầu."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Thêm nhân viên
            </Button>
          }
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <CardHeader className="border-b border-neutral-100 pb-4">
              <CardTitle>
                Nhân viên{" "}
                <span className="font-normal text-neutral-400">
                  ({employees.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.name}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
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
                        {emp.active && emp.name !== user.name && (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deactivating === emp.name}
                            onClick={() => handleDeactivate(emp.name)}
                          >
                            Vô hiệu hóa
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {employees.map((emp) => (
              <Card key={emp.name} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-black">{emp.name}</p>
                    <p className="text-sm text-neutral-500">
                      {emp.role === "admin" ? "Quản trị" : "Nhân viên"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      emp.active
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {emp.active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>
                {emp.active && emp.name !== user.name && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-3 w-full"
                    loading={deactivating === emp.name}
                    onClick={() => handleDeactivate(emp.name)}
                  >
                    Vô hiệu hóa
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm nhân viên"
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Họ và tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nguyễn Văn A"
          />
          <Input
            label="PIN (4 số)"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            required
            placeholder="••••"
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
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="employee">Nhân viên</option>
              <option value="admin">Quản trị</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
