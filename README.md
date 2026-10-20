# ChấmCông

Ứng dụng chấm công web (Next.js 14 + Google Sheets) — giao diện tiếng Việt, deploy trên Vercel.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Google Sheets qua Apps Script Web App (`POST` JSON)
- Auth đơn giản: chọn tên + PIN 4 số
- Offline queue trong `localStorage` khi mất mạng

## Quick start (mock mode)

Không cần Google Sheet — dữ liệu in-memory, UI dùng được ngay:

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

| Tên            | PIN  | Vai trò   |
|----------------|------|-----------|
| Nguyễn Văn An  | 1234 | admin     |
| Trần Thị Bình  | 2345 | employee  |
| Lê Minh Châu   | 3456 | employee  |
| Phạm Quốc Dũng | 4567 | employee  |

## Google Sheet setup

### Schema

**Attendance**

| Timestamp | EmployeeName | Date | CheckIn | CheckOut | Status | Note |
|-----------|--------------|------|---------|----------|--------|------|

**Employees**

| Name | PIN | Role (employee\|admin) | Active | EmployeeCode | Phone | CCCD | Address |
|------|-----|------------------------|--------|

### Deploy Apps Script

Chi tiết từng bước: [`apps-script/README.md`](./apps-script/README.md).

Tóm tắt:

1. Tạo spreadsheet với 2 sheet như trên, seed 1 admin.
2. **Extensions → Apps Script** → dán `apps-script/Code.gs`.
3. Đặt Script property `API_SECRET` (xem `apps-script/README.md`).
4. **Deploy → New deployment → Web app** (Execute as: Me, Access: Anyone).
5. Copy URL `/exec`.

### Env var (server-only)

Tạo `.env.local`:

```env
SHEETS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_ID/exec
SHEETS_API_SECRET=cung-gia-tri-voi-API_SECRET
```

Nếu `SHEETS_WEBAPP_URL` trống → **mock mode**. URL và secret **không** lộ ra browser; client chỉ gọi `/api/sheets`.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. Import project trên [vercel.com](https://vercel.com).
3. Thêm Environment Variables:
   - `SHEETS_WEBAPP_URL`
   - `SHEETS_API_SECRET`
4. Deploy — không cần custom server.

```bash
npm run build   # kiểm tra local trước khi deploy
```

## Bảo mật (tóm tắt)

- PIN không trả về client (`listEmployees` trả hồ sơ công khai, không PIN)
- Apps Script yêu cầu `secret` khớp `API_SECRET`
- Proxy qua Next.js Route Handler `/api/sheets`

## Cấu trúc

```
/app
  /(auth)/login
  /(app)/dashboard
  /(app)/attendance
  /(app)/history
  /(app)/employees   (admin)
  /(app)/settings
  /api/sheets        (proxy + mock)
/components/ui
/components/layout   (Sidebar, Topbar, BottomNav, AppShell)
/lib/sheets.ts       (client → /api/sheets)
/lib/sheets-server.ts
/lib/types.ts
/apps-script/Code.gs
```

## Tính năng MVP

- **Nhân viên:** đăng nhập → Check in / Check out (1 dòng/ngày) → trạng thái hôm nay → lịch sử 7 ngày
- **Admin:** bảng tất cả bản ghi, lọc ngày + tên, xuất CSV, thêm / vô hiệu hóa nhân viên
- **Offline:** POST lỗi → xếp hàng `localStorage` → retry khi load lại + toast
