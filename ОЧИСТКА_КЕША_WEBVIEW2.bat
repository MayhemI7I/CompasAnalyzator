@echo off
cls
echo ====================================
echo   WebView2 Cache Cleanup
echo ====================================
echo.

echo Closing CompassAnalyzer...
taskkill /F /IM CompassAnalyzer.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing cache folders...
rd /s /q "%USERPROFILE%\AppData\Local\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Local\Temp\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Roaming\CompassAnalyzer" 2>nul

echo.
echo ====================================
echo   Cache cleared!
echo ====================================
echo.
pause
