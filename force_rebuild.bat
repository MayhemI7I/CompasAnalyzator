@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════╗
echo ║       ПРИНУДИТЕЛЬНАЯ ПЕРЕСБОРКА С ОЧИСТКОЙ КЕША          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Завершение процессов...
taskkill /F /IM CompassAnalyzer.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Очистка папки build...
if exist "build" (
    rmdir /S /Q "build" 2>nul
    timeout /t 1 /nobreak >nul
)

echo [3/5] Очистка папки frontend\wailsjs...
if exist "frontend\wailsjs" (
    rmdir /S /Q "frontend\wailsjs" 2>nul
    timeout /t 1 /nobreak >nul
)

echo [4/5] Обновление версии кеша...
echo window.APP_VERSION = '2.0.3_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%'; > webui\static\version.js

echo [5/5] Запуск сборки...
wails build

echo.
if %ERRORLEVEL% EQU 0 (
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║                  СБОРКА ЗАВЕРШЕНА УСПЕШНО!                ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    echo Готовый файл: build\bin\CompassAnalyzer.exe
) else (
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║                   ОШИБКА ПРИ СБОРКЕ!                     ║
    echo ╚════════════════════════════════════════════════════════════╝
)

pause


