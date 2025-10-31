@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║         КОПИРОВАНИЕ НА ФЛЕШКУ (v2.0.2 OFFLINE)              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo ✅ Эта версия работает БЕЗ интернета!
echo.

set SOURCE=build\bin
set APP_NAME=CompassAnalyzer

echo 📦 Что будет скопировано:
echo    • CompassAnalyzer.exe (~10 МБ)
echo    • history\ (ваша история анализов)
echo.
echo ✨ НОВОЕ: Встроены Chart.js и zoom plugin!
echo    Графики работают без интернета!
echo.

REM Проверяем наличие файлов
if not exist "%SOURCE%\CompassAnalyzer.exe" (
    echo ❌ Ошибка: CompassAnalyzer.exe не найден!
    echo    Путь: %SOURCE%\CompassAnalyzer.exe
    echo.
    pause
    exit /b 1
)

echo ═══════════════════════════════════════════════════════════════
echo.
set /p FLASH_DRIVE="📁 Введите букву флешки (например, E): "

set DEST=%FLASH_DRIVE%:\%APP_NAME%
echo.
echo 🎯 Копирование в: %DEST%
echo.

REM Создаем целевую папку
mkdir "%DEST%" 2>nul

REM Копируем EXE
echo 📄 Копирование CompassAnalyzer.exe...
copy /Y "%SOURCE%\CompassAnalyzer.exe" "%DEST%\CompassAnalyzer.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ошибка копирования EXE!
    pause
    exit /b 1
)
echo    ✅ CompassAnalyzer.exe скопирован (10.2 МБ, OFFLINE режим)

REM Копируем папку history (если существует)
if exist "%SOURCE%\history" (
    echo 📁 Копирование истории...
    mkdir "%DEST%\history" 2>nul
    copy /Y "%SOURCE%\history\*" "%DEST%\history\" >nul 2>&1
    if exist "%SOURCE%\history\analysis_history.json" (
        echo    ✅ История скопирована
        for %%A in ("%SOURCE%\history\analysis_history.json") do set SIZE=%%~zA
        set /a SIZE_MB=!SIZE! / 1048576
        if !SIZE_MB! GTR 0 (
            echo    📊 Размер истории: !SIZE_MB! МБ
        )
    ) else (
        echo    ℹ️  История пустая (будет создана при первом анализе)
    )
) else (
    echo    ℹ️  Папка history отсутствует (будет создана автоматически)
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo ✅ КОПИРОВАНИЕ ЗАВЕРШЕНО!
echo.
echo 📁 Скопировано в: %DEST%
echo.
echo 🎯 НА ДРУГОМ ПК:
echo    1. Вставьте флешку
echo    2. Откройте папку CompassAnalyzer
echo    3. Запустите CompassAnalyzer.exe
echo.
echo ✨ РАБОТАЕТ БЕЗ ИНТЕРНЕТА!
echo    • Графики отображаются
echo    • Зум работает
echo    • Все функции доступны
echo.

REM Предлагаем открыть папку
set /p OPEN="📂 Открыть папку на флешке? (Y/N): "
if /i "%OPEN%"=="Y" (
    explorer "%DEST%"
)

echo.
pause

