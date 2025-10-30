@echo off
chcp 65001 > nul

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║    СБОРКА DESKTOP ПРИЛОЖЕНИЯ - Compass Analyzer         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 🔨 Компиляция desktop приложения (Wails)...
echo ⏳ Это может занять 1-2 минуты при первой сборке...
echo.

wails build -platform windows/amd64 -s -f main_desktop.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка сборки!
    echo.
    echo 💡 Возможные причины:
    echo   1. Wails не установлен: go install github.com/wailsapp/wails/v2/cmd/wails@latest
    echo   2. Нет Node.js (нужен для фронтенда)
    echo   3. Проверьте логи выше
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Сборка успешна!
echo.
echo 📦 Файл создан: build\bin\compass_analyzer_desktop.exe
echo.
echo 💡 Запустите его двойным кликом или через:
echo    .\build\bin\compass_analyzer_desktop.exe
echo.

pause

