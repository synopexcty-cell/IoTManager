# Google Apps Script — deploy guide

## 1. Create the spreadsheet

1. Open [Google Sheets](https://sheets.google.com) → blank spreadsheet.
2. Rename the first sheet to **Attendance**.
3. Row 1 headers:

   `Timestamp | EmployeeName | Date | CheckIn | CheckOut | Status | Note`

4. Add a second sheet named **Employees**.
5. Row 1 headers:

   `Name | PIN | Role | Active`

6. Seed at least one admin, for example:

   | Name          | PIN  | Role  | Active |
   |---------------|------|-------|--------|
   | Nguyễn Văn An | 1234 | admin | TRUE   |

## 2. Attach Apps Script

1. In the sheet: **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `Code.gs`.
3. Save the project (name it e.g. `ChamCong`).

## 3. Deploy as Web App

1. Click **Deploy → New deployment**.
2. Type: **Web app**.
3. Settings:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**, authorize the script when prompted.
5. Copy the **Web app URL** (ends with `/exec`).

## 4. Connect the Next.js app

```env
NEXT_PUBLIC_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/XXXX/exec
```

Redeploy on Vercel (or restart `npm run dev`) after setting the env var.

## Notes

- After editing `Code.gs`, create a **New deployment** (or version) so the live URL picks up changes.
- CORS: Apps Script Web Apps accept POST from browsers; the app sends `Content-Type: text/plain` to avoid preflight issues.
