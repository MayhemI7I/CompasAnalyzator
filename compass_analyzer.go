package main

import (
	"fmt"
	"math"
)

// AngleSegment представляет стабильный сегмент углов
type AngleSegment struct {
	StartIndex int
	EndIndex   int
	AvgAngle   float64
	IsStable   bool
	Outliers   []int
}

// Turn представляет обнаруженный поворот
type Turn struct {
	StartAngle float64
	EndAngle   float64
	StartIndex int
	EndIndex   int
	Diff       float64
}

// normalizeAngleDifference нормализует разницу углов с учетом перехода через 0/360
func normalizeAngleDifference(angle1, angle2 float64) float64 {
	diff := math.Abs(angle2 - angle1)
	if diff > 180 {
		diff = 360 - diff
	}
	return math.Round(diff)
}

// isConsecutiveAngle проверяет, является ли угол последовательным
func isConsecutiveAngle(current, previous float64, threshold float64) bool {
	diff := normalizeAngleDifference(current, previous)
	return diff <= threshold
}

// findStableSegments находит стабильные сегменты в последовательности углов
func findStableSegments(angles []float64, stabilityThreshold float64) []AngleSegment {
	segments := make([]AngleSegment, 0)
	if len(angles) == 0 {
		return segments
	}

	// Минимальная длина стабильного сегмента
	minStableLen := 3

	for i := 0; i < len(angles)-minStableLen+1; i++ {
		stableCount := 0
		var stableAngles []float64
		var outliers []int

		// Проверяем все углы в окне
		for j := i; j < i+minStableLen; j++ {
			if j >= len(angles) {
				break
			}

			// Проверяем разницу с предыдущим углом
			if j > i {
				diff := normalizeAngleDifference(angles[j], angles[j-1])
				if diff <= stabilityThreshold {
					stableCount++
					stableAngles = append(stableAngles, angles[j])
				} else {
					outliers = append(outliers, j)
				}
			} else {
				stableAngles = append(stableAngles, angles[j])
			}
		}

		// Если нашли достаточно стабильных углов
		if stableCount >= minStableLen-1 {
			// Вычисляем средний угол для стабильного сегмента
			var sum float64
			for _, angle := range stableAngles {
				sum += angle
			}
			avgAngle := sum / float64(len(stableAngles))

			segments = append(segments, AngleSegment{
				StartIndex: i,
				EndIndex:   i + minStableLen - 1,
				AvgAngle:   avgAngle,
				IsStable:   true,
				Outliers:   outliers,
			})
		}
	}

	return segments
}

// validateTurnSequence проверяет последовательность поворотов
func validateTurnSequence(turns []Turn) bool {
	if len(turns) < 4 {
		return false
	}

	// Проверяем, что повороты идут последовательно
	for i := 1; i < len(turns); i++ {
		if turns[i].StartIndex <= turns[i-1].EndIndex {
			return false
		}
	}

	// Проверяем, что сумма всех поворотов близка к 360 градусам
	var totalDiff float64
	for _, turn := range turns {
		totalDiff += turn.Diff
	}

	// Нормализуем общую разницу
	totalDiff = math.Mod(totalDiff, 360)
	if totalDiff > 180 {
		totalDiff = 360 - totalDiff
	}

	return math.Abs(totalDiff) <= 10 // Допуск 10 градусов
}

// find90DegreeTurns находит повороты на 90 градусов между стабильными сегментами
func find90DegreeTurns(segments []AngleSegment) []Turn {
	turns := make([]Turn, 0)

	for i := 1; i < len(segments); i++ {
		if !segments[i-1].IsStable || !segments[i].IsStable {
			continue
		}

		// Вычисляем разницу углов с учетом перехода через 0/360
		diff := normalizeAngleDifference(segments[i].AvgAngle, segments[i-1].AvgAngle)

		// Проверяем, является ли разница близкой к 90 градусам
		if math.Abs(diff-90) <= 5 { // Допуск 5 градусов
			turns = append(turns, Turn{
				StartAngle: segments[i-1].AvgAngle,
				EndAngle:   segments[i].AvgAngle,
				StartIndex: segments[i-1].StartIndex,
				EndIndex:   segments[i].EndIndex,
				Diff:       diff,
			})
		}
	}

	// Проверяем последовательность поворотов
	if !validateTurnSequence(turns) {
		return []Turn{} // Возвращаем пустой слайс, если последовательность невалидна
	}

	return turns
}

// AnalyzeCompassData анализирует данные компаса и находит повороты на 90 градусов
func AnalyzeCompassData(angles []float64) []Turn {
	// Находим стабильные сегменты
	segments := findStableSegments(angles, 2.0) // Допуск стабильности 2 градуса

	// Находим повороты на 90 градусов
	turns := find90DegreeTurns(segments)

	return turns
}

// PrintAnalysis выводит результаты анализа
func PrintAnalysis(angles []float64, turns []Turn) {
	fmt.Println("Анализ данных компаса")
	fmt.Println("--------------------")
	fmt.Printf("Всего записей в файле: %d\n\n", len(angles))

	fmt.Println("Найденные повороты:")
	for i, turn := range turns {
		fmt.Printf("Поворот %d: %.2f° -> %.2f° (изменение: %.2f°)\n",
			i+1, turn.StartAngle, turn.EndAngle, turn.Diff)
		fmt.Printf("  Индексы: %d -> %d\n", turn.StartIndex, turn.EndIndex)
	}
}
