# Push lên GitHub

Mỗi lần muốn đẩy code, chỉ cần chạy file trong thư mục `run`.

## Cách 1 — PowerShell (khuyên dùng)

Trong terminal tại thư mục gốc project:

```powershell
.\run\push.ps1
```

Hoặc kèm sẵn nội dung commit:

```powershell
.\run\push.ps1 "sửa dashboard"
```

## Cách 2 — Double-click

Mở File Explorer → vào thư mục `run` → double-click `push.bat`.

## Script làm gì

1. `git add -A`
2. `git commit` (hỏi message; Enter trống = `update`)
3. `git push` lên `origin` (nhánh hiện tại)

## Remote hiện tại

- Repo: https://github.com/synopexcty-cell/IoTManager.git
- User local: `synopexcty-cell` / `synopexcty@gmail.com`

## Lưu ý

- Nếu báo **403 Permission denied**: xóa credential GitHub cũ trong Windows Credential Manager, rồi chạy lại để đăng nhập đúng tài khoản `synopexcty-cell`.
- Nếu không có thay đổi mới, script vẫn thử `push` các commit chưa đẩy.
