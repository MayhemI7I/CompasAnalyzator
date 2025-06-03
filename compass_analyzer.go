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
}

// Turn представляет обнаруженный поворот
type Turn struct {
	StartAngle float64
	EndAngle   float64
	StartIndex int
	EndIndex   int
	Diff       float64
}

// findStableSegments находит стабильные сегменты в последовательности углов
func findStableSegments(angles []float64, stabilityThreshold float64) []AngleSegment {
	segments := make([]AngleSegment, 0)
	if len(angles) == 0 {
		return segments
	}

	currentSegment := AngleSegment{StartIndex: 0}

	for i := 1; i < len(angles); i++ {
		diff := math.Abs(angles[i] - angles[i-1])

		if diff <= stabilityThreshold {
			// Продолжаем текущий сегмент
			currentSegment.EndIndex = i
		} else {
			// Завершаем текущий сегмент
			if currentSegment.EndIndex-currentSegment.StartIndex >= 3 {
				// Вычисляем среднее значение для сегмента
				sum := 0.0
				for j := currentSegment.StartIndex; j <= currentSegment.EndIndex; j++ {
					sum += angles[j]
				}
				currentSegment.AvgAngle = sum / float64(currentSegment.EndIndex-currentSegment.StartIndex+1)
				currentSegment.IsStable = true
				segments = append(segments, currentSegment)
			}
			// Начинаем новый сегмент
			currentSegment = AngleSegment{StartIndex: i}
		}
	}

	// Добавляем последний сегмент, если он достаточно длинный
	if currentSegment.EndIndex-currentSegment.StartIndex >= 3 {
		sum := 0.0
		for j := currentSegment.StartIndex; j <= currentSegment.EndIndex; j++ {
			sum += angles[j]
		}
		currentSegment.AvgAngle = sum / float64(currentSegment.EndIndex-currentSegment.StartIndex+1)
		currentSegment.IsStable = true
		segments = append(segments, currentSegment)
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
