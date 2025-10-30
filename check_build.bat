@echo off
chcp 65001 > nul

echo.
echo Проверка результатов сборки Wails...
echo.

if exist "build\bin\CompassAnalyzer.exe" (
    echo ✅ УСПЕХ! Приложение найдено:
    echo    build\bin\CompassAnalyzer.exe
    echo.
    dir "build\bin\CompassAnalyzer.exe"
    echo.
    echo 🚀 Запустите его:
    echo    build\bin\CompassAnalyzer.exe
) else (
    echo ❌ Приложение НЕ найдено в build\bin\
    echo.
    echo 📁 Содержимое папки build:
    dir build /s
    echo.
    echo 💡 Возможные причины:
    echo    1. Сборка не завершилась (ошибка прав доступа)
    echo    2. Используйте веб-версию: rebuild_web.bat
)

echo.
pause

