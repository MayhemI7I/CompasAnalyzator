@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   КОПИРОВАНИЕ ОБНОВЛЕННЫХ ФАЙЛОВ В C:\Projects\...     ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 📋 Копирование из текущей папки в C:\Projects\CompasAnalyzer...
echo.

if not exist "C:\Projects\CompasAnalyzer" (
    echo ❌ Папка C:\Projects\CompasAnalyzer не найдена!
    echo.
    echo 💡 Сначала запустите:
    echo    copy_and_build_wails.bat
    echo.
    pause
    exit /b 1
)

echo [1/2] 📁 Копирование обновленных файлов...

REM Копируем обновленные файлы
copy /Y "webui\static\app.js" "C:\Projects\CompasAnalyzer\webui\static\app.js" >nul
copy /Y "webui\static\index.html" "C:\Projects\CompasAnalyzer\webui\static\index.html" >nul
copy /Y "desktop\app.go" "C:\Projects\CompasAnalyzer\desktop\app.go" >nul

REM Создаем storage.go если его нет
if not exist "C:\Projects\CompasAnalyzer\desktop\storage.go" (
    copy /Y "desktop\storage.go" "C:\Projects\CompasAnalyzer\desktop\storage.go" >nul
)

REM Копируем документацию
copy /Y "README_ФИНАЛЬНЫЙ.md" "C:\Projects\CompasAnalyzer\README.md" >nul
copy /Y "КРАТКАЯ_ИНСТРУКЦИЯ.txt" "C:\Projects\CompasAnalyzer\КРАТКАЯ_ИНСТРУКЦИЯ.txt" >nul
copy /Y "rebuild_wails_simple.bat" "C:\Projects\CompasAnalyzer\rebuild_wails_simple.bat" >nul
copy /Y "СПИСОК_ФАЙЛОВ_ДЛЯ_УДАЛЕНИЯ.txt" "C:\Projects\CompasAnalyzer\СПИСОК_ФАЙЛОВ_ДЛЯ_УДАЛЕНИЯ.txt" >nul

echo ✅ Файлы скопированы!

echo.
echo [2/2] 📝 Готово к пересборке!
echo.
echo 💡 Теперь перейдите в C:\Projects\CompasAnalyzer и запустите:
echo.
echo    cd C:\Projects\CompasAnalyzer
echo    rebuild_wails_simple.bat
echo.

pause

