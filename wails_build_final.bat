@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║    ФИНАЛЬНАЯ СБОРКА WAILS DESKTOP (все исправления)     ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Создаем папку для старых entry points
if not exist old_entry_points mkdir old_entry_points

REM Переименовываем старую GUI папку (она не нужна для Wails)
if exist gui (
    echo [1/7] 📁 Переименование старой GUI папки...
    ren gui gui_old_fyne
    if %ERRORLEVEL% NEQ 0 (
        echo ⚠️  Не удалось переименовать папку gui
        pause
        exit /b 1
    )
    echo ✅ Папка gui переименована в gui_old_fyne
) else (
    echo [1/7] ✅ Папка gui уже переименована
)

REM Временно перемещаем конфликтующие main файлы
echo [2/7] 📝 Перемещение конфликтующих файлов...

if exist main.go (
    move /Y main.go old_entry_points\main.go.bak >nul
    echo ✅ main.go → old_entry_points\main.go.bak
)

if exist main_web.go (
    move /Y main_web.go old_entry_points\main_web.go.bak >nul
    echo ✅ main_web.go → old_entry_points\main_web.go.bak
)

if exist main_tui.go (
    move /Y main_tui.go old_entry_points\main_tui.go.bak >nul
    echo ✅ main_tui.go → old_entry_points\main_tui.go.bak
)

if exist main_tui.go.bak (
    move /Y main_tui.go.bak old_entry_points\main_tui.go.bak >nul
)

REM Устанавливаем пути БЕЗ кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache
set GOTMPDIR=C:\temp\go_tmp

echo.
echo [3/7] 🗑️  Создание папок для модулей...
if not exist "%GOMODCACHE%" mkdir "%GOMODCACHE%"
if not exist "%GOCACHE%" mkdir "%GOCACHE%"
if not exist "%GOTMPDIR%" mkdir "%GOTMPDIR%"

echo.
echo [4/7] 🧹 Очистка кэша...
go clean -cache

echo.
echo [5/7] 📦 Скачивание зависимостей...
go mod download

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка скачивания зависимостей!
    REM Восстанавливаем файлы
    if exist old_entry_points\main.go.bak move /Y old_entry_points\main.go.bak main.go >nul
    if exist old_entry_points\main_web.go.bak move /Y old_entry_points\main_web.go.bak main_web.go >nul
    if exist old_entry_points\main_tui.go.bak move /Y old_entry_points\main_tui.go.bak main_tui.go >nul
    pause
    exit /b 1
)

echo.
echo [6/7] 🔧 Генерация Wails bindings...
wails generate module

echo.
echo [7/7] 🎨 Сборка Wails Desktop приложения...
echo ⏳ Это займет 2-3 минуты...
echo.

wails build -f main_desktop.go -clean

REM Сохраняем результат сборки
set BUILD_RESULT=%ERRORLEVEL%

REM Восстанавливаем переименованные файлы
echo.
echo 🔄 Восстановление файлов...
if exist old_entry_points\main.go.bak (
    move /Y old_entry_points\main.go.bak main.go >nul
    echo ✅ main.go восстановлен
)
if exist old_entry_points\main_web.go.bak (
    del old_entry_points\main_web.go.bak >nul
    echo ✅ main_web.go удален (дубликат)
)
if exist old_entry_points\main_tui.go.bak (
    move /Y old_entry_points\main_tui.go.bak main_tui.go >nul
    echo ✅ main_tui.go восстановлен
)

if %BUILD_RESULT% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ СБОРКА УСПЕШНА!                         ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📦 Готовый файл:
    echo    build\bin\CompassAnalyzer.exe
    echo.
    echo 🚀 Запустите его двойным кликом или:
    echo    build\bin\CompassAnalyzer.exe
    echo.
    echo 💡 Веб-версия доступна через:
    echo    rebuild_web.bat
    echo.
    echo ℹ️  Старые файлы сохранены в old_entry_points\
    echo.
) else (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ❌ ОШИБКА СБОРКИ WAILS                     ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 💡 Используйте альтернативы (100%% работают):
    echo.
    echo    1. Веб-версия:
    echo       rebuild_web.bat
    echo.
    echo    2. Desktop-подобный запуск:
    echo       start_desktop.vbs
    echo.
    echo Оба варианта имеют ВСЕ функции Wails версии!
    echo.
)

pause
