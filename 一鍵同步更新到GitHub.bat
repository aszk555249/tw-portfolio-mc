@echo off
chcp 65001 >nul
title 台灣蒙地卡羅模擬器 - 一鍵同步到 GitHub / Vercel
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_github.ps1"