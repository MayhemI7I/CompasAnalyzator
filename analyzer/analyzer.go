package analyzer

import (
	"fmt"
	"math"

	"compass_analyzer/models"
)

// AngleSegment представляет стабильный сегмент углов
type AngleSegment struct {
	StartIndex int
	EndIndex   int
	AvgAngle   float64
	IsStable   bool
}

// normalizeAngleDifference нормализует разницу углов с учетом перехода через 0/360
func normalizeAngleDifference(angle1, angle2 float64) float64 {
	diff := math.Abs(angle2 - angle1)
	if diff > 180 {
		diff = 360 - diff
	}
	return diff
}

// findStableSegmentsWithOutliers ищет стабильные сегменты, игнорируя одиночные выбросы
func findStableSegmentsWithOutliers(angles []float64, stabilityThreshold float64, minLen int) []struct {
	Start, End int
	Avg        float64
} {
	segments := make([]struct {
		Start, End int
		Avg        float64
	}, 0)
	if len(angles) == 0 {
		return segments
	}

	n := len(angles)
	i := 0
	for i < n {
		// ищем начало стабильного сегмента
		start := i
		stableCount := 1
		lastAngle := angles[i]

		// Проверяем следующие углы на стабильность
		for i+1 < n {
			nextAngle := angles[i+1]
			diff := normalizeAngleDifference(lastAngle, nextAngle)

			if diff <= stabilityThreshold {
				stableCount++
				lastAngle = nextAngle
				i++
			} else {
				// Проверяем, не является ли это переходом через 0/360
				if (lastAngle > 350 && nextAngle < 10) || (lastAngle < 10 && nextAngle > 350) {
					stableCount++
					lastAngle = nextAngle
					i++
					continue
				}
				break
			}
		}

		if stableCount >= minLen {
			// Вычисляем среднее значение для сегмента
			sum := 0.0
			for j := start; j <= i; j++ {
				sum += angles[j]
			}
			avg := sum / float64(stableCount)

			segments = append(segments, struct {
				Start, End int
				Avg        float64
			}{start, i, avg})
		}
		i++
	}
	return segments
}

// find90DegreeTurns находит повороты на 90 градусов между стабильными сегментами
func find90DegreeTurns(segments []AngleSegment) []models.Turn {
	turns := make([]models.Turn, 0)

	for i := 1; i < len(segments); i++ {
		if !segments[i-1].IsStable || !segments[i].IsStable {
			continue
		}

		// Вычисляем разницу углов с учетом перехода через 0/360
		diff := math.Abs(segments[i].AvgAngle - segments[i-1].AvgAngle)
		if diff > 180 {
			diff = 360 - diff
		}

		// Проверяем, является ли разница близкой к 90 градусам
		if math.Abs(diff-90) <= 5 { // Допуск 5 градусов
			turns = append(turns, models.Turn{
				StartAngle: segments[i-1].AvgAngle,
				EndAngle:   segments[i].AvgAngle,
				StartIndex: segments[i-1].StartIndex,
				EndIndex:   segments[i].EndIndex,
				Diff:       diff,
			})
		}
	}

	return turns
}

// AnalyzeCompassData анализирует данные компаса и находит повороты на 90 градусов
func AnalyzeCompassData(angles []float64) []models.Turn {
	stabilityThreshold := 5.0 // Увеличенный порог стабильности
	minStableLen := 2         // Минимальная длина стабильного сегмента
	turnThreshold := 10.0     // Допуск для поворота (90±10)

	segments := findStableSegmentsWithOutliers(angles, stabilityThreshold, minStableLen)
	turns := make([]models.Turn, 0)

	for i := 1; i < len(segments); i++ {
		diff := normalizeAngleDifference(segments[i].Avg, segments[i-1].Avg)

		// Проверяем, является ли разница близкой к 90 градусам
		if math.Abs(diff-90) <= turnThreshold {
			turns = append(turns, models.Turn{
				StartAngle: segments[i-1].Avg,
				EndAngle:   segments[i].Avg,
				StartIndex: segments[i-1].Start,
				EndIndex:   segments[i].End,
				Diff:       diff,
			})
		}
	}
	return turns
}

// PrintAnalysis выводит результаты анализа
func PrintAnalysis(angles []float64, turns []models.Turn) {
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
