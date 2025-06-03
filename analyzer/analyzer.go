package analyzer

import (
	"fmt"
	"math"
	"os"

	"compass_analyzer/models"
)

// AngleSegment представляет стабильный сегмент углов
type AngleSegment struct {
	StartIndex int
	EndIndex   int
	AvgAngle   float64
	IsStable   bool
	Outliers   []int
}

// normalizeAngleDifference нормализует разницу углов с учетом перехода через 0/360
func normalizeAngleDifference(angle1, angle2 float64) float64 {
	diff := math.Abs(angle2 - angle1)
	if diff > 180 {
		diff = 360 - diff
	}
	// Округляем до ближайшего целого числа
	return math.Round(diff)
}

// findStableSegmentsWithOutliers ищет стабильные сегменты, игнорируя одиночные выбросы
func findStableSegmentsWithOutliers(angles []float64, stabilityThreshold float64, minStableLen int, logFile *os.File) []AngleSegment {
	var segments []AngleSegment
	if len(angles) < minStableLen {
		return segments
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Начало поиска стабильных сегментов ===\n")
		fmt.Fprintf(logFile, "Параметры: stabilityThreshold=%.2f°, minStableLen=%d\n", stabilityThreshold, minStableLen)
		fmt.Fprintf(logFile, "Всего углов для анализа: %d\n", len(angles))
	}

	for i := 0; i < len(angles)-minStableLen+1; i++ {
		if logFile != nil {
			fmt.Fprintf(logFile, "\nПроверка окна с индекса %d (угол: %.2f°)\n", i, angles[i])
		}

		// Счетчик стабильных значений в текущем окне
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
				if logFile != nil {
					fmt.Fprintf(logFile, "  Сравнение с предыдущим углом: %.2f° -> %.2f° (разница: %.2f°)\n",
						angles[j-1], angles[j], diff)
				}

				if diff <= stabilityThreshold {
					stableCount++
					stableAngles = append(stableAngles, angles[j])
				} else {
					if logFile != nil {
						fmt.Fprintf(logFile, "  Обнаружен выброс: %.2f° (разница: %.2f° > порог %.2f°)\n",
							angles[j], diff, stabilityThreshold)
					}
					outliers = append(outliers, j)
				}
			} else {
				stableAngles = append(stableAngles, angles[j])
			}
		}

		if logFile != nil {
			fmt.Fprintf(logFile, "  Стабильных углов в окне: %d/%d\n", stableCount, minStableLen-1)
		}

		// Если нашли достаточно стабильных углов
		if stableCount >= minStableLen-1 {
			// Вычисляем средний угол для стабильного сегмента
			var sum float64
			for _, angle := range stableAngles {
				sum += angle
			}
			avgAngle := sum / float64(len(stableAngles))

			if logFile != nil {
				fmt.Fprintf(logFile, "  Найден стабильный сегмент: индексы %d-%d, средний угол: %.2f°\n",
					i, i+minStableLen-1, avgAngle)
				if len(outliers) > 0 {
					fmt.Fprintf(logFile, "  Выбросы в сегменте: %v\n", outliers)
				}
			}

			segments = append(segments, AngleSegment{
				StartIndex: i,
				EndIndex:   i + minStableLen - 1,
				AvgAngle:   avgAngle,
				IsStable:   true,
				Outliers:   outliers,
			})
		} else if logFile != nil {
			fmt.Fprintf(logFile, "  Сегмент не стабилен, пропускаем\n")
		}
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Результаты поиска стабильных сегментов ===\n")
		fmt.Fprintf(logFile, "Найдено сегментов: %d\n", len(segments))
		for i, seg := range segments {
			fmt.Fprintf(logFile, "Сегмент %d: индексы %d-%d, средний угол: %.2f°, выбросы: %v\n",
				i+1, seg.StartIndex, seg.EndIndex, seg.AvgAngle, seg.Outliers)
		}
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
func AnalyzeCompassData(angles []float64, logFile *os.File) (bool, []models.Turn) {
	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Начало анализа данных компаса ===\n")
		fmt.Fprintf(logFile, "Всего записей: %d\n", len(angles))

		// Параметры анализа
		stabilityThreshold := 5.0 // Порог стабильности в градусах
		turnThreshold := 10.0     // Порог для определения поворота на 90 градусов
		minStableLen := 2         // Минимальная длина стабильного сегмента

		fmt.Fprintf(logFile, "Параметры анализа:\n")
		fmt.Fprintf(logFile, "- Порог стабильности: %.2f°\n", stabilityThreshold)
		fmt.Fprintf(logFile, "- Порог поворота: %.2f°\n", turnThreshold)
		fmt.Fprintf(logFile, "- Минимальная длина стабильного сегмента: %d\n", minStableLen)

		// Находим стабильные сегменты
		segments := findStableSegmentsWithOutliers(angles, stabilityThreshold, minStableLen, logFile)

		// Анализируем повороты между сегментами
		var turns []models.Turn
		fmt.Fprintf(logFile, "\n=== Анализ поворотов между сегментами ===\n")

		for i := 0; i < len(segments)-1; i++ {
			currentSeg := segments[i]
			nextSeg := segments[i+1]

			// Вычисляем разницу между средними углами
			diff := normalizeAngleDifference(nextSeg.AvgAngle, currentSeg.AvgAngle)

			fmt.Fprintf(logFile, "\nПроверка поворота между сегментами %d и %d:\n", i+1, i+2)
			fmt.Fprintf(logFile, "Сегмент %d: %.2f° (индексы %d-%d)\n",
				i+1, currentSeg.AvgAngle, currentSeg.StartIndex, currentSeg.EndIndex)
			fmt.Fprintf(logFile, "Сегмент %d: %.2f° (индексы %d-%d)\n",
				i+2, nextSeg.AvgAngle, nextSeg.StartIndex, nextSeg.EndIndex)
			fmt.Fprintf(logFile, "Разница углов: %.2f°\n", diff)

			// Проверяем, является ли разница поворотом на ~90 градусов
			if math.Abs(diff-90) <= turnThreshold {
				fmt.Fprintf(logFile, "Найден поворот на ~90 градусов!\n")
				turns = append(turns, models.Turn{
					StartAngle: currentSeg.AvgAngle,
					EndAngle:   nextSeg.AvgAngle,
					Diff:       diff,
					StartIndex: currentSeg.EndIndex,
					EndIndex:   nextSeg.StartIndex,
				})
			} else {
				fmt.Fprintf(logFile, "Поворот не соответствует критериям (должен быть 90±%.2f°)\n", turnThreshold)
			}
		}

		fmt.Fprintf(logFile, "\n=== Результаты анализа ===\n")
		fmt.Fprintf(logFile, "Найдено поворотов: %d\n", len(turns))
		for i, turn := range turns {
			fmt.Fprintf(logFile, "Поворот %d: %.2f° -> %.2f° (изменение: %.2f°)\n",
				i+1, turn.StartAngle, turn.EndAngle, turn.Diff)
		}

		// Проверяем, достаточно ли поворотов
		isValid := len(turns) >= 4
		fmt.Fprintf(logFile, "\nИтоговый результат: %v (найдено %d поворотов, требуется не менее 4)\n",
			isValid, len(turns))

		return isValid, turns
	}

	// Если файл лога не указан, выполняем анализ без логирования
	stabilityThreshold := 5.0
	turnThreshold := 10.0
	minStableLen := 2
	segments := findStableSegmentsWithOutliers(angles, stabilityThreshold, minStableLen, nil)
	var turns []models.Turn

	for i := 0; i < len(segments)-1; i++ {
		currentSeg := segments[i]
		nextSeg := segments[i+1]
		diff := normalizeAngleDifference(nextSeg.AvgAngle, currentSeg.AvgAngle)
		if math.Abs(diff-90) <= turnThreshold {
			turns = append(turns, models.Turn{
				StartAngle: currentSeg.AvgAngle,
				EndAngle:   nextSeg.AvgAngle,
				Diff:       diff,
				StartIndex: currentSeg.EndIndex,
				EndIndex:   nextSeg.StartIndex,
			})
		}
	}

	return len(turns) >= 4, turns
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
