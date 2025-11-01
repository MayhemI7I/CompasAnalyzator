package desktop

import (
	"fmt"
	"sync"
	"time"
)

// Logger глобальный логгер для отладки
type Logger struct {
	mu      sync.RWMutex
	entries []LogEntry
	maxSize int
}

// LogEntry запись лога
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
}

var globalLogger = &Logger{
	entries: make([]LogEntry, 0),
	maxSize: 1000,
}

// Log добавляет запись в лог
func Log(level, format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	timestamp := time.Now().Format("15:04:05.000")
	
	// Выводим в консоль
	fmt.Printf("[%s] [%s] %s\n", timestamp, level, message)
	
	// Сохраняем в память
	globalLogger.mu.Lock()
	defer globalLogger.mu.Unlock()
	
	entry := LogEntry{
		Timestamp: timestamp,
		Level:     level,
		Message:   message,
	}
	
	globalLogger.entries = append(globalLogger.entries, entry)
	
	// Ограничиваем размер
	if len(globalLogger.entries) > globalLogger.maxSize {
		globalLogger.entries = globalLogger.entries[len(globalLogger.entries)-globalLogger.maxSize:]
	}
}

// GetLogs возвращает все записи лога
func (a *App) GetLogs() []LogEntry {
	globalLogger.mu.RLock()
	defer globalLogger.mu.RUnlock()
	
	// Возвращаем копию
	result := make([]LogEntry, len(globalLogger.entries))
	copy(result, globalLogger.entries)
	return result
}

// ClearLogs очищает лог
func (a *App) ClearLogs() {
	globalLogger.mu.Lock()
	defer globalLogger.mu.Unlock()
	
	globalLogger.entries = make([]LogEntry, 0)
	Log("INFO", "Логи очищены")
}


