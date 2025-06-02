package analyzer

import (
	"fmt"
	"math"
	"os"

	"compass_analyzer/models"
)

// AnalyzeCompassData анализирует данные компаса и ищет четыре последовательных поворота
// примерно на 90 градусов, за которыми следует короткий стабильный участок.
// Подробная информация о процессе анализа записывается в файл лога.
//
// Логика анализа:
//
//  1. Функция итерируется по всем записям данных компаса.
//
//  2. Для каждой записи вычисляется разница угла по сравнению с углом последней
//     найденной стабильной точки или начальным углом (для первой записи).
//
//  3. Если разница угла находится в диапазоне 80-100 градусов (с учетом
//     "допуска поворота" turnTolerance), это считается потенциальным поворотом на 90 градусов.
//     Нормализация угла (приведение к диапазону 0-180 для разницы) выполняется
//     с помощью `math.Abs` и коррекции, если разница превышает 180 градусов.
//
//     Пример проверки поворота:
//     ```go
//     angleDiff := math.Abs(data[i].Angle - lastAngle)
//     if angleDiff > 180 {
//     angleDiff = 360 - angleDiff
//     }
//     if angleDiff >= 90-turnTolerance && angleDiff <= 90+turnTolerance {
//     // Потенциальный поворот найден
//     }
//     ```
//
//  4. После обнаружения потенциального поворота, функция проверяет следующие
//     1-4 записи данных на наличие стабильного участка. Стабильным считается угол,
//     который отличается от угла в точке потенциального поворота не более чем
//     на "допуск стабильности" (stableTolerance = 5 градусов).
//
// 5. Учитывается наличие промежуточных "нестабильных" записей в пределах этих 4 точек:
//
//   - Допускается *максимум одна* запись, которая не соответствует критерию
//     стабильности (разница угла больше stableTolerance).
//
//   - Если найдено две или более таких промежуточных записей до обнаружения
//     стабильного участка (1-3 точки), поиск этого стабильного участка сбрасывается,
//     и процесс поиска поворота возобновляется с точки потенциального поворота.
//
//     6. Если в течение следующих 1-3 записей после потенциального поворота найден
//     стабильный участок (углы в пределах stableTolerance), то:
//
//   - Считается, что поворот успешно идентифицирован.
//
//   - Счетчик найденных поворотов увеличивается.
//
//   - Угол последней стабильной точки в этом сегменте становится новой точкой отсчета
//     (lastAngle) для поиска следующего поворота.
//
//   - Итерация по данным продолжается с последней записи найденного стабильного участка.
//
//     Пример проверки стабильности после поворота:
//     ```go
//     stableAngleAfterTurn := data[i].Angle // Угол в точке потенциального поворота
//     stableCount := 0
//     intermediateCount := 0
//     for j := i + 1; j < len(data) && j <= i + 4; j++ {
//     currentStableDiff := math.Abs(data[j].Angle - stableAngleAfterTurn)
//     if currentStableDiff <= stableTolerance {
//     stableCount++
//     if stableCount >= 1 && stableCount <= 3 {
//     // Стабильный участок найден
//     lastAngle = data[j].Angle // Обновляем точку отсчета
//     // Увеличиваем счетчик поворотов, сохраняем разницу угла и переходим к следующей итерации внешнего цикла с j
//     break // Выход из внутреннего цикла после нахождения стабильного участка
//     }
//     } else {
//     intermediateCount++
//     if intermediateCount > 1 {
//     // Слишком много промежуточных точек, сброс поиска стабильности
//     break
//     }
//     }
//     }
//     // Проверка stableFound после внутреннего цикла для определения, был ли найден стабильный участок
//     ```
//
//     7. Если после потенциального поворота не удается найти стабильный участок
//     в течение 4 записей (с учетом правила об одной промежуточной записи),
//     счетчик стабильности сбрасывается, и поиск поворота продолжается с точки
//     потенциального поворота (lastAngle остается углом этой точки).
//
//     8. Если текущая запись не является потенциальным поворотом (разница угла
//     не в диапазоне 80-100), угол текущей записи становится новой точкой отсчета (lastAngle)
//     для следующей итерации.
//
//     9. После итерации по всем данным проверяется общее количество найденных
//     поворотов. Если найдено ровно четыре, анализ считается успешным
//     (без учета временных условий, которые пока не реализованы в новой логике).
//
// Параметры:
//   - data: массив данных компаса для анализа (считается, что data[0] - это начальный угол)
//   - logFilePath: путь к файлу, куда будет записываться подробный лог анализа
//
// Возвращает:
//   - models.CompassResult: результаты анализа с информацией о найденных поворотах
//     (Angles) и ошибках (Errors), а также общий статус валидности (IsValid).
//
// TODO: Добавить проверку временных интервалов между найденными поворотами и общего времени анализа на основе меток времени в data.
//
// Пример:
//
//	result := AnalyzeCompassData(compassData, "path/to/log.txt")
//	if result.IsValid {
//	    fmt.Println("Анализ успешен. Найденные изменения угла:", result.Angles)
//	} else {
//	    fmt.Println("Анализ неуспешен. Ошибки:", result.Errors)
//	}
func AnalyzeCompassData(data []models.CompassData, logFilePath string) models.CompassResult {
	result := models.CompassResult{
		IsValid: false,
	}

	// Открываем файл лога для записи. Если файл не существует, он будет создан.
	// Используем os.O_APPEND для добавления в конец файла, если он уже есть.
	logFile, err := os.OpenFile(logFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Не удалось открыть файл лога %s: %v", logFilePath, err))
		return result // Возвращаем результат с ошибкой открытия лога
	}
	defer logFile.Close()

	// Вспомогательная функция для записи в лог
	logMessage := func(format string, a ...interface{}) {
		fmt.Fprintf(logFile, format, a...)
	}

	// Проверяем наличие данных
	if len(data) == 0 {
		result.Errors = append(result.Errors, "Нет данных для анализа")
		logMessage("Нет данных для анализа\n")
		return result
	}

	if len(data) < 5 {
		result.Errors = append(result.Errors,
			fmt.Sprintf("Недостаточно данных для анализа: %d точек", len(data)))
		logMessage(fmt.Sprintf("Недостаточно данных для анализа: %d точек\n", len(data)))
		return result
	}

	// Сохраняем все углы
	result.AllAngles = make([]float64, len(data))
	for i, d := range data {
		result.AllAngles[i] = d.Angle
	}

	var foundTurnAnglesDiffs []float64
	turnCount := 0
	lastAngle := data[0].Angle // Start with the first angle as the reference
	stableTolerance := 5.0     // Tolerance for stable angles after a turn
	turnTolerance := 10.0      // Tolerance for 90 degree turn (80-100)

	logMessage("\nНачало анализа данных\n")
	logMessage("---------------------\n")

	for i := 1; i < len(data); i++ {
		angleDiff := math.Abs(data[i].Angle - lastAngle)

		// Normalize angle difference to [0, 180]
		if angleDiff > 180 {
			angleDiff = 360 - angleDiff
		}

		// Check for a potential 90-degree turn
		if angleDiff >= 90-turnTolerance && angleDiff <= 90+turnTolerance {
			logMessage(fmt.Sprintf("Potential turn detected at index %d. Angle: %.2f°, Diff: %.2f°\n", i, data[i].Angle, angleDiff))

			// Check for a stable segment (1-3 angles within 5 degrees) after the turn
			stableFound := false
			stableCount := 0
			intermediateCount := 0
			stableAngleAfterTurn := data[i].Angle

			for j := i + 1; j < len(data) && j <= i+4; j++ {
				currentStableDiff := math.Abs(data[j].Angle - stableAngleAfterTurn)
				if currentStableDiff <= stableTolerance {
					stableCount++
					logMessage(fmt.Sprintf("  Stable angle found at index %d. Angle: %.2f°\n", j, data[j].Angle))
					if stableCount >= 1 && stableCount <= 3 {
						stableFound = true
						// Update lastAngle to the angle at the end of the stable segment
						lastAngle = data[j].Angle
						foundTurnAnglesDiffs = append(foundTurnAnglesDiffs, angleDiff)
						turnCount++
						// Store the start angle of the turn and the end angle of the stable segment
						result.TurnStartAngles = append(result.TurnStartAngles, data[i].Angle)
						result.TurnEndAngles = append(result.TurnEndAngles, data[j].Angle)
						i = j // Continue iterating from the end of the stable segment
						break // Exit the inner loop once a stable segment is found
					}
				} else {
					intermediateCount++
					logMessage(fmt.Sprintf("  Intermediate angle found at index %d. Angle: %.2f°\n", j, data[j].Angle))
					if intermediateCount > 1 {
						logMessage("  More than one intermediate point, resetting.\n")
						break // More than one intermediate point, break the inner loop
					}
				}
			}

			// If no stable segment found within 4 records, reset
			if !stableFound && (len(data)-1-i) >= 4-1 {
				logMessage("  No stable segment found after potential turn, resetting.\n")
				// Reset counters and continue from the current index (i.e., the potential turn point)
				// lastAngle remains the angle at the potential turn point for the next outer loop iteration
				// i does not change, the inner loop finished checking up to i+4
			}

		} else {
			// No turn detected, the current angle becomes the new reference for the next iteration
			lastAngle = data[i].Angle
		}

		// If 4 turns are found, we can potentially stop early, but the requirement is to process all data.
	}

	// After iterating through all data, check the number of turns found.
	if turnCount < 4 {
		result.Errors = append(result.Errors,
			fmt.Sprintf("Недостаточно найденных поворотов на ~90 градусов: %d (ожидалось не менее 4)", turnCount))
	} else {
		result.Angles = foundTurnAnglesDiffs
		// TODO: Добавить проверку временных интервалов между найденными поворотами и общего времени анализа на основе меток времени в data.
	}

	// Determine final status
	result.IsValid = len(result.Errors) == 0 && turnCount >= 4

	return result
}

// The findTurnEndTimes function is no longer relevant with the new analysis logic and can be removed.
