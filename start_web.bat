@echo off
chcp 65001 > nul

REM Устанавливаем путь к модулям без кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ЗАПУСК ВЕБ-ИНТЕРФЕЙСА COMPASS ANALYZER          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🔨 Компиляция проекта...
go build -o compass_analyzer.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка компиляции!
    echo Проверьте, что Go установлен: go version
    pause
    exit /b 1
)

echo ✅ Компиляция успешна!
echo.
echo 🌐 Запуск веб-сервера...
echo.
echo ┌───────────────────────────────────────────────────────────┐
echo │  Откройте в браузере:  http://localhost:8080           │
echo │  Для остановки нажмите Ctrl+C                           │
echo └───────────────────────────────────────────────────────────┘
echo.

compass_analyzer.exe web

pause

