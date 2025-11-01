@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════
echo   ОСТАНОВКА ПРОЦЕССОВ И СБОРКА
echo ═══════════════════════════════════════════
echo.

echo [1] Завершение CompassAnalyzer.exe...
taskkill /F /IM CompassAnalyzer.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2] Завершение go.exe процессов...
taskkill /F /IM go.exe /T 2>nul
timeout /t 1 /nobreak >nul

echo [3] Сборка...
wails build

echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ УСПЕШНО!
    echo Файл: build\bin\CompassAnalyzer.exe
) else (
    echo ❌ ОШИБКА СБОРКИ
)

pause


