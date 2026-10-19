# Push code lên GitHub (origin/main)
# Cách chạy: .\run\push.ps1
# Hoặc:      .\run\push.ps1 "nội dung commit"

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> Repo: $(Get-Location)" -ForegroundColor Cyan
Write-Host "==> Remote: $(git remote get-url origin)" -ForegroundColor Cyan
Write-Host ""

git status --short
Write-Host ""

if (-not $Message) {
    $Message = Read-Host "Commit message (Enter = update)"
}
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "update"
}

git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host "Không có thay đổi mới. Đang push nếu còn commit chưa đẩy..." -ForegroundColor Yellow
} else {
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Commit thất bại." -ForegroundColor Red
        exit 1
    }
}

git push -u origin HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push thất bại. Kiểm tra quyền GitHub / credential." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Push thành công." -ForegroundColor Green
git status -sb
