@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     КОПИРОВАНИЕ ПРОГРАММЫ С ИСТОРИЕЙ НА ФЛЕШКУ               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Получаем букву флешки от пользователя
set /p FLASH_DRIVE="Введите букву флешки (например E): "

REM Убираем двоеточие если есть
set FLASH_DRIVE=%FLASH_DRIVE::=%

REM Проверяем существование диска
if not exist %FLASH_DRIVE%:\ (
    echo.
    echo ❌ ОШИБКА: Диск %FLASH_DRIVE%:\ не найден!
    echo    Проверьте букву диска и попробуйте снова.
    pause
    exit /b 1
)

echo.
echo 📦 Целевой диск: %FLASH_DRIVE%:\
echo.

REM Создаем структуру папок на флешке
echo 📁 Создание папок на флешке...
mkdir "%FLASH_DRIVE%:\CompasAnalyzer" 2>nul
mkdir "%FLASH_DRIVE%:\CompasAnalyzer\history" 2>nul

REM Копируем программу
echo.
echo 📄 Копирование программы...
if exist "build\bin\CompassAnalyzer.exe" (
    copy /Y "build\bin\CompassAnalyzer.exe" "%FLASH_DRIVE%:\CompasAnalyzer\" >nul
    echo    ✅ CompassAnalyzer.exe скопирован
) else (
    echo    ❌ ОШИБКА: build\bin\CompassAnalyzer.exe не найден!
    pause
    exit /b 1
)

REM Копируем документацию
echo.
echo 📄 Копирование документации...
if exist "README.md" (
    copy /Y "README.md" "%FLASH_DRIVE%:\CompasAnalyzer\" >nul
    echo    ✅ README.md скопирован
)

if exist "ПЕРЕНОС_НА_ФЛЕШКУ.txt" (
    copy /Y "ПЕРЕНОС_НА_ФЛЕШКУ.txt" "%FLASH_DRIVE%:\CompasAnalyzer\" >nul
    echo    ✅ ПЕРЕНОС_НА_ФЛЕШКУ.txt скопирован
)

REM Ищем файл истории
echo.
echo 🔍 Поиск файла истории...
set HISTORY_PATH=%USERPROFILE%\CompasAnalyzer\history\analysis_history.json

if exist "%HISTORY_PATH%" (
    echo    ✅ Найден: %HISTORY_PATH%
    echo.
    echo 📄 Копирование истории...
    copy /Y "%HISTORY_PATH%" "%FLASH_DRIVE%:\CompasAnalyzer\history\" >nul
    
    REM Проверяем размер файла
    for %%A in ("%HISTORY_PATH%") do set SIZE=%%~zA
    set /a SIZE_MB=%SIZE% / 1048576
    echo    ✅ История скопирована (размер: %SIZE_MB% МБ)
) else (
    echo    ⚠️  ВНИМАНИЕ: Файл истории не найден!
    echo    Путь: %HISTORY_PATH%
    echo.
    echo    Программа будет скопирована БЕЗ истории.
    echo    На новом ПК история будет пустой.
)

REM Итоги
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo ✅ КОПИРОВАНИЕ ЗАВЕРШЕНО!
echo.
echo 📦 Содержимое флешки:
echo    %FLASH_DRIVE%:\CompasAnalyzer\
echo    ├── CompassAnalyzer.exe
echo    ├── README.md
echo    ├── ПЕРЕНОС_НА_ФЛЕШКУ.txt
if exist "%FLASH_DRIVE%:\CompasAnalyzer\history\analysis_history.json" (
    echo    └── history\
    echo        └── analysis_history.json
)
echo.

REM Показываем следующие шаги
echo 📋 СЛЕДУЮЩИЕ ШАГИ НА НОВОМ ПК:
echo.
echo 1. Создайте папку:
echo    C:\Users\^<Пользователь^>\CompasAnalyzer\history\
echo.
echo 2. Скопируйте историю:
if exist "%FLASH_DRIVE%:\CompasAnalyzer\history\analysis_history.json" (
    echo    %FLASH_DRIVE%:\CompasAnalyzer\history\analysis_history.json
    echo    →
    echo    C:\Users\^<Пользователь^>\CompasAnalyzer\history\analysis_history.json
)
echo.
echo 3. Скопируйте программу в любую папку:
echo    %FLASH_DRIVE%:\CompasAnalyzer\CompassAnalyzer.exe
echo    →
echo    C:\Projects\CompasAnalyzer\CompassAnalyzer.exe
echo.
echo 4. Запустите программу
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo 💡 Подробная инструкция: ПЕРЕНОС_НА_ФЛЕШКУ.txt
echo.

REM Предлагаем открыть папку на флешке
set /p OPEN_FOLDER="Открыть папку на флешке? (Y/N): "
if /i "%OPEN_FOLDER%"=="Y" (
    explorer "%FLASH_DRIVE%:\CompasAnalyzer"
)

echo.
pause
