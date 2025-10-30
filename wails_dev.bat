@echo off
chcp 65001 > nul

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      WAILS РЕЖИМ РАЗРАБОТКИ (Hot Reload)                ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🔥 Запуск с автоматической перезагрузкой...
echo    Изменения HTML/CSS/JS применятся автоматически!
echo.

wails dev -f main_desktop.go

pause

