# Google Apps Script — deploy guide

## 1. Create the spreadsheet

1. Open [Google Sheets](https://sheets.google.com) → blank spreadsheet.
2. Rename the first sheet to **Attendance**.
3. Row 1 headers:

   `Timestamp | EmployeeName | Date | CheckIn | CheckOut | Status | Note`

4. Add a second sheet named **Employees**.
5. Row 1 headers:

   `Name | PIN | Role | Active | EmployeeCode | Phone | CCCD | Address`

6. Seed at least one admin, for example:

   | Name | PIN | Role | Active | EmployeeCode | Phone | CCCD | Address |
   |------|-----|------|--------|--------------|-------|------|---------|
   | Nguyễn Văn An | 1234 | admin | TRUE | NV001 | 0901234567 | 079085001234 | Quận 1, TP.HCM |

   Nếu sheet cũ chỉ có 4 cột đầu: thêm 4 cột còn lại vào hàng header rồi **New deployment** Apps Script.

## 2. Attach Apps Script

1. In the sheet: **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `Code.gs`.
3. Save the project (name it e.g. `ChamCong`).

## 3. Set API secret (bắt buộc)

1. Trong Apps Script: **Project Settings** (biểu tượng bánh răng) → **Script properties**.
2. Add property:
   - **Property**: `API_SECRET`
   - **Value**: chuỗi dài ngẫu nhiên (ví dụ tạo bằng password manager)
3. Dùng **cùng giá trị** cho `SHEETS_API_SECRET` trên Vercel / `.env.local`.

Không set property → script dùng fallback `CHANGE_ME_SET_SCRIPT_PROPERTY` (không an toàn).

## 4. Deploy as Web App

1. Click **Deploy → New deployment**.
2. Type: **Web app**.
3. Settings:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**, authorize the script when prompted.
5. Copy the **Web app URL** (ends with `/exec`).

## 5. Connect the Next.js app

`.env.local` (hoặc Vercel Environment Variables):

```env
SHEETS_WEBAPP_URL=https://script.google.com/macros/s/XXXX/exec
SHEETS_API_SECRET=cung-gia-tri-voi-API_SECRET
```

Restart `npm run dev` / redeploy Vercel.

Client **không** thấy URL hay secret — mọi request đi qua `/api/sheets`.

## Notes

- Sau khi sửa `Code.gs`, tạo **New deployment** (hoặc version mới).
- `listEmployees` không trả PIN; chỉ `verifyPin` so khớp PIN phía server.
- Request thiếu / sai `secret` → `{ ok: false, error: "Unauthorized" }`.
