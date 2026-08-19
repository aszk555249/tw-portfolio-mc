# 自動同步更新到 GitHub / Vercel 腳本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   台灣蒙地卡羅模擬器 - GitHub / Vercel 自動同步 " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 尋找 Git 執行檔
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

# 確保已設定遠端 Repository
$repoUrl = "https://github.com/aszk555249/tw-portfolio-mc.git"
& $gitCmd remote remove origin 2>$null
& $gitCmd remote add origin $repoUrl
& $gitCmd branch -M main 2>$null

Write-Host "🔍 正在檢查變更並打包檔案..." -ForegroundColor Cyan
& $gitCmd add .

$status = & $gitCmd status --porcelain
if (-not $status) {
    Write-Host "✓ 所有檔案都是最新版本，正在嘗試推送到 GitHub..." -ForegroundColor Yellow
} else {
    $nowStr = Get-Date -Format "yyyy/MM/dd HH:mm:ss"
    $customMsg = Read-Host "請輸入本次更新備註 (直接按 Enter 預設為 '更新模擬器 - $nowStr')"
    if (-not $customMsg -or $customMsg.Trim() -eq "") {
        $customMsg = "更新模擬器 - $nowStr"
    }

    Write-Host "📦 正在提交變更..." -ForegroundColor Cyan
    & $gitCmd commit -m "$customMsg"
}

Write-Host ""
Write-Host "☁️ 正在推送到 GitHub ($repoUrl)..." -ForegroundColor Cyan
Write-Host "💡 提示：若是第一次推送，系統會跳出視窗要求登入 GitHub 授權。" -ForegroundColor Yellow
Write-Host ""

& $gitCmd push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "🎉 恭喜！已成功推送到 GitHub！" -ForegroundColor Green
    Write-Host "⚡ Vercel 會在 5~10 秒內自動偵測並完成線上網頁部署！" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ 若出現登入失敗，請確認已在跳出的視窗登入您的 GitHub 帳號。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意鍵結束..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")