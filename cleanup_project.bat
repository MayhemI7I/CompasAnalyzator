@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ОЧИСТКА ПРОЕКТА ОТ МУСОРА                  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 🗑️  Удаление старых сборок...
if exist compass_analyzer_fixed.exe del /q compass_analyzer_fixed.exe
if exist compass_analyzer_latest.exe del /q compass_analyzer_latest.exe
if exist compass_analyzer_new.exe del /q compass_analyzer_new.exe
if exist compass_analyzer_v2.exe del /q compass_analyzer_v2.exe
if exist compass_test.exe del /q compass_test.exe

echo 🗑️  Удаление старых README и документации...
if exist BUSINESS_REQUIREMENTS.md del /q BUSINESS_REQUIREMENTS.md
if exist CHANGELOG.md del /q CHANGELOG.md
if exist COMMANDS_CHEATSHEET.md del /q COMMANDS_CHEATSHEET.md
if exist FIXES_SUMMARY.md del /q FIXES_SUMMARY.md
if exist GUI_QUICK_START.md del /q GUI_QUICK_START.md
if exist HOWTO_RUN.md del /q HOWTO_RUN.md
if exist IMPROVEMENTS.md del /q IMPROVEMENTS.md
if exist QUICK_FIX.md del /q QUICK_FIX.md
if exist QUICK_START_WEB.md del /q QUICK_START_WEB.md
if exist REAL_DATA_FIX.md del /q REAL_DATA_FIX.md
if exist WEB_QUICK_START.md del /q WEB_QUICK_START.md
if exist DESKTOP_ГАЙД.md del /q DESKTOP_ГАЙД.md
if exist ЗАПУСК_WAILS_ВРУЧНУЮ.md del /q ЗАПУСК_WAILS_ВРУЧНУЮ.md
if exist WAILS_АЛЬТЕРНАТИВА.md del /q WAILS_АЛЬТЕРНАТИВА.md
if exist WAILS_ИНСТРУКЦИЯ.md del /q WAILS_ИНСТРУКЦИЯ.md
if exist ЗАПУСК_КАК_DESKTOP.md del /q ЗАПУСК_КАК_DESKTOP.md
if exist ИТОГ_WAILS.md del /q ИТОГ_WAILS.md
if exist ФИНАЛЬНАЯ_ИНСТРУКЦИЯ_WAILS.md del /q ФИНАЛЬНАЯ_ИНСТРУКЦИЯ_WAILS.md
if exist ФИНАЛЬНОЕ_РЕЗЮМЕ_WAILS.md del /q ФИНАЛЬНОЕ_РЕЗЮМЕ_WAILS.md
if exist ИТОГОВЫЕ_ИЗМЕНЕНИЯ.md del /q ИТОГОВЫЕ_ИЗМЕНЕНИЯ.md
if exist ИНСТРУКЦИЯ_ЗАПУСКА.md del /q ИНСТРУКЦИЯ_ЗАПУСКА.md
if exist КРАТКОЕ_РЕЗЮМЕ.md del /q КРАТКОЕ_РЕЗЮМЕ.md
if exist НАСТРОЙКИ_ФУНКЦИЯ.md del /q НАСТРОЙКИ_ФУНКЦИЯ.md
if exist НОВЫЕ_ФУНКЦИИ.md del /q НОВЫЕ_ФУНКЦИИ.md
if exist ПАКЕТНЫЙ_АНАЛИЗ_ГАЙД.md del /q ПАКЕТНЫЙ_АНАЛИЗ_ГАЙД.md
if exist ПОЛНОЕ_РУКОВОДСТВО.md del /q ПОЛНОЕ_РУКОВОДСТВО.md
if exist ПРОМПТ_ДЛЯ_НОВОГО_ЧАТА.md del /q ПРОМПТ_ДЛЯ_НОВОГО_ЧАТА.md
if exist ФИНАЛЬНОЕ_РЕЗЮМЕ.md del /q ФИНАЛЬНОЕ_РЕЗЮМЕ.md
if exist README_FIRST.txt del /q README_FIRST.txt

echo 🗑️  Удаление старых скриптов...
if exist build_gui.bat del /q build_gui.bat
if exist install_dependencies.bat del /q install_dependencies.bat
if exist start_gui.bat del /q start_gui.bat
if exist start_tui.bat del /q start_tui.bat
if exist build_desktop.bat del /q build_desktop.bat
if exist start_desktop_dev.bat del /q start_desktop_dev.bat
if exist test_wails_build.bat del /q test_wails_build.bat
if exist clean_and_build_wails.bat del /q clean_and_build_wails.bat
if exist check_build.bat del /q check_build.bat

echo 🗑️  Удаление старых backup файлов...
if exist test_1912.go.bak del /q test_1912.go.bak
if exist compass_analyzer.go del /q compass_analyzer.go

echo 🗑️  Удаление старых папок...
if exist gui_old_fyne rmdir /s /q gui_old_fyne
if exist old_entry_points rmdir /s /q old_entry_points

echo 🗑️  Удаление лог файлов...
if exist logs rmdir /s /q logs

echo.
echo ✅ Очистка завершена!
echo.
echo 📁 Оставлены только необходимые файлы:
echo    • compass_analyzer.exe (веб-версия)
echo    • build\bin\CompassAnalyzer.exe (desktop)
echo    • README.md (актуальная инструкция)
echo    • Рабочие .bat скрипты
echo.
pause

