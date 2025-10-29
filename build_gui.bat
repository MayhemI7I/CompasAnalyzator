@echo off
chcp 65001 > nul

REM Устанавливаем путь к модулям без кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

cls
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         СБОРКА GUI ПРИЛОЖЕНИЯ COMPASS ANALYZER           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 📦 Шаг 1: Проверка зависимостей...
go mod verify > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Зависимости не установлены. Устанавливаю...
    go mod tidy
    go mod download
    echo ✅ Зависимости установлены!
) else (
    echo ✅ Все зависимости на месте!
)
echo.

echo ═══════════════════════════════════════════════════════════
echo.
echo 🔨 Шаг 2: Компиляция с флагами для Windows GUI...
echo.
echo Используемые флаги:
echo   -ldflags "-H windowsgui"  - скрыть консольное окно
echo   -ldflags "-s -w"          - уменьшить размер .exe
echo   -o compass_analyzer_gui.exe - имя выходного файла
echo.

go build -ldflags "-H windowsgui -s -w" -o compass_analyzer_gui.exe

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ОШИБКА КОМПИЛЯЦИИ!
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo Возможные причины и решения:
    echo ═══════════════════════════════════════════════════════════
    echo.
    echo 1. НЕТ GCC КОМПИЛЯТОРА
    echo    Fyne требует GCC для компиляции на Windows
    echo    Решение:
    echo      - Скачай TDM-GCC: https://jmeubank.github.io/tdm-gcc/
    echo      - Или MinGW: https://sourceforge.net/projects/mingw/
    echo      - Установи и добавь в PATH
    echo.
    echo 2. НЕ УСТАНОВЛЕНЫ ЗАВИСИМОСТИ
    echo    Решение:
    echo      go mod tidy
    echo      go mod download
    echo.
    echo 3. ОШИБКА В КОДЕ
    echo    Смотри ошибки выше
    echo.
    echo ═══════════════════════════════════════════════════════════
    echo.
    pause
    exit /b 1
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ✅ СБОРКА ЗАВЕРШЕНА УСПЕШНО!               ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo Создан файл: compass_analyzer_gui.exe
echo.
echo Запуск:
echo   1. Двойной клик на compass_analyzer_gui.exe
echo   2. Или: compass_analyzer_gui.exe gui
echo   3. Или: start_gui.bat
echo.

echo Хочешь запустить сейчас? (y/n)
set /p LAUNCH=
if /i "%LAUNCH%"=="y" (
    echo.
    echo 🚀 Запуск приложения...
    start compass_analyzer_gui.exe gui
)

echo.
pause

