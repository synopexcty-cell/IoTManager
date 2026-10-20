# ChấmCông

Ứng dụng chấm công web (Next.js 14 + MongoDB Atlas) — giao diện tiếng Việt, deploy trên Vercel.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- MongoDB Atlas (collections `employees`, `attendance`)
- Auth: chọn tên + PIN 4–6 số
- Offline queue trong `localStorage` khi mất mạng

## Quick start

```bash
npm install
cp .env.example .env.local   # điền MONGODB_URI (bắt buộc)
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

DB trống lần đầu sẽ tạo admin mặc định: **Admin** / PIN **999999**.

## MongoDB

Collections:

- **employees** — name, pin, role, active, employeeCode, phone, cccd, address
- **attendance** — timestamp, employeeName, date, checkIn, checkOut, status, note

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/chamcong?retryWrites=true&w=majority
```

Client chỉ gọi `/api/sheets` — URI không lộ browser. Thiếu `MONGODB_URI` → API trả `503`.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. **Settings → Environment Variables** → thêm `MONGODB_URI` (Production).
3. Redeploy.
4. Atlas Network Access: `0.0.0.0/0`.

```bash
npm run build
```

## Bảo mật

- PIN không trả về client
- `MONGODB_URI` chỉ trên server / Vercel env

## Tính năng

- Nhân viên: đăng nhập → check-in / check-out → lịch sử
- Admin: thêm / sửa / xóa nhân viên, lọc lịch sử, xuất CSV
- Offline: xếp hàng `localStorage` → sync lại
