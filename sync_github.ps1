# 自動同步更新到 GitHub / Vercel 腳本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   台灣蒙地卡羅模擬器 - GitHub / Vercel 自動同步 " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$gitCmd = "$PSScriptRoot\vendor\git\cmd\git.exe"
if (-not (Test-Path $gitCmd)) {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitCmd = "git"
    } else {
        Write-Host "❌ 找不到 Git 執行檔！" -ForegroundColor Red
        pause
        exit
    }
}

Write-Host "🔍 正在檢查變更並打包檔案..." -ForegroundColor Cyan
& $gitCmd add .

$status = & $gitCmd status --porcelain
if (-not $status) {
    Write-Host "✓ 所有檔案都是最新版本，正在推送到 GitHub..." -ForegroundColor Yellow
} else {
    $nowStr = Get-Date -Format "yyyy/MM/dd HH:mm:ss"
    $customMsg = Read-Host "請輸入本次更新備註 (直接按 Enter 預設為 '更新模擬器 - $nowStr')"
    if (-not $customMsg -or $customMsg.Trim() -eq "") {
        $customMsg = "更新模擬器 - $nowStr"
    }

    Write-Host "📦 正在提交變更..." -ForegroundColor Cyan
    & $gitCmd commit -m "$customMsg"
}

Write-Host "☁️ 正在推送到 GitHub..." -ForegroundColor Cyan
& $gitCmd push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "🎉 恭喜！已成功推送到 GitHub！" -ForegroundColor Green
    Write-Host "⚡ Vercel 會在 5~10 秒內自動偵測並完成線上網頁部署！" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ 上傳遇到提示，請確認網路連線。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意鍵結束..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")