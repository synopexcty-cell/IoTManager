# ChấmCông

Ứng dụng chấm công web (Next.js 14 + MongoDB Atlas) — giao diện tiếng Việt, deploy trên Vercel.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- MongoDB Atlas (collections `employees`, `attendance`)
- Auth đơn giản: chọn tên + PIN 4 số
- Offline queue trong `localStorage` khi mất mạng

## Quick start

```bash
npm install
cp .env.example .env.local   # điền MONGODB_URI
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

- **Có** `MONGODB_URI` → dữ liệu trên Atlas. DB trống lần đầu tạo admin `Admin` / PIN `1234`.
- **Không** có URI → chế độ demo (mock in-memory).

| Tên (demo)     | PIN  | Vai trò   |
|----------------|------|-----------|
| Nguyễn Văn An  | 1234 | admin     |
| Trần Thị Bình  | 2345 | employee  |

## MongoDB

Collections:

- **employees** — name, pin, role, active, employeeCode, phone, cccd, address
- **attendance** — timestamp, employeeName, date, checkIn, checkOut, status, note

Env (server-only):

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/chamcong?retryWrites=true&w=majority
```

Client chỉ gọi `/api/sheets` — URI **không** lộ browser.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. Import project trên [vercel.com](https://vercel.com).
3. Thêm Environment Variable: `MONGODB_URI` (Production + Preview).
4. Deploy. Atlas Network Access cần `0.0.0.0/0`.

```bash
npm run build
```

## Bảo mật (tóm tắt)

- PIN không trả về client
- `MONGODB_URI` chỉ trên server / Vercel env
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
  /api/sheets        (Mongo + mock)
/lib/mongodb.ts
/lib/mongo-store.ts
/lib/sheets.ts       (client → /api/sheets)
```

## Tính năng MVP

- **Nhân viên:** đăng nhập → Check in / Check out → lịch sử
- **Admin:** quản lý nhân viên (thêm / sửa / xóa), lọc lịch sử, xuất CSV
- **Offline:** POST lỗi → hàng đợi `localStorage` → retry + toast
