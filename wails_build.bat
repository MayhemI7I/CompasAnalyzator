@echo off
chcp 65001 > nul

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         СБОРКА WAILS DESKTOP ПРИЛОЖЕНИЯ                 ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [1/3] 📦 Скачивание зависимостей...
go mod download
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка скачивания зависимостей!
    pause
    exit /b 1
)

echo.
echo [2/3] 🔧 Генерация Wails bindings...
wails generate module
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Предупреждение: wails generate завершился с ошибкой
    echo Продолжаем сборку...
)

echo.
echo [3/3] 🔨 Сборка desktop приложения...
echo ⏳ Это займет 2-3 минуты при первой сборке...
echo.

wails build -f main_desktop.go

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ СБОРКА УСПЕШНА!                         ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📦 Файл создан: build\bin\CompassAnalyzer.exe
    echo.
    echo 🚀 Запустите его двойным кликом!
    echo.
) else (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ❌ ОШИБКА СБОРКИ                           ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 💡 Возможные причины:
    echo   1. Не установлен Node.js (проверьте: node --version)
    echo   2. Не установлен Go 1.23+ (проверьте: go version)
    echo   3. Недостаточно прав (запустите как администратор)
    echo.
    echo Логи выше ^↑
    echo.
)

pause

