@echo off
chcp 65001 > nul

echo.
echo КОПИРОВАНИЕ ОБНОВЛЕННЫХ ФАЙЛОВ
echo ================================
echo.
echo Копируем из старой папки в C:\Projects\CompasAnalyzer
echo.

set SOURCE=E:\User\Рабочий стол\Ульянов\dev\CompasAnalyzer
set DEST=C:\Projects\CompasAnalyzer

echo [1/5] Копирование app.js...
copy /Y "%SOURCE%\webui\static\app.js" "%DEST%\webui\static\app.js"

echo [2/5] Копирование index.html...
copy /Y "%SOURCE%\webui\static\index.html" "%DEST%\webui\static\index.html"

echo [3/5] Копирование desktop/app.go...
copy /Y "%SOURCE%\desktop\app.go" "%DEST%\desktop\app.go"

echo [4/5] Копирование desktop/storage.go...
copy /Y "%SOURCE%\desktop\storage.go" "%DEST%\desktop\storage.go"

echo [5/5] Копирование документации...
copy /Y "%SOURCE%\README_ФИНАЛЬНЫЙ.md" "%DEST%\README.md"

echo.
echo ✅ Все файлы скопированы!
echo.
echo 💡 Теперь запустите в C:\Projects\CompasAnalyzer:
echo    rebuild_wails_simple.bat
echo.
pause

