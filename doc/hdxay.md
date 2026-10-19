Build a full attendance (chấm công) web app with the following hard constraints. Do not change the architecture without asking me first.

## Tech stack (fixed)
- Next.js 14+ App Router, TypeScript, Tailwind CSS.
- Deploy target: Vercel (must work as-is, no custom server).
- Data storage: Google Sheets via Google Apps Script Web App (POST JSON). NO database, NO SQLite, NO MongoDB.
- All Google Sheets access goes through ONE env var: NEXT_PUBLIC_SHEETS_WEBAPP_URL.
- Auth: simple — user picks their name from a list + optional 4-digit PIN stored in the sheet. No OAuth, no LINE login.

## Google Sheet schema (create a setup guide in README)
Sheet "Attendance": columns = Timestamp | EmployeeName | Date | CheckIn | CheckOut | Status | Note
Sheet "Employees": columns = Name | PIN | Role (employee|admin) | Active

## Features (MVP only, no extras)
1. Employee flow:
   - Select name, enter PIN.
   - Big buttons: "Check in" / "Check out". One record per day per person; check-out updates the same row.
   - Show today's status card (đã vào / đã ra / chưa chấm).
   - Show my last 7 days history.
2. Admin flow (role = admin):
   - Table of all records, filter by date range + name.
   - Export CSV.
   - Manage employees (add/deactivate) — writes to Employees sheet.
3. Offline-tolerant: if POST fails, queue in localStorage and retry on next load. Show a toast.

## UI / Design (this is the priority — spend most effort here)
Color palette: white background, red primary (#DC2626 or similar), black text/accents. Clean, modern, high contrast. Use red only for primary actions and active states — don't overuse.
Typography: Inter or Geist. Rounded-lg cards, subtle shadows, generous whitespace.

### Desktop (≥ 1024px)
- Fixed LEFT SIDEBAR, collapsible/expandable with a smooth animation (~200ms).
  - Expanded: ~260px, shows logo + icon + label for each nav item.
  - Collapsed: ~72px, icons only, labels appear as tooltips on hover.
  - Collapse state persisted in localStorage.
  - Nav items: Dashboard, Chấm công, Lịch sử, Nhân viên (admin only), Cài đặt.
- TOPBAR across the remaining width: page title on the left, right side has current date/time (live clock), user avatar + name dropdown (logout).
- Main content area scrolls independently; sidebar and topbar stay fixed.

### Mobile (< 1024px)
- No sidebar. Instead: a bottom navigation bar (5 icons max) OR a hamburger that opens a slide-in drawer — pick bottom nav for the 4 main items, it feels more app-like.
- Topbar becomes compact: title + avatar only.
- Must feel like a mobile app: safe-area insets, 44px min tap targets, no horizontal scroll, sticky action buttons.
- Tables become card lists on mobile.

### General
- Dark mode is NOT required. Keep it light/white/red/black only.
- Loading skeletons for data fetches. Empty states with an illustration/icon.
- Vietnamese UI labels (app is for Vietnamese users). Code/comments in English.
- Accessible: focus rings, aria-labels on icon buttons.

## Project structure
/app
  /(auth)/login
  /(app)/dashboard
  /(app)/attendance
  /(app)/history
  /(app)/employees   (admin)
  /(app)/settings
/components/ui      (Button, Card, Input, Modal, Toast, Table)
/components/layout  (Sidebar, Topbar, BottomNav, AppShell)
/lib/sheets.ts      (fetch wrapper for Apps Script)
/lib/types.ts
/apps-script/Code.gs  (the Apps Script code, with doPost/doGet, and a README section on how to deploy it)

## Deliverables
1. Working code, builds with `npm run build` with zero TS errors.
2. README with: how to set up the Google Sheet, how to deploy Apps Script as Web App, how to set the env var, how to deploy to Vercel.
3. A mock mode: if NEXT_PUBLIC_SHEETS_WEBAPP_URL is missing, use in-memory mock data so the UI is fully clickable in dev.

## Rules
- Ask me before adding any dependency beyond: next, react, tailwindcss, lucide-react, date-fns, clsx.
- Do not invent features outside this spec.
- Prioritize the layout (collapsible sidebar + topbar + mobile bottom nav) and the white/red/black visual polish — that's what I'll judge first.

Start by scaffolding the project and the AppShell (sidebar + topbar + mobile nav) with mock data, then we iterate on features.