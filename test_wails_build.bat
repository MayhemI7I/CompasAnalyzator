@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ТЕСТОВАЯ СБОРКА DESKTOP (упрощенная)            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo 🔨 Попытка собрать desktop версию...
echo.

wails build -f main_desktop.go -o compass_analyzer_desktop.exe

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Успех! Файл создан в build\bin\
    pause
) else (
    echo.
    echo ❌ Ошибка сборки.
    echo.
    echo 💡 Wails требует Node.js для минификации фронтенда.
    echo    Попробуем режим разработки без сборки...
    echo.
    pause
)

