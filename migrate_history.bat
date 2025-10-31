@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     МИГРАЦИЯ СТАРОЙ ИСТОРИИ В ЛОКАЛЬНУЮ ПАПКУ               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Старый путь к истории
set OLD_HISTORY=%USERPROFILE%\CompasAnalyzer\history\analysis_history.json

REM Новый путь (рядом с программой)
set NEW_HISTORY_DIR=build\bin\history
set NEW_HISTORY=%NEW_HISTORY_DIR%\analysis_history.json

echo 🔍 Поиск старой истории...
echo    Путь: %OLD_HISTORY%
echo.

REM Проверяем существование старого файла
if not exist "%OLD_HISTORY%" (
    echo ⚠️  Старый файл истории не найден!
    echo    Возможно, вы используете новую версию с самого начала.
    echo    Всё в порядке! ✅
    echo.
    pause
    exit /b 0
)

REM Получаем размер файла
for %%A in ("%OLD_HISTORY%") do set OLD_SIZE=%%~zA
set /a SIZE_MB=%OLD_SIZE% / 1048576

echo ✅ Найден файл истории!
echo    Размер: %SIZE_MB% МБ
echo.

REM Создаем папку для новой истории
echo 📁 Создание папки history...
mkdir "%NEW_HISTORY_DIR%" 2>nul

REM Копируем историю
echo 📄 Копирование истории...
copy /Y "%OLD_HISTORY%" "%NEW_HISTORY%" >nul

if %ERRORLEVEL% EQU 0 (
    echo ✅ История успешно скопирована!
    echo.
    echo 📍 Новое расположение:
    echo    %NEW_HISTORY%
    echo.
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo 🎉 МИГРАЦИЯ ЗАВЕРШЕНА!
    echo.
    echo Теперь история хранится РЯДОМ с программой:
    echo    build\bin\history\analysis_history.json
    echo.
    echo 💡 Старую историю можно удалить:
    echo    %OLD_HISTORY%
    echo.
    set /p DELETE_OLD="Удалить старый файл истории? (Y/N): "
    if /i "%DELETE_OLD%"=="Y" (
        del "%OLD_HISTORY%" 2>nul
        echo ✅ Старый файл удален
    ) else (
        echo ℹ️  Старый файл оставлен (можете удалить вручную)
    )
) else (
    echo ❌ ОШИБКА при копировании!
    echo    Проверьте права доступа.
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause

