@echo off
chcp 65001 > nul
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ОЧИСТКА ПРОЕКТА ОТ СТАРЫХ ФАЙЛОВ                ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [1/8] 🗑️  Удаление старых exe файлов из корня...
del /Q compass_analyzer*.exe 2>nul
echo ✅ Готово

echo.
echo [2/8] 🗑️  Удаление старой папки gui_old_fyne...
rd /S /Q gui_old_fyne 2>nul
echo ✅ Готово

echo.
echo [3/8] 🗑️  Удаление старых bat скриптов...
del /Q build_desktop.bat 2>nul
del /Q build_gui.bat 2>nul
del /Q check_build.bat 2>nul
del /Q check_wails_app.bat 2>nul
del /Q clean_and_build_wails.bat 2>nul
del /Q copy_and_build_wails.bat 2>nul
del /Q copy_files_to_projects.bat 2>nul
del /Q copy_full_project.bat 2>nul
del /Q create_storage_and_rebuild.bat 2>nul
del /Q install_dependencies.bat 2>nul
del /Q start_desktop_dev.bat 2>nul
del /Q start_gui.bat 2>nul
del /Q start_tui.bat 2>nul
del /Q start_web.bat 2>nul
del /Q test_wails_build.bat 2>nul
del /Q update_and_rebuild.bat 2>nul
del /Q wails_build.bat 2>nul
del /Q wails_build_final.bat 2>nul
del /Q wails_dev.bat 2>nul
del /Q rebuild_web.bat 2>nul
del /Q start_desktop.vbs 2>nul
del /Q КОМАНДЫ_КОПИРОВАНИЯ.bat 2>nul
del /Q ПОЛНОЕ_КОПИРОВАНИЕ.bat 2>nul
echo ✅ Готово

echo.
echo [4/8] 🗑️  Удаление старых MD файлов...
del /Q BUSINESS_REQUIREMENTS.md 2>nul
del /Q CHANGELOG.md 2>nul
del /Q COMMANDS_CHEATSHEET.md 2>nul
del /Q DESKTOP_ГАЙД.md 2>nul
del /Q FIXES_SUMMARY.md 2>nul
del /Q GUI_QUICK_START.md 2>nul
del /Q HOWTO_RUN.md 2>nul
del /Q IMPROVEMENTS.md 2>nul
del /Q QUICK_FIX.md 2>nul
del /Q QUICK_START_WEB.md 2>nul
del /Q README_FIRST.txt 2>nul
del /Q README_ФИНАЛЬНЫЙ.md 2>nul
del /Q REAL_DATA_FIX.md 2>nul
del /Q WEB_QUICK_START.md 2>nul
del /Q WAILS_АЛЬТЕРНАТИВА.md 2>nul
del /Q WAILS_ИНСТРУКЦИЯ.md 2>nul
del /Q WAILS_FIXES_SUMMARY.md 2>nul
del /Q БЫСТРЫЙ_СТАРТ.md 2>nul
del /Q ЗАПУСК_WAILS_ВРУЧНУЮ.md 2>nul
del /Q ЗАПУСК_КАК_DESKTOP.md 2>nul
del /Q ИНСТРУКЦИЯ_ЗАПУСКА.md 2>nul
del /Q ИНСТРУКЦИЯ_ОБНОВЛЕНИЯ.md 2>nul
del /Q ИТОГ_WAILS.md 2>nul
del /Q ИТОГОВЫЕ_ИЗМЕНЕНИЯ.md 2>nul
del /Q КОМАНДЫ_ДЛЯ_ОБНОВЛЕНИЯ.txt 2>nul
del /Q КРАТКАЯ_ИНСТРУКЦИЯ.txt 2>nul
del /Q КРАТКОЕ_РЕЗЮМЕ.md 2>nul
del /Q НАСТРОЙКИ_ФУНКЦИЯ.md 2>nul
del /Q НОВЫЕ_ФУНКЦИИ.md 2>nul
del /Q ПАКЕТНЫЙ_АНАЛИЗ_ГАЙД.md 2>nul
del /Q ПОЛНОЕ_РУКОВОДСТВО.md 2>nul
del /Q ПРОМПТ_ДЛЯ_НОВОГО_ЧАТА.md 2>nul
del /Q СПИСОК_РАБОЧИХ_ФАЙЛОВ.md 2>nul
del /Q СПИСОК_ФАЙЛОВ_ДЛЯ_УДАЛЕНИЯ.txt 2>nul
del /Q ФИНАЛЬНАЯ_ИНСТРУКЦИЯ_WAILS.md 2>nul
del /Q ФИНАЛЬНАЯ_СТРУКТУРА.md 2>nul
del /Q ФИНАЛЬНОЕ_РЕЗЮМЕ_WAILS.md 2>nul
del /Q ФИНАЛЬНОЕ_РЕЗЮМЕ.md 2>nul
del /Q АНАЛИЗ_ПРОБЛЕМЫ_ЭКСПОРТА.md 2>nul
del /Q ГОТОВО_К_СБОРКЕ.txt 2>nul
del /Q ГОРУТИНЫ_ОПТИМИЗАЦИЯ.md 2>nul
del /Q ИСПРАВЛЕНИЯ_ГРАФИКА_И_ИСТОРИИ.md 2>nul
del /Q ИСПРАВЛЕНИЯ_ДИАЛОГОВ_И_ГРАФИКА.md 2>nul
del /Q КАК_ПРИМЕНИТЬ_ОПТИМИЗАЦИЮ.md 2>nul
del /Q КРИТИЧЕСКИЕ_ИСПРАВЛЕНИЯ_ПРОИЗВОДИТЕЛЬНОСТИ.md 2>nul
del /Q ОПТИМИЗАЦИЯ_ПАМЯТИ.md 2>nul
del /Q ФИНАЛЬНЫЕ_ИСПРАВЛЕНИЯ.md 2>nul
del /Q ФИНАЛЬНАЯ_ВЕРСИЯ_ИЗМЕНЕНИЯ.md 2>nul
echo ✅ Готово

echo.
echo [5/8] 🗑️  Удаление старых csv и тестовых файлов...
del /Q SB_CMPS*.csv 2>nul
del /Q test_*.go.bak 2>nul
del /Q exclude*.txt 2>nul
echo ✅ Готово

echo.
echo [6/8] 🗑️  Удаление неактуальных исходников...
del /Q compass_analyzer.go 2>nul
del /Q main_tui.go 2>nul
rd /S /Q webui\server.go 2>nul
echo ✅ Готово

echo.
echo [7/8] 🗑️  Удаление старых exe из build\bin...
cd build\bin
del /Q CompassAnalyzer*.exe 2>nul
del /Q *.json 2>nul
cd ..\..
echo ✅ Готово

echo.
echo [8/8] 🗑️  Удаление старых html файлов...
del /Q webui\static\index_desktop.html 2>nul
del /Q webui\static\app_desktop.js 2>nul
echo ✅ Готово

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ✅ ОЧИСТКА ЗАВЕРШЕНА!                       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📁 Удалены:
echo    - Старые exe файлы (5 шт)
echo    - Старые bat скрипты (~25 шт)
echo    - Старые MD документы (~35 шт)
echo    - Папка gui_old_fyne
echo    - Тестовые файлы
echo.
echo 📦 Осталось актуальное:
echo    - desktop\ (Go backend)
echo    - webui\ (Frontend)
echo    - analyzer\ (Алгоритм)
echo    - models\, parser\, utils\ (Вспомогательные)
echo    - Актуальная документация
echo    - rebuild_wails_simple.bat (сборка)
echo    - copy_to_flash.bat (перенос)
echo.
pause

