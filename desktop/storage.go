package desktop

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// HistoryItem запись истории
type HistoryItem struct {
	ID          string `json:"id"`
	Timestamp   int64  `json:"timestamp"`
	Compass     string `json:"compass"`
	IsValid     bool   `json:"isValid"`
	TurnsCount  int    `json:"turnsCount"`
	AnglesCount int    `json:"anglesCount"`
	FullData    string `json:"fullData"`
}

// GetHistoryPath возвращает путь к файлу истории
func GetHistoryPath() (string, error) {
	// Получаем папку пользователя
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Создаем папку для истории
	historyDir := filepath.Join(homeDir, "CompasAnalyzer", "history")
	if err := os.MkdirAll(historyDir, 0755); err != nil {
		return "", err
	}

	return filepath.Join(historyDir, "analysis_history.json"), nil
}

// SaveHistory сохраняет историю в файл
func (a *App) SaveHistory(items []HistoryItem) error {
	historyPath, err := GetHistoryPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(historyPath, data, 0644)
}

// LoadHistory загружает историю из файла
func (a *App) LoadHistory() ([]HistoryItem, error) {
	historyPath, err := GetHistoryPath()
	if err != nil {
		return nil, err
	}

	// Если файла нет - возвращаем пустой массив
	if _, err := os.Stat(historyPath); os.IsNotExist(err) {
		return []HistoryItem{}, nil
	}

	data, err := os.ReadFile(historyPath)
	if err != nil {
		return nil, err
	}

	var items []HistoryItem
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, err
	}

	return items, nil
}

// AddToHistory добавляет запись в историю
func (a *App) AddToHistory(item HistoryItem) error {
	items, err := a.LoadHistory()
	if err != nil {
		items = []HistoryItem{}
	}

	// Генерируем ID если не указан
	if item.ID == "" {
		item.ID = time.Now().Format("20060102150405") + "_" + item.Compass
	}

	// Добавляем в начало
	items = append([]HistoryItem{item}, items...)

	// Ограничиваем размер до 10000 записей
	if len(items) > 10000 {
		items = items[:10000]
	}

	return a.SaveHistory(items)
}

// AddManyToHistory добавляет множество записей за один раз (оптимизировано)
func (a *App) AddManyToHistory(newItems []HistoryItem) error {
	items, err := a.LoadHistory()
	if err != nil {
		items = []HistoryItem{}
	}

	// Генерируем ID для всех записей
	timestamp := time.Now()
	for i := range newItems {
		if newItems[i].ID == "" {
			newItems[i].ID = timestamp.Add(time.Duration(i) * time.Millisecond).Format("20060102150405.000") + "_" + newItems[i].Compass
		}
	}

	// Добавляем все записи в начало
	items = append(newItems, items...)

	// Ограничиваем размер до 10000 записей
	if len(items) > 10000 {
		items = items[:10000]
	}

	return a.SaveHistory(items)
}

// ClearHistory очищает историю
func (a *App) ClearHistory() error {
	return a.SaveHistory([]HistoryItem{})
}

// GetHistoryStats возвращает статистику истории
func (a *App) GetHistoryStats() (map[string]interface{}, error) {
	items, err := a.LoadHistory()
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"total":   len(items),
		"success": 0,
		"failed":  0,
	}

	for _, item := range items {
		if item.IsValid {
			stats["success"] = stats["success"].(int) + 1
		} else {
			stats["failed"] = stats["failed"].(int) + 1
		}
	}

	return stats, nil
}

// LoadHistoryItem загружает одну запись истории по ID
func (a *App) LoadHistoryItem(itemID string) (HistoryItem, error) {
	items, err := a.LoadHistory()
	if err != nil {
		return HistoryItem{}, err
	}

	for _, item := range items {
		if item.ID == itemID {
			return item, nil
		}
	}

	return HistoryItem{}, fmt.Errorf("запись с ID %s не найдена", itemID)
}

// LoadHistoryMetadata загружает историю БЕЗ fullData (только метаданные)
func (a *App) LoadHistoryMetadata() ([]HistoryItem, error) {
	items, err := a.LoadHistory()
	if err != nil {
		return nil, err
	}

	// Очищаем fullData для экономии памяти
	metadata := make([]HistoryItem, len(items))
	for i, item := range items {
		metadata[i] = HistoryItem{
			ID:          item.ID,
			Timestamp:   item.Timestamp,
			Compass:     item.Compass,
			IsValid:     item.IsValid,
			TurnsCount:  item.TurnsCount,
			AnglesCount: item.AnglesCount,
			FullData:    "", // Не загружаем!
		}
	}

	return metadata, nil
}
