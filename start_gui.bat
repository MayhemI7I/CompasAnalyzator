@echo off
chcp 65001 > nul

REM Устанавливаем путь к модулям без кириллицы
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

cls
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      ЗАПУСК ДЕСКТОПНОГО ПРИЛОЖЕНИЯ COMPASS ANALYZER      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📦 Шаг 1: Установка зависимостей...
go mod download
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠ Ошибка загрузки зависимостей. Пробую go mod tidy...
    go mod tidy
)

echo ✅ Зависимости установлены!
echo.
echo 🔨 Шаг 2: Компиляция GUI приложения...
echo    (используются специальные флаги для Windows GUI)
go build -ldflags "-H windowsgui" -o compass_analyzer_gui.exe
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка компиляции!
    echo.
    echo Возможные причины:
    echo   1. Go не установлен (проверь: go version)
    echo   2. Не хватает зависимостей (выполни: go mod tidy)
    echo   3. Нет GCC компилятора (установи TDM-GCC или MinGW)
    echo   4. Ошибка в коде (смотри выше)
    echo.
    echo Попробуй сначала запустить: install_dependencies.bat
    echo.
    pause
    exit /b 1
)

echo ✅ Компиляция успешна!
echo.
echo 🖥️  Шаг 3: Запуск GUI приложения...
echo.
echo ┌───────────────────────────────────────────────────────────┐
echo │  Окно приложения откроется автоматически                │
echo │  Для закрытия используй кнопку ✕ в окне                 │
echo └───────────────────────────────────────────────────────────┘
echo.

compass_analyzer_gui.exe gui

echo.
echo ✓ Приложение закрыто.
pause

