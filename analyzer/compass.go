package analyzer

import (
    "fmt"
    "time"

    "compass_analyzer/models"
    "compass_analyzer/utils"
)

// AnalyzeCompassData анализирует данные компаса и ищет повороты на 90 градусов.
// Функция проверяет следующие условия:
// 1. Наличие четырех поворотов примерно на 90 градусов
// 2. Временные интервалы между поворотами (1-3 минуты)
// 3. Общее время всех поворотов (не более 6 минут)
// 4. Возврат в исходное положение (отклонение не более 10 градусов)
//
// Параметры:
//   - data: массив данных компаса для анализа
//
// Возвращает:
//   - models.CompassResult: результаты анализа с информацией о поворотах и ошибках
//
// Пример:
//   result := AnalyzeCompassData(compassData)
//   if result.IsValid {
//       fmt.Println("Анализ успешен")
//   } else {
//       fmt.Println("Ошибки:", result.Errors)
//   }
func AnalyzeCompassData(data []models.CompassData) models.CompassResult {
    result := models.CompassResult{
        IsValid: false,
    }

    // Проверяем наличие данных
    if len(data) == 0 {
        result.Errors = append(result.Errors, "Нет данных для анализа")
        return result
    }

    if len(data) < 5 {
        result.Errors = append(result.Errors, 
            fmt.Sprintf("Недостаточно данных для анализа: %d точек", len(data)))
        return result
    }

    result.InitialAngle = data[0].Angle
    result.FinalAngle = data[len(data)-1].Angle

    // Ищем четыре поворота на ~90 градусов
    var foundTurnEndTimes []time.Time
    var foundTurnAnglesDiffs []float64
    var foundTurnStartAngles []float64
    var foundTurnEndAngles []float64

    // Проходим по всем данным
    for i := 0; i < len(data); i++ {
        for j := i + 1; j < len(data); j++ {
            // Вычисляем изменение угла
            angleDiff := utils.CalculateAngleDifference(data[i].Angle, data[j].Angle)

            // Проверяем угол поворота
            if utils.IsValidTurnAngle(angleDiff, 80, 100) {
                // Проверяем временной интервал
                if len(foundTurnEndTimes) > 0 {
                    timeSinceLastTurn := data[i].Time.Sub(foundTurnEndTimes[len(foundTurnEndTimes)-1])
                    if timeSinceLastTurn < time.Minute*1 || timeSinceLastTurn > time.Minute*3 {
                        continue
                    }
                }

                // Проверяем стабильность угла
                var angles []float64
                for k := i; k <= j; k++ {
                    angles = append(angles, data[k].Angle)
                }
                if !utils.IsAngleStable(angles, 30) {
                    continue
                }

                // Сохраняем информацию о повороте
                foundTurnEndTimes = append(foundTurnEndTimes, data[j].Time)
                foundTurnAnglesDiffs = append(foundTurnAnglesDiffs, angleDiff)
                foundTurnStartAngles = append(foundTurnStartAngles, data[i].Angle)
                foundTurnEndAngles = append(foundTurnEndAngles, data[j].Angle)

                // Переходим к поиску следующего поворота
                i = j
                break
            }
        }
    }

    // Сохраняем найденные углы
    result.Angles = foundTurnAnglesDiffs

    // Проверяем количество поворотов
    if len(foundTurnEndTimes) != 4 {
        result.Errors = append(result.Errors, 
            fmt.Sprintf("Неверное количество найденных поворотов на ~90 градусов: %d вместо 4", len(foundTurnEndTimes)))
    } else {
        // Проверяем временные интервалы
        for j := 0; j < 3; j++ {
            timeDiff := foundTurnEndTimes[j+1].Sub(foundTurnEndTimes[j])
            if timeDiff < time.Minute*1 || timeDiff > time.Minute*3 {
                result.Errors = append(result.Errors, 
                    fmt.Sprintf("Неверный интервал между поворотами %d и %d: %v", j+1, j+2, timeDiff))
            }
        }

        // Проверяем общее время
        totalTime := foundTurnEndTimes[3].Sub(foundTurnEndTimes[0])
        if totalTime > time.Minute*6 {
            result.Errors = append(result.Errors, 
                fmt.Sprintf("Общее время поворотов превышает 6 минут: %v", totalTime))
        }

        // Выводим информацию о поворотах
        for j := 0; j < 4; j++ {
            fmt.Printf("Поворот %d: Начальный угол: %.2f, Конечный угол: %.2f, Изменение: %.2f\n",
                j+1, foundTurnStartAngles[j], foundTurnEndAngles[j], foundTurnAnglesDiffs[j])
        }
    }

    // Проверяем возврат в исходное положение
    finalAngleDiff := utils.CalculateAngleDifference(result.InitialAngle, result.FinalAngle)
    if finalAngleDiff > 10 || finalAngleDiff < -10 {
        result.Errors = append(result.Errors, 
            fmt.Sprintf("Компас не вернулся в исходное положение. Разница: %.2f градусов", finalAngleDiff))
    }

    // Определяем итоговый статус
    result.IsValid = len(result.Errors) == 0 && len(foundTurnEndTimes) == 4

    return result
} 