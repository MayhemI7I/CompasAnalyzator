@echo off
chcp 65001 > nul

REM Устанавливаем путь к модулям без кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

cls
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      ЗАПУСК TUI ПРИЛОЖЕНИЯ COMPASS ANALYZER              ║
echo ║      (Terminal User Interface - БЕЗ GCC)                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo ✅ TUI не требует внешних библиотек!
echo ✅ Работает на любом компьютере с Go!
echo.
echo 🔨 Компиляция...
go build -o compass_analyzer.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка компиляции!
    pause
    exit /b 1
)

echo ✅ Компиляция успешна!
echo.
echo 📊 Запуск TUI режима...
echo.

compass_analyzer.exe tui

echo.
pause

