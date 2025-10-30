@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      ОБНОВЛЕНИЕ И ПЕРЕСБОРКА DESKTOP ПРИЛОЖЕНИЯ         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [1/3] 📋 Копирование обновленных файлов в C:\Projects\CompasAnalyzer...

REM Копируем только измененные файлы
copy /Y "webui\static\app.js" "C:\Projects\CompasAnalyzer\webui\static\app.js"
copy /Y "webui\static\index.html" "C:\Projects\CompasAnalyzer\webui\static\index.html"
copy /Y "desktop\app.go" "C:\Projects\CompasAnalyzer\desktop\app.go"
copy /Y "desktop\storage.go" "C:\Projects\CompasAnalyzer\desktop\storage.go"
copy /Y "README_ФИНАЛЬНЫЙ.md" "C:\Projects\CompasAnalyzer\README.md"
copy /Y "КРАТКАЯ_ИНСТРУКЦИЯ.txt" "C:\Projects\CompasAnalyzer\КРАТКАЯ_ИНСТРУКЦИЯ.txt"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Файлы скопированы успешно!
) else (
    echo ❌ Ошибка копирования!
    pause
    exit /b 1
)

echo.
echo [2/3] 🔨 Пересборка Wails приложения...
echo ⏳ Подождите 2-3 минуты...
echo.

cd /d C:\Projects\CompasAnalyzer

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

REM Перемещаем main файлы
if exist main.go move /Y main.go old_entry_points\main.go.bak >nul
if exist main_web.go move /Y main_web.go old_entry_points\main_web.go.bak >nul
if exist main_tui.go move /Y main_tui.go old_entry_points\main_tui.go.bak >nul

wails build -f main_desktop.go

set BUILD_RESULT=%ERRORLEVEL%

REM Восстанавливаем
if exist old_entry_points\main.go.bak move /Y old_entry_points\main.go.bak main.go >nul
if exist old_entry_points\main_tui.go.bak move /Y old_entry_points\main_tui.go.bak main_tui.go >nul

if %BUILD_RESULT% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ ПЕРЕСБОРКА УСПЕШНА!                     ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo [3/3] 🎉 Приложение обновлено!
    echo.
    echo 📦 Файл: C:\Projects\CompasAnalyzer\build\bin\CompassAnalyzer.exe
    echo.
    echo 🚀 Запустите его для проверки:
    echo    • Пакетный анализ → кнопка 👁️ работает
    echo    • История → отображается и сохраняется
    echo.
) else (
    echo.
    echo ❌ Ошибка пересборки!
    pause
    exit /b 1
)

pause

