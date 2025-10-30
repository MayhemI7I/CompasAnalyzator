@echo off
chcp 65001 > nul

echo.
echo Проверка Wails приложения с DevTools...
echo.

set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache

if not exist old_entry_points mkdir old_entry_points
if exist main.go move /Y main.go old_entry_points\main.go.bak >nul
if exist main_tui.go move /Y main_tui.go old_entry_points\main_tui.go.bak >nul

echo Запуск в режиме разработки (с консолью ошибок)...
echo.

wails dev -f main_desktop.go

if exist old_entry_points\main.go.bak move /Y old_entry_points\main.go.bak main.go >nul
if exist old_entry_points\main_tui.go.bak move /Y old_entry_points\main_tui.go.bak main_tui.go >nul

