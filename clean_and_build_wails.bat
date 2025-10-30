@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║    ОЧИСТКА И СБОРКА WAILS (Решение проблемы кириллицы)  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Устанавливаем пути БЕЗ кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache
set GOTMPDIR=C:\temp\go_tmp

echo [1/5] 🗑️  Очистка старых модулей...
if exist "%GOMODCACHE%" (
    rmdir /s /q "%GOMODCACHE%" 2>nul
)
mkdir "%GOMODCACHE%" 2>nul
mkdir "%GOCACHE%" 2>nul
mkdir "%GOTMPDIR%" 2>nul

echo [2/5] 🧹 Очистка кэша Go...
go clean -modcache

echo [3/5] 📦 Скачивание зависимостей...
go mod download

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка скачивания зависимостей!
    pause
    exit /b 1
)

echo.
echo [4/5] 🔧 Генерация Wails bindings...
wails generate module

echo.
echo [5/5] 🔨 Сборка desktop приложения...
echo ⏳ Это займет 2-3 минуты...
echo.

wails build -f main_desktop.go -clean

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ СБОРКА УСПЕШНА!                         ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📦 Файл: build\bin\CompassAnalyzer.exe
    echo.
    echo 🚀 Запустите двойным кликом!
    echo.
) else (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ❌ ОШИБКА СБОРКИ                           ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 💡 Если ошибка сохраняется:
    echo    1. Используйте веб-версию: rebuild_web.bat
    echo    2. Или VBS-ярлык: start_desktop.vbs
    echo.
)

pause

