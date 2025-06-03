package models

import "time"

// CompassData представляет данные одного измерения компаса.
// Структура содержит информацию о времени измерения и значении угла.
type CompassData struct {
	// Time - время измерения в формате Unix timestamp
	Time time.Time
	// Angle - значение угла азимута в градусах
	Angle float64
	// TimeString - оригинальная строка времени из столбца B CSV файла
	TimeString string
}

// Turn представляет поворот компаса
type Turn struct {
	StartAngle float64 // Начальный угол
	EndAngle   float64 // Конечный угол
	Diff       float64 // Разница между углами
	StartIndex int     // Индекс начального угла
	EndIndex   int     // Индекс конечного угла
}

// CompassResult представляет результаты анализа одного компаса.
// Структура содержит информацию о валидности измерений и найденных поворотах.
type CompassResult struct {
	// CompassNumber - уникальный номер компаса
	CompassNumber string
	// IsValid - флаг, указывающий на успешность анализа
	IsValid bool
	// AllAngles - все углы, записанные в процессе измерения
	AllAngles []float64
	// Turns - найденные повороты
	Turns []Turn
	// Errors - список ошибок, обнаруженных при анализе
	Errors []string
}

// SessionResults хранит результаты сессии анализа.
// Структура содержит информацию об успешных и неуспешных анализах компасов.
type SessionResults struct {
	// SuccessfulCompasses - карта успешно проанализированных компасов
	// Ключ - номер компаса, значение - результаты анализа
	SuccessfulCompasses map[string]CompassResult
	// FailedCompasses - карта компасов с ошибками анализа
	// Ключ - номер компаса, значение - результаты анализа с ошибками
	FailedCompasses map[string]CompassResult
}
