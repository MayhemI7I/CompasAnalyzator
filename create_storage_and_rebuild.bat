@echo off
chcp 65001 > nul

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║    СОЗДАНИЕ STORAGE.GO И ПЕРЕСБОРКА (для C:\Projects)  ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 💡 Этот скрипт создаст storage.go и пересоберет приложение.
echo    Запускайте его из: C:\Projects\CompasAnalyzer
echo.

REM Создаем desktop/storage.go
echo [1/2] 📝 Создание desktop/storage.go...

if not exist desktop mkdir desktop

(
echo package desktop
echo.
echo import ^(
echo 	"encoding/json"
echo 	"os"
echo 	"path/filepath"
echo 	"time"
echo ^)
echo.
echo // HistoryItem запись истории
echo type HistoryItem struct {
echo 	ID           string    `json:"id"`
echo 	Timestamp    int64     `json:"timestamp"`
echo 	Compass      string    `json:"compass"`
echo 	IsValid      bool      `json:"isValid"`
echo 	TurnsCount   int       `json:"turnsCount"`
echo 	AnglesCount  int       `json:"anglesCount"`
echo 	FullDataJSON string    `json:"fullDataJSON"`
echo }
echo.
echo // GetHistoryPath возвращает путь к файлу истории
echo func GetHistoryPath^(^) ^(string, error^) {
echo 	homeDir, err := os.UserHomeDir^(^)
echo 	if err != nil {
echo 		return "", err
echo 	}
echo 	historyDir := filepath.Join^(homeDir, "CompasAnalyzer", "history"^)
echo 	if err := os.MkdirAll^(historyDir, 0755^); err != nil {
echo 		return "", err
echo 	}
echo 	return filepath.Join^(historyDir, "analysis_history.json"^), nil
echo }
echo.
echo // SaveHistory сохраняет историю
echo func ^(a *App^) SaveHistory^(items []HistoryItem^) error {
echo 	historyPath, err := GetHistoryPath^(^)
echo 	if err != nil {
echo 		return err
echo 	}
echo 	data, err := json.MarshalIndent^(items, "", "  "^)
echo 	if err != nil {
echo 		return err
echo 	}
echo 	return os.WriteFile^(historyPath, data, 0644^)
echo }
echo.
echo // LoadHistory загружает историю
echo func ^(a *App^) LoadHistory^(^) ^([]HistoryItem, error^) {
echo 	historyPath, err := GetHistoryPath^(^)
echo 	if err != nil {
echo 		return nil, err
echo 	}
echo 	if _, err := os.Stat^(historyPath^); os.IsNotExist^(err^) {
echo 		return []HistoryItem{}, nil
echo 	}
echo 	data, err := os.ReadFile^(historyPath^)
echo 	if err != nil {
echo 		return nil, err
echo 	}
echo 	var items []HistoryItem
echo 	if err := json.Unmarshal^(data, ^&items^); err != nil {
echo 		return nil, err
echo 	}
echo 	return items, nil
echo }
echo.
echo // AddToHistory добавляет запись
echo func ^(a *App^) AddToHistory^(item HistoryItem^) error {
echo 	items, err := a.LoadHistory^(^)
echo 	if err != nil {
echo 		items = []HistoryItem{}
echo 	}
echo 	if item.ID == "" {
echo 		item.ID = time.Now^(^).Format^("20060102150405"^) + "_" + item.Compass
echo 	}
echo 	items = append^([]HistoryItem{item}, items...^)
echo 	if len^(items^) ^> 10000 {
echo 		items = items[:10000]
echo 	}
echo 	return a.SaveHistory^(items^)
echo }
echo.
echo // ClearHistory очищает историю
echo func ^(a *App^) ClearHistory^(^) error {
echo 	return a.SaveHistory^([]HistoryItem{}^)
echo }
) > desktop\storage.go

echo ✅ desktop/storage.go создан!

echo.
echo [2/2] 🔨 Запуск пересборки...
echo.

REM Вызываем простой скрипт пересборки
if exist rebuild_wails_simple.bat (
    call rebuild_wails_simple.bat
) else (
    echo ⚠️  rebuild_wails_simple.bat не найден, собираем вручную...
    
    set GOMODCACHE=C:\go_modules
    set GOCACHE=C:\go_modules\cache
    
    if not exist old_entry_points mkdir old_entry_points
    if exist main.go move /Y main.go old_entry_points\main.go.bak >nul
    if exist main_tui.go move /Y main_tui.go old_entry_points\main_tui.go.bak >nul
    
    wails build -f main_desktop.go
    
    if exist old_entry_points\main.go.bak move /Y old_entry_points\main.go.bak main.go >nul
    if exist old_entry_points\main_tui.go.bak move /Y old_entry_points\main_tui.go.bak main_tui.go >nul
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Сборка успешна!
        echo 📦 build\bin\CompassAnalyzer.exe
    )
)

