package analyzer

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
}

// Turn представляет обнаруженный поворот
type Turn struct {
	StartAngle float64
	EndAngle   float64
	StartIndex int
	EndIndex   int
	Diff       float64
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
		for i+1 < n && math.Abs(angles[i+1]-angles[i]) <= stabilityThreshold {
			i++
		}
		end := i
		if end-start+1 >= minLen {
			sum := 0.0
			for j := start; j <= end; j++ {
				sum += angles[j]
			}
			avg := sum / float64(end-start+1)
			segments = append(segments, struct {
				Start, End int
				Avg        float64
			}{start, end, avg})
			i++
		} else {
			// если короткий сегмент — возможно выброс, пропускаем одну точку
			i = start + 1
		}
	}
	return segments
}

// find90DegreeTurns находит повороты на 90 градусов между стабильными сегментами
func find90DegreeTurns(segments []AngleSegment) []Turn {
	turns := make([]Turn, 0)

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
			turns = append(turns, Turn{
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
func AnalyzeCompassData(angles []float64) []Turn {
	stabilityThreshold := 2.0
	minStableLen := 2
	turnThreshold := 10.0 // 90±10

	segments := findStableSegmentsWithOutliers(angles, stabilityThreshold, minStableLen)
	turns := make([]Turn, 0)

	for i := 1; i < len(segments); i++ {
		diff := math.Abs(segments[i].Avg - segments[i-1].Avg)
		if diff > 180 {
			diff = 360 - diff
		}
		if math.Abs(diff-90) <= turnThreshold {
			turns = append(turns, Turn{
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
