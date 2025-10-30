@echo off
chcp 65001 > nul

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ЗАПУСК DESKTOP В РЕЖИМЕ РАЗРАБОТКИ (Wails Dev)        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🔨 Запуск в режиме разработки с hot-reload...
echo.

wails dev -f main_desktop.go

pause

