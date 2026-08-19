# 自動同步更新到 GitHub 腳本
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   台灣蒙地卡羅模擬器 - GitHub / Vercel 自動同步 " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 尋找 Git 路徑
$gitCmd = "git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
        $gitCmd = "C:\Program Files\Git\cmd\git.exe"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe") {
        $gitCmd = "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    } else {
        Write-Host "⚠️ 尚未偵測到 Git 工具！" -ForegroundColor Yellow
        Write-Host "正在為您透過 Windows 套件管理員 (winget) 安裝 Git..." -ForegroundColor Cyan
        winget install --id Git.Git -e --source winget
        if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
            $gitCmd = "C:\Program Files\Git\cmd\git.exe"
        }
    }
}

if (-not (Get-Command $gitCmd -ErrorAction SilentlyContinue) -and -not (Test-Path $gitCmd)) {
    Write-Host "❌ 無法啟動 Git，請先至 https://git-scm.com 下載安裝 Git！" -ForegroundColor Red
    pause
    exit
}

# 檢查是否已初始化 Git Repository
if (-not (Test-Path ".git")) {
    Write-Host "🚀 首次設定：正在初始化 Git 專案..." -ForegroundColor Yellow
    & $gitCmd init
    & $gitCmd branch -M main

    Write-Host ""
    Write-Host "請輸入您在 GitHub 上建立的 Repository 網址" -ForegroundColor Cyan
    Write-Host "(例如: https://github.com/你的帳號/tw-portfolio-mc.git)" -ForegroundColor DarkGray
    $repoUrl = Read-Host "GitHub 網址"
    
    if ($repoUrl -and $repoUrl.Trim() -ne "") {
        & $gitCmd remote add origin $repoUrl.Trim()
        Write-Host "✓ 已成功連結遠端 GitHub: $repoUrl" -ForegroundColor Green
    }
}

# 檢查變更
Write-Host "🔍 正在檢查更新的檔案..." -ForegroundColor Cyan
& $gitCmd add .
$status = & $gitCmd status --porcelain

if (-not $status) {
    Write-Host "✓ 目前沒有任何檔案變更，所有內容已是最新版本！" -ForegroundColor Green
    Write-Host ""
    pause
    exit
}

# 提交訊息
$nowStr = Get-Date -Format "yyyy/MM/dd HH:mm:ss"
$customMsg = Read-Host "請輸入本次更新說明 (直接按 Enter 預設為 '自動更新 - $nowStr')"
if (-not $customMsg -or $customMsg.Trim() -eq "") {
    $customMsg = "自動更新 - $nowStr"
}

Write-Host "📦 正在打包提交 (Commit)..." -ForegroundColor Cyan
& $gitCmd commit -m "$customMsg"

Write-Host "☁️ 正在推送到 GitHub (Push)..." -ForegroundColor Cyan
& $gitCmd push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "🎉 恭喜！已成功上傳到 GitHub！" -ForegroundColor Green
    Write-Host "⚡ Vercel 會在 5~10 秒內自動偵測並完成線上網頁部署！" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ 上傳遇到提示，請確認 GitHub 權限或網路連線。" -ForegroundColor Yellow
}

Write-Host ""
pause