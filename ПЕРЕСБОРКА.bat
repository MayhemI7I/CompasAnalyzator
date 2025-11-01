@echo off
cls
echo ====================================
echo   REBUILD CompassAnalyzer v2.0.3
echo ====================================
echo.

echo [1/4] Closing processes...
taskkill /F /IM CompassAnalyzer.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Clearing WebView2 cache...
rd /s /q "%USERPROFILE%\AppData\Local\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Local\Temp\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Roaming\CompassAnalyzer" 2>nul
echo Done.

echo [3/4] Clearing frontend cache...
rd /s /q "frontend\wailsjs" 2>nul
timeout /t 1 /nobreak >nul
echo Done.

echo [4/4] Building project...
echo.
powershell -Command "Remove-Item -Recurse -Force 'frontend\wailsjs' -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1; & wails build -clean"

echo.
echo ====================================
echo   BUILD COMPLETE!
echo ====================================
echo.
echo Start application? (Y/N)
set /p choice="> "
if /i "%choice%"=="Y" (
    echo.
    echo Starting with clean cache...
    start "" "build\bin\CompassAnalyzer.exe"
    timeout /t 2 >nul
) else (
    echo.
    pause
)
