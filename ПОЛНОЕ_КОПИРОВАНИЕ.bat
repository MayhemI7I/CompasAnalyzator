@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      ПОЛНОЕ КОПИРОВАНИЕ ПРОЕКТА В C:\Projects\         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set SOURCE=%~dp0
set DEST=C:\Projects\CompasAnalyzer

echo Исходная папка: %SOURCE%
echo Целевая папка:  %DEST%
echo.

REM Удаляем старую версию если есть
if exist "%DEST%" (
    echo Удаление старой версии...
    rmdir /s /q "%DEST%"
    echo ✅ Старая версия удалена
)

echo.
echo Создание папки...
mkdir "%DEST%"

echo.
echo Копирование ВСЕХ файлов...
echo ⏳ Подождите 2-3 минуты...
echo.

REM Копируем ВСЁ кроме лишних папок
xcopy "%SOURCE%*" "%DEST%\" /E /I /H /Y /EXCLUDE:%SOURCE%exclude_full.txt

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║              ✅ КОПИРОВАНИЕ ЗАВЕРШЕНО!                  ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo 📁 Проект скопирован в: C:\Projects\CompasAnalyzer
    echo.
    echo 🚀 Теперь ЗАПУСТИТЕ СБОРКУ:
    echo.
    echo    cd C:\Projects\CompasAnalyzer
    echo    wails_build_final.bat
    echo.
) else (
    echo.
    echo ❌ Ошибка копирования!
    echo.
)

pause

