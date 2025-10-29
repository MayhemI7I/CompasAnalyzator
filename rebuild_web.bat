@echo off
chcp 65001 > nul

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ПЕРЕКОМПИЛЯЦИЯ COMPASS ANALYZER                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 🔴 Останавливаем старый процесс...
taskkill /F /IM compass_analyzer.exe 2>nul
timeout /t 2 /nobreak > nul

echo.
echo 🔨 Компиляция с новыми настройками...
go build -o compass_analyzer.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка компиляции!
    pause
    exit /b 1
)

echo.
echo ✅ Компиляция успешна!
echo.
echo 🌐 Запуск веб-сервера с обновлённым кодом...
echo.
echo ┌───────────────────────────────────────────────────────────┐
echo │  Откройте в браузере:  http://localhost:8080           │
echo │  Допуск поворота ТЕПЕРЬ: 10° (было 15°)                │
echo │  Для остановки нажмите Ctrl+C                           │
echo └───────────────────────────────────────────────────────────┘
echo.

compass_analyzer.exe web

pause

