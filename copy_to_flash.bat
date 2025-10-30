@echo off
chcp 65001 > nul
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║        КОПИРОВАНИЕ НА ФЛЕШКУ                            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Проверяем наличие скомпилированного exe
if not exist "build\bin\CompassAnalyzer.exe" (
    echo ❌ Файл CompassAnalyzer.exe не найден!
    echo.
    echo 💡 Сначала соберите приложение командой:
    echo    rebuild_wails_simple.bat
    echo.
    pause
    exit /b 1
)

echo 📂 Укажите букву флешки (например, E, F, G):
set /p FLASH_DRIVE="Буква диска: "

if "%FLASH_DRIVE%"=="" (
    echo ❌ Буква диска не указана!
    pause
    exit /b 1
)

set DEST=%FLASH_DRIVE%:\CompassAnalyzer
set HISTORY_SOURCE=%USERPROFILE%\CompasAnalyzer\history\analysis_history.json

echo.
echo 📦 Будет создана папка: %DEST%
echo.
echo Что копировать?
echo [1] Только приложение (быстро, ~15 МБ)
echo [2] Приложение + История
echo [3] Весь проект (исходники + приложение)
echo.
set /p COPY_MODE="Выберите (1/2/3): "

if "%COPY_MODE%"=="1" goto COPY_APP_ONLY
if "%COPY_MODE%"=="2" goto COPY_WITH_HISTORY
if "%COPY_MODE%"=="3" goto COPY_FULL_PROJECT

echo ❌ Неверный выбор!
pause
exit /b 1

:COPY_APP_ONLY
echo.
echo [1/1] 📋 Копирование приложения...
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "build\bin\CompassAnalyzer.exe" "%DEST%\CompassAnalyzer.exe" > nul
echo ✅ Готово!
goto SUCCESS

:COPY_WITH_HISTORY
echo.
echo [1/2] 📋 Копирование приложения...
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "build\bin\CompassAnalyzer.exe" "%DEST%\CompassAnalyzer.exe" > nul
echo ✅ Приложение скопировано

echo.
echo [2/2] 💾 Копирование истории...
if exist "%HISTORY_SOURCE%" (
    if not exist "%DEST%\history_backup" mkdir "%DEST%\history_backup"
    copy /Y "%HISTORY_SOURCE%" "%DEST%\history_backup\analysis_history.json" > nul
    echo ✅ История скопирована
) else (
    echo ⚠️  Файл истории не найден (история пуста)
)
goto SUCCESS

:COPY_FULL_PROJECT
echo.
echo [1/7] 📋 Создание структуры папок...
if not exist "%DEST%" mkdir "%DEST%"
if not exist "%DEST%\analyzer" mkdir "%DEST%\analyzer"
if not exist "%DEST%\desktop" mkdir "%DEST%\desktop"
if not exist "%DEST%\models" mkdir "%DEST%\models"
if not exist "%DEST%\parser" mkdir "%DEST%\parser"
if not exist "%DEST%\utils" mkdir "%DEST%\utils"
if not exist "%DEST%\webui" mkdir "%DEST%\webui"
if not exist "%DEST%\webui\static" mkdir "%DEST%\webui\static"
if not exist "%DEST%\build" mkdir "%DEST%\build"
if not exist "%DEST%\build\bin" mkdir "%DEST%\build\bin"
echo ✅ Папки созданы

echo.
echo [2/7] 📁 Копирование исходников Go...
xcopy /Y /Q "analyzer\*.go" "%DEST%\analyzer\" > nul
xcopy /Y /Q "desktop\*.go" "%DEST%\desktop\" > nul
xcopy /Y /Q "models\*.go" "%DEST%\models\" > nul
xcopy /Y /Q "parser\*.go" "%DEST%\parser\" > nul
xcopy /Y /Q "utils\*.go" "%DEST%\utils\" > nul
echo ✅ Исходники скопированы

echo.
echo [3/7] 🌐 Копирование веб-интерфейса...
xcopy /Y /Q "webui\static\*.*" "%DEST%\webui\static\" > nul
echo ✅ Веб-интерфейс скопирован

echo.
echo [4/7] 📋 Копирование основных файлов...
copy /Y "main_desktop.go" "%DEST%\" > nul
copy /Y "go.mod" "%DEST%\" > nul
copy /Y "go.sum" "%DEST%\" > nul
copy /Y "wails.json" "%DEST%\" > nul
echo ✅ Основные файлы скопированы

echo.
echo [5/7] 🔨 Копирование скомпилированного приложения...
copy /Y "build\bin\CompassAnalyzer.exe" "%DEST%\build\bin\" > nul
echo ✅ Приложение скопировано

echo.
echo [6/7] 📜 Копирование документации...
copy /Y "*.md" "%DEST%\" > nul 2>&1
copy /Y "*.bat" "%DEST%\" > nul 2>&1
echo ✅ Документация скопирована

echo.
echo [7/7] 💾 Копирование истории...
if exist "%HISTORY_SOURCE%" (
    if not exist "%DEST%\history_backup" mkdir "%DEST%\history_backup"
    copy /Y "%HISTORY_SOURCE%" "%DEST%\history_backup\analysis_history.json" > nul
    echo ✅ История скопирована
) else (
    echo ⚠️  Файл истории не найден (история пуста)
)
goto SUCCESS

:SUCCESS
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ✅ КОПИРОВАНИЕ ЗАВЕРШЕНО!                  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📁 Файлы скопированы в: %DEST%
echo.
echo 🚀 На новом ПК:
echo    1. Скопируйте папку с флешки
echo    2. Запустите CompassAnalyzer.exe
if "%COPY_MODE%"=="2" (
    echo    3. Для переноса истории смотрите ПЕРЕНОС_НА_ДРУГОЙ_ПК.md
)
if "%COPY_MODE%"=="3" (
    echo    3. Для пересборки: rebuild_wails_simple.bat
)
echo.
pause

