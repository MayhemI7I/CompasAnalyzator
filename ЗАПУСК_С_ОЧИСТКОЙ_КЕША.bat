@echo off
cls
echo ====================================
echo   CompassAnalyzer v2.0.3
echo   Clean Start
echo ====================================
echo.

echo Clearing WebView2 cache...
rd /s /q "%USERPROFILE%\AppData\Local\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Local\Temp\CompassAnalyzer" 2>nul
rd /s /q "%USERPROFILE%\AppData\Roaming\CompassAnalyzer" 2>nul
echo Done.
echo.

echo Starting application...
start "" "build\bin\CompassAnalyzer.exe"
timeout /t 2
