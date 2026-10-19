import type { AttendanceRecord, Employee } from "./types";

export const MOCK_EMPLOYEES: Employee[] = [
  { name: "Nguyễn Văn An", pin: "1234", role: "admin", active: true },
  { name: "Trần Thị Bình", pin: "2345", role: "employee", active: true },
  { name: "Lê Minh Châu", pin: "3456", role: "employee", active: true },
  { name: "Phạm Quốc Dũng", pin: "4567", role: "employee", active: true },
  { name: "Hoàng Thị Em", pin: "5678", role: "employee", active: false },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export let mockEmployees: Employee[] = structuredClone(MOCK_EMPLOYEES);

export let mockAttendance: AttendanceRecord[] = [
  {
    timestamp: `${daysAgo(0)}T08:05:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(0),
    checkIn: "08:05",
    checkOut: "",
    status: "checked_in",
    note: "",
  },
  {
    timestamp: `${daysAgo(0)}T07:55:00`,
    employeeName: "Trần Thị Bình",
    date: daysAgo(0),
    checkIn: "07:55",
    checkOut: "17:02",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(1)}T08:10:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(1),
    checkIn: "08:10",
    checkOut: "17:30",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(1)}T08:00:00`,
    employeeName: "Lê Minh Châu",
    date: daysAgo(1),
    checkIn: "08:00",
    checkOut: "17:00",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(2)}T08:20:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(2),
    checkIn: "08:20",
    checkOut: "17:15",
    status: "checked_out",
    note: "Đến muộn",
  },
  {
    timestamp: `${daysAgo(3)}T07:50:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(3),
    checkIn: "07:50",
    checkOut: "17:05",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(4)}T08:00:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(4),
    checkIn: "08:00",
    checkOut: "17:00",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(5)}T08:15:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(5),
    checkIn: "08:15",
    checkOut: "17:10",
    status: "checked_out",
    note: "",
  },
  {
    timestamp: `${daysAgo(6)}T07:58:00`,
    employeeName: "Nguyễn Văn An",
    date: daysAgo(6),
    checkIn: "07:58",
    checkOut: "17:00",
    status: "checked_out",
    note: "",
  },
];

export function resetMockData() {
  mockEmployees = structuredClone(MOCK_EMPLOYEES);
  mockAttendance = [
    {
      timestamp: `${daysAgo(0)}T08:05:00`,
      employeeName: "Nguyễn Văn An",
      date: daysAgo(0),
      checkIn: "08:05",
      checkOut: "",
      status: "checked_in",
      note: "",
    },
    {
      timestamp: `${daysAgo(0)}T07:55:00`,
      employeeName: "Trần Thị Bình",
      date: daysAgo(0),
      checkIn: "07:55",
      checkOut: "17:02",
      status: "checked_out",
      note: "",
    },
  ];
}
