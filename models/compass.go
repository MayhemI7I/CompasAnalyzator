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

// CompassResult представляет результаты анализа одного компаса.
// Структура содержит информацию о валидности измерений и найденных поворотах.
type CompassResult struct {
    // CompassNumber - уникальный номер компаса
    CompassNumber string
    // IsValid - флаг, указывающий на успешность анализа
    IsValid bool
    // Angles - массив найденных углов поворотов в градусах
    Angles []float64
    // Times - массив времен, когда были выполнены повороты
    Times []time.Time
    // Errors - список ошибок, обнаруженных при анализе
    Errors []string
    // InitialAngle - начальный угол азимута
    InitialAngle float64
    // FinalAngle - конечный угол азимута
    FinalAngle float64
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