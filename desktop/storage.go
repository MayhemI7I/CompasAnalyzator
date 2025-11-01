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
	ID                 string `json:"id"`
	Timestamp          int64  `json:"timestamp"`
	Compass            string `json:"compass"`
	DeviceType         string `json:"deviceType"`         // Тип устройства (Коралл, МТ-12 и т.д.)
	IsValid            bool   `json:"isValid"`
	ResolvedByOperator bool   `json:"resolvedByOperator"` // Изменено оператором вручную
	TurnsCount         int    `json:"turnsCount"`
	AnglesCount        int    `json:"anglesCount"`
	FullData           string `json:"fullData"`
}

// GetHistoryPath возвращает путь к файлу истории
func GetHistoryPath() (string, error) {
	// Получаем путь к исполняемому файлу
	exePath, err := os.Executable()
	if err != nil {
		return "", err
	}

	// Получаем директорию, где находится EXE
	exeDir := filepath.Dir(exePath)

	// Создаем папку для истории РЯДОМ с программой
	historyDir := filepath.Join(exeDir, "history")
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

// AddToHistory добавляет запись в историю и возвращает ID
func (a *App) AddToHistory(item HistoryItem) (string, error) {
	Log("INFO", "AddToHistory вызвана для компаса: %s", item.Compass)
	
	items, err := a.LoadHistory()
	if err != nil {
		Log("WARN", "Ошибка загрузки истории: %v, создаем новую", err)
		items = []HistoryItem{}
	}

	// Генерируем ID если не указан
	if item.ID == "" {
		// Используем UnixNano для уникальности
		timestamp := time.Now()
		item.ID = fmt.Sprintf("%s_%d_%s", 
			timestamp.Format("20060102150405"), 
			timestamp.Nanosecond()/1000, // микросекунды
			item.Compass)
		Log("INFO", "Сгенерирован ID: %s", item.ID)
	}

	// Добавляем в начало
	items = append([]HistoryItem{item}, items...)
	Log("INFO", "Добавлена запись, всего в истории: %d", len(items))

	// Ограничиваем размер до 10000 записей
	if len(items) > 10000 {
		items = items[:10000]
		Log("WARN", "История обрезана до 10000 записей")
	}

	if err := a.SaveHistory(items); err != nil {
		Log("ERROR", "Ошибка сохранения истории: %v", err)
		return "", err
	}
	
	Log("SUCCESS", "Запись успешно сохранена, ID: %s", item.ID)
	return item.ID, nil
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
	Log("INFO", "LoadHistoryItem вызвана для ID: %s", itemID)
	
	items, err := a.LoadHistory()
	if err != nil {
		Log("ERROR", "Ошибка загрузки истории: %v", err)
		return HistoryItem{}, err
	}
	
	Log("INFO", "Всего записей в истории: %d", len(items))

	for _, item := range items {
		if item.ID == itemID {
			Log("SUCCESS", "Запись найдена: %s (компас: %s)", itemID, item.Compass)
			return item, nil
		}
	}
	
	// Логируем все ID для отладки
	Log("ERROR", "Запись с ID %s НЕ НАЙДЕНА. Доступные ID:", itemID)
	for i, item := range items {
		if i < 5 { // Первые 5 для примера
			Log("DEBUG", "  ID[%d]: %s (компас: %s)", i, item.ID, item.Compass)
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
		ID:                 item.ID,
		Timestamp:          item.Timestamp,
		Compass:            item.Compass,
		DeviceType:         item.DeviceType,         // Включаем тип устройства
		IsValid:            item.IsValid,
		ResolvedByOperator: item.ResolvedByOperator, // Изменено оператором вручную
		TurnsCount:         item.TurnsCount,
		AnglesCount:        item.AnglesCount,
		FullData:           "", // Не загружаем!
		}
	}

	return metadata, nil
}

// LoadHistoryItems загружает множество записей по ID (оптимизировано)
func (a *App) LoadHistoryItems(itemIDs []string) ([]HistoryItem, error) {
	// Загружаем всю историю ОДИН раз
	allItems, err := a.LoadHistory()
	if err != nil {
		return nil, err
	}

	// Создаем map для быстрого поиска
	itemMap := make(map[string]HistoryItem)
	for _, item := range allItems {
		itemMap[item.ID] = item
	}

	// Собираем нужные записи
	result := make([]HistoryItem, 0, len(itemIDs))
	for _, id := range itemIDs {
		if item, exists := itemMap[id]; exists {
			result = append(result, item)
		}
	}

	return result, nil
}

// UpdateHistoryItem обновляет существующую запись в истории
func UpdateHistoryItem(updatedItem HistoryItem) error {
	app := &App{}
	items, err := app.LoadHistory()
	if err != nil {
		return err
	}

	// Находим и обновляем запись
	found := false
	for i, item := range items {
		if item.ID == updatedItem.ID {
			items[i] = updatedItem
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("запись с ID %s не найдена", updatedItem.ID)
	}

	return app.SaveHistory(items)
}
