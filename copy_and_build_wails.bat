@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   КОПИРОВАНИЕ В ПУТЬ БЕЗ КИРИЛЛИЦЫ И СБОРКА WAILS       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Создаем папку без кириллицы
if not exist "C:\Projects" (
    echo [1/3] 📁 Создание папки C:\Projects...
    mkdir "C:\Projects"
    echo ✅ Папка создана
) else (
    echo [1/3] ✅ Папка C:\Projects уже существует
)

echo.
echo [2/3] 📋 Копирование проекта в C:\Projects\CompasAnalyzer...
echo ⏳ Это может занять 1-2 минуты...

REM Копируем проект
xcopy /E /I /Y "%~dp0*" "C:\Projects\CompasAnalyzer" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ✅ Проект успешно скопирован!
) else (
    echo ❌ Ошибка копирования!
    pause
    exit /b 1
)

echo.
echo [3/3] 🚀 Запуск сборки Wails в новой папке...
echo.

cd /d C:\Projects\CompasAnalyzer

if exist wails_build_final.bat (
    call wails_build_final.bat
) else (
    echo ❌ Файл wails_build_final.bat не найден!
    pause
    exit /b 1
)

