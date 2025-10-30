@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ПЕРЕСБОРКА WAILS (ПРОСТАЯ ВЕРСИЯ)               ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo ⚠️  ВАЖНО: Запускайте этот скрипт ИЗ папки C:\Projects\CompasAnalyzer!
echo.

REM Проверяем, что мы в правильной папке
if not exist "main_desktop.go" (
    echo ❌ Файл main_desktop.go не найден!
    echo.
    echo 💡 Этот скрипт нужно запускать из:
    echo    C:\Projects\CompasAnalyzer
    echo.
    echo Текущая папка: %CD%
    echo.
    pause
    exit /b 1
)

echo ✅ Найден main_desktop.go
echo.

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo [1/3] 📝 Перемещение конфликтующих файлов...

if not exist old_entry_points mkdir old_entry_points

if exist main.go move /Y main.go old_entry_points\main.go.bak >nul
if exist main_web.go move /Y main_web.go old_entry_points\main_web.go.bak >nul
if exist main_tui.go move /Y main_tui.go old_entry_points\main_tui.go.bak >nul

echo ✅ Файлы перемещены

echo.
echo [2/3] 🔨 Сборка Wails приложения...
echo ⏳ Подождите 2-3 минуты...
echo.

wails build -f main_desktop.go

set BUILD_RESULT=%ERRORLEVEL%

echo.
echo [3/3] 🔄 Восстановление файлов...

if exist old_entry_points\main.go.bak move /Y old_entry_points\main.go.bak main.go >nul
if exist old_entry_points\main_tui.go.bak move /Y old_entry_points\main_tui.go.bak main_tui.go >nul

if %BUILD_RESULT% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ СБОРКА УСПЕШНА!                         ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📦 Готовый файл:
    echo    build\bin\CompassAnalyzer.exe
    echo.
    echo 🚀 Запустите его:
    echo    build\bin\CompassAnalyzer.exe
    echo.
) else (
    echo.
    echo ❌ Ошибка сборки!
    echo.
)

pause

