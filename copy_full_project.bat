@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   ПОЛНОЕ КОПИРОВАНИЕ ПРОЕКТА С АКТУАЛЬНЫМИ ФАЙЛАМИ      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo Удаление старой версии C:\Projects\CompasAnalyzer...
if exist "C:\Projects\CompasAnalyzer" (
    rmdir /s /q "C:\Projects\CompasAnalyzer"
    echo ✅ Старая версия удалена
)

echo.
echo Копирование ВСЕГО проекта со ВСЕМИ изменениями...
echo ⏳ Это займет 1-2 минуты...
echo.

xcopy /E /I /H /Y "%~dp0" "C:\Projects\CompasAnalyzer" /EXCLUDE:%~dp0exclude.txt

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Проект полностью скопирован!
    echo.
    echo 📁 Новая папка: C:\Projects\CompasAnalyzer
    echo.
    echo 🚀 Теперь ПЕРЕЙДИТЕ в эту папку и соберите:
    echo.
    echo    cd C:\Projects\CompasAnalyzer
    echo    wails_build_final.bat
    echo.
) else (
    echo ❌ Ошибка копирования!
)

pause

