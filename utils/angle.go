package utils

import "math"

// CalculateAngleDifference вычисляет разницу между двумя углами с учетом перехода через 360 градусов.
// Функция корректно обрабатывает случаи, когда разница углов пересекает границу 360 градусов.
//
// Параметры:
//   - angle1: первый угол в градусах
//   - angle2: второй угол в градусах
//
// Возвращает:
//   - float64: разницу между углами в диапазоне [-180, 180] градусов
//
// Пример:
//   diff := CalculateAngleDifference(350, 10) // вернет 20
//   diff := CalculateAngleDifference(10, 350) // вернет -20
func CalculateAngleDifference(angle1, angle2 float64) float64 {
    diff := angle2 - angle1
    if diff < -180 {
        diff += 360
    } else if diff > 180 {
        diff -= 360
    }
    return diff
}

// IsAngleStable проверяет стабильность угла между двумя точками.
// Функция анализирует последовательность углов и проверяет, что все промежуточные
// изменения не превышают заданный порог.
//
// Параметры:
//   - angles: массив углов для проверки
//   - maxChange: максимально допустимое изменение угла между соседними точками
//
// Возвращает:
//   - bool: true если все изменения угла не превышают maxChange, иначе false
//
// Пример:
//   stable := IsAngleStable([]float64{0, 5, 10, 15}, 10) // вернет true
//   stable := IsAngleStable([]float64{0, 5, 20, 15}, 10) // вернет false
func IsAngleStable(angles []float64, maxChange float64) bool {
    for i := 1; i < len(angles); i++ {
        if math.Abs(CalculateAngleDifference(angles[i], angles[i-1])) > maxChange {
            return false
        }
    }
    return true
}

// IsValidTurnAngle проверяет, является ли изменение угла допустимым поворотом.
// Функция проверяет, находится ли угол в заданном диапазоне.
//
// Параметры:
//   - angle: проверяемый угол в градусах
//   - minAngle: минимальное допустимое значение угла
//   - maxAngle: максимальное допустимое значение угла
//
// Возвращает:
//   - bool: true если угол находится в диапазоне [minAngle, maxAngle], иначе false
//
// Пример:
//   valid := IsValidTurnAngle(90, 80, 100) // вернет true
//   valid := IsValidTurnAngle(70, 80, 100) // вернет false
func IsValidTurnAngle(angle float64, minAngle, maxAngle float64) bool {
    return angle >= minAngle && angle <= maxAngle
} 