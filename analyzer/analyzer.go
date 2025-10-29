package analyzer

import (
	"fmt"
	"math"
	"os"
	"sort"
	"strings"

	"compass_analyzer/models"
)

// AngleSegment представляет стабильный сегмент углов
type AngleSegment struct {
	StartIndex int       // Начальный индекс сегмента
	EndIndex   int       // Конечный индекс сегмента
	AvgAngle   float64   // Репрезентативный угол сегмента
	AllAngles  []float64 // Все углы в сегменте для вычисления медианы
	IsStable   bool      // Флаг стабильности
	Outliers   int       // Количество пропущенных выбросов внутри сегмента
}

// normalizeAngle приводит угол к диапазону [0, 360)
func normalizeAngle(angle float64) float64 {
	angle = math.Mod(angle, 360)
	if angle < 0 {
		angle += 360
	}
	return angle
}

// normalizeAngleDifference нормализует разницу углов с учетом перехода через 0/360
// Возвращает минимальную разницу в диапазоне [0, 180]
func normalizeAngleDifference(angle1, angle2 float64) float64 {
	diff := math.Abs(angle2 - angle1)
	if diff > 180 {
		diff = 360 - diff
	}
	return diff
}

// signedAngleDifference возвращает знаковую разницу углов с учетом перехода через 0/360
// Положительное значение означает поворот по часовой стрелке
func signedAngleDifference(fromAngle, toAngle float64) float64 {
	diff := toAngle - fromAngle
	if diff > 180 {
		diff -= 360
	} else if diff < -180 {
		diff += 360
	}
	return diff
}

// circularMean вычисляет циркулярное (круговое) среднее для углов
// Правильно обрабатывает углы около 0°/360°
func circularMean(angles []float64) float64 {
	if len(angles) == 0 {
		return 0
	}
	
	var sumSin, sumCos float64
	for _, angle := range angles {
		rad := angle * math.Pi / 180
		sumSin += math.Sin(rad)
		sumCos += math.Cos(rad)
	}
	
	meanRad := math.Atan2(sumSin, sumCos)
	meanAngle := meanRad * 180 / math.Pi
	return normalizeAngle(meanAngle)
}

// medianAngle вычисляет медиану углов
func medianAngle(angles []float64) float64 {
	if len(angles) == 0 {
		return 0
	}
	
	sorted := make([]float64, len(angles))
	copy(sorted, angles)
	sort.Float64s(sorted)
	
	mid := len(sorted) / 2
	if len(sorted)%2 == 0 {
		return (sorted[mid-1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

// findStableSegments ищет стабильные сегменты с наращиванием и слиянием
// Новая логика: расширяем текущий сегмент, пока углы стабильны с гистерезисом
func findStableSegments(angles []float64, stabilityThreshold float64, minStableLen int, maxOutliers int, logFile *os.File) []AngleSegment {
	var segments []AngleSegment
	if len(angles) < minStableLen {
		return segments
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Начало поиска стабильных сегментов (новая логика) ===\n")
		fmt.Fprintf(logFile, "Параметры: stabilityThreshold=%.2f°, minStableLen=%d, maxOutliers=%d\n", 
			stabilityThreshold, minStableLen, maxOutliers)
		fmt.Fprintf(logFile, "Всего углов для анализа: %d\n", len(angles))
	}

	i := 0
	for i < len(angles) {
		// Начинаем новый сегмент с текущего индекса
		segmentAngles := []float64{angles[i]}
		startIdx := i
		outlierCount := 0
		
		if logFile != nil {
			fmt.Fprintf(logFile, "\n--- Новый сегмент с индекса %d (угол: %.2f°) ---\n", i, angles[i])
		}
		
	// Расширяем сегмент, пока углы остаются стабильными
	j := i + 1
	firstOutlierIdx := -1 // Запоминаем индекс первого выброса
	lastStableIdx := i     // Последний индекс стабильного угла
	
	for j < len(angles) {
		// Вычисляем репрезентативный угол текущего сегмента
		currentAvg := circularMean(segmentAngles)
		diff := normalizeAngleDifference(angles[j], currentAvg)
		
		if logFile != nil {
			fmt.Fprintf(logFile, "  Индекс %d: угол %.2f°, разница с avg %.2f° = %.2f°\n", 
				j, angles[j], currentAvg, diff)
		}
		
		if diff <= stabilityThreshold {
			// Угол стабилен - добавляем в сегмент
			segmentAngles = append(segmentAngles, angles[j])
			lastStableIdx = j  // Обновляем индекс последнего стабильного угла
			outlierCount = 0 // Сбрасываем счётчик выбросов
			firstOutlierIdx = -1 // Сбрасываем индекс первого выброса
			if logFile != nil {
				fmt.Fprintf(logFile, "    ✓ Угол стабилен, добавлен в сегмент\n")
			}
			j++
		} else if outlierCount < maxOutliers {
			// Выброс, но в пределах допустимого - пропускаем, но продолжаем сегмент
			if firstOutlierIdx == -1 {
				firstOutlierIdx = j // Запоминаем первый выброс
			}
			outlierCount++
			if logFile != nil {
				fmt.Fprintf(logFile, "    ! Выброс %d/%d, пропускаем и продолжаем\n", outlierCount, maxOutliers)
			}
			j++
		} else {
			// Слишком много выбросов или большая разница - конец сегмента
			if logFile != nil {
				fmt.Fprintf(logFile, "    ✗ Превышен лимит выбросов или большая разница, конец сегмента\n")
			}
			break
		}
	}
	
	// Конец сегмента - используем индекс последнего стабильного угла
	endIdx := lastStableIdx
		
		// Проверяем, достаточно ли длинный сегмент
		segmentLength := len(segmentAngles)
		if segmentLength >= minStableLen {
			avgAngle := circularMean(segmentAngles)
			
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✓ Сегмент [%d:%d] принят: длина=%d, avg=%.2f°, outliers=%d\n", 
					startIdx, endIdx, segmentLength, avgAngle, outlierCount)
			}
			
			segments = append(segments, AngleSegment{
				StartIndex: startIdx,
				EndIndex:   endIdx,
				AvgAngle:   avgAngle,
				AllAngles:  segmentAngles,
				IsStable:   true,
				Outliers:   outlierCount,
			})
			
			// Переходим к следующему индексу
			// Если были выбросы, начинаем следующий сегмент с первого выброса
			if firstOutlierIdx != -1 && firstOutlierIdx <= endIdx+1 {
				i = firstOutlierIdx
			} else {
				i = j
			}
		} else {
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✗ Сегмент [%d:%d] отклонён: длина=%d < min=%d\n", 
					startIdx, endIdx, segmentLength, minStableLen)
			}
			i++ // Пропускаем один индекс и пробуем с следующего
		}
	}

	// Слияние близких сегментов
	segments = mergeCloseSegments(segments, stabilityThreshold, logFile)

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Результаты поиска стабильных сегментов ===\n")
		fmt.Fprintf(logFile, "Найдено сегментов: %d\n", len(segments))
		for i, seg := range segments {
			fmt.Fprintf(logFile, "Сегмент %d: индексы %d-%d (длина: %d), репрез. угол: %.2f°\n",
				i+1, seg.StartIndex, seg.EndIndex, len(seg.AllAngles), seg.AvgAngle)
		}
	}

	return segments
}

// mergeCloseSegments сливает соседние сегменты с близкими углами
func mergeCloseSegments(segments []AngleSegment, threshold float64, logFile *os.File) []AngleSegment {
	if len(segments) <= 1 {
		return segments
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Слияние близких сегментов ===\n")
	}

	merged := []AngleSegment{segments[0]}
	
	for i := 1; i < len(segments); i++ {
		lastMerged := &merged[len(merged)-1]
		current := segments[i]
		
		diff := normalizeAngleDifference(lastMerged.AvgAngle, current.AvgAngle)
		
		if logFile != nil {
			fmt.Fprintf(logFile, "Сравнение сег %d (%.2f°) и сег %d (%.2f°): разница=%.2f°\n",
				len(merged), lastMerged.AvgAngle, i+1, current.AvgAngle, diff)
		}
		
		// Если сегменты близки по углу, сливаем их
		if diff <= threshold {
			// Объединяем углы
			allAngles := append(lastMerged.AllAngles, current.AllAngles...)
			lastMerged.AllAngles = allAngles
			lastMerged.EndIndex = current.EndIndex
			lastMerged.AvgAngle = circularMean(allAngles)
			lastMerged.Outliers += current.Outliers
			
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✓ Слиты в один: новый avg=%.2f°, индексы %d-%d\n",
					lastMerged.AvgAngle, lastMerged.StartIndex, lastMerged.EndIndex)
			}
		} else {
			merged = append(merged, current)
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✗ Оставлены раздельными\n")
			}
		}
	}

	return merged
}

// find90DegreeTurns находит повороты на ~90 градусов между стабильными сегментами
// Новая логика: проверяем ВСЕ пары стабильных сегментов, не только соседние
func find90DegreeTurns(segments []AngleSegment, turnTolerance float64, logFile *os.File) []models.Turn {
	// Сначала собираем только стабильные сегменты
	stableSegments := make([]struct {
		segment AngleSegment
		index   int
	}, 0)
	
	for i, seg := range segments {
		if seg.IsStable {
			stableSegments = append(stableSegments, struct {
				segment AngleSegment
				index   int
			}{seg, i})
		}
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Поиск поворотов на ~90° ===\n")
		fmt.Fprintf(logFile, "Допуск поворота: ±%.2f°\n", turnTolerance)
		fmt.Fprintf(logFile, "Всего стабильных сегментов: %d (из %d общих)\n", len(stableSegments), len(segments))
	}

	turns := make([]models.Turn, 0)

	// Проверяем все пары стабильных сегментов
	for i := 1; i < len(stableSegments); i++ {
		prev := stableSegments[i-1]
		curr := stableSegments[i]
		
		prevAngle := prev.segment.AvgAngle
		currAngle := curr.segment.AvgAngle
		
		// Вычисляем знаковую разницу углов (учитывает направление)
		// Положительное значение = поворот по часовой стрелке
		// Отрицательное значение = поворот против часовой стрелки
		signedDiff := signedAngleDifference(prevAngle, currAngle)
		
		// Берем абсолютное значение для проверки близости к 90°
		absDiff := math.Abs(signedDiff)
		
		// Определяем направление поворота
		isClockwise := signedDiff > 0

		if logFile != nil {
			direction := "по часовой"
			if !isClockwise {
				direction = "против часовой"
			}
			fmt.Fprintf(logFile, "\nСтаб. сегмент %d (индекс %d) -> стаб. сегмент %d (индекс %d): %.2f° -> %.2f°\n",
				i, prev.index+1, i+1, curr.index+1, prevAngle, currAngle)
			fmt.Fprintf(logFile, "  Знаковая разница: %.2f° (абс: %.2f°), направление: %s\n", 
				signedDiff, absDiff, direction)
		}

		// Проверяем, является ли разница близкой к 90 градусам
		// И что поворот идет в правильном направлении (положительный - по часовой)
		if math.Abs(absDiff-90) <= turnTolerance && isClockwise {
			turn := models.Turn{
				StartAngle:  prevAngle,
				EndAngle:    currAngle,
				StartIndex:  prev.segment.EndIndex,
				EndIndex:    curr.segment.StartIndex,
				Diff:        absDiff,
				SignedDiff:  signedDiff,
				IsClockwise: isClockwise,
				FromSegment: prev.index,
				ToSegment:   curr.index,
			}
			turns = append(turns, turn)
			
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✓ Поворот найден! Diff=%.2f° (цель: 90±%.2f°), направление: по часовой ✓\n", absDiff, turnTolerance)
			}
		} else if logFile != nil {
			if math.Abs(absDiff-90) <= turnTolerance && !isClockwise {
				fmt.Fprintf(logFile, "  ✗ Отклонен: разница подходит (%.2f°), но направление ПРОТИВ часовой ✗\n", absDiff)
			} else {
				fmt.Fprintf(logFile, "  ✗ Не поворот на 90°: |%.2f° - 90°| = %.2f° > %.2f°\n", 
					absDiff, math.Abs(absDiff-90), turnTolerance)
			}
		}
	}

	return turns
}

// findBestTurnSequence находит лучшую последовательность из 4 непрерывных поворотов
// Ищет все возможные последовательности и выбирает ту, где сумма ближе к 360°
func findBestTurnSequence(allTurns []models.Turn, logFile *os.File) []models.Turn {
	if len(allTurns) < 4 {
		return allTurns // Если меньше 4 поворотов, возвращаем как есть
	}
	
	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Поиск лучшей последовательности из 4 поворотов ===\n")
		fmt.Fprintf(logFile, "Всего найдено поворотов: %d\n", len(allTurns))
	}
	
	bestSequence := allTurns[:4]
	bestDeviation := 1000.0 // Большое значение для начала
	
	// Проходим по всем возможным последовательностям из 4 подряд идущих поворотов
	for i := 0; i <= len(allTurns)-4; i++ {
		sequence := allTurns[i : i+4]
		
		// Проверяем непрерывность: конец каждого = начало следующего
		isContinuous := true
		for j := 1; j < 4; j++ {
			if sequence[j].FromSegment != sequence[j-1].ToSegment {
				isContinuous = false
				break
			}
		}
		
		if !isContinuous {
			continue // Пропускаем непоследовательные цепочки
		}
		
		// Вычисляем сумму углов
		var totalDiff float64
		for _, turn := range sequence {
			totalDiff += turn.Diff
		}
		
		// Вычисляем отклонение от 360°
		deviation := math.Abs(totalDiff - 360)
		if deviation > 180 {
			deviation = 360 - deviation
		}
		
		if logFile != nil {
			fmt.Fprintf(logFile, "Последовательность [%d:%d]: сумма=%.2f°, отклонение=%.2f°\n",
				i+1, i+4, totalDiff, deviation)
		}
		
		// Если эта последовательность лучше, сохраняем её
		if deviation < bestDeviation {
			bestDeviation = deviation
			bestSequence = sequence
			if logFile != nil {
				fmt.Fprintf(logFile, "  ✓ Новая лучшая последовательность!\n")
			}
		}
	}
	
	if logFile != nil {
		fmt.Fprintf(logFile, "✓ Выбрана последовательность с отклонением %.2f° от 360°\n", bestDeviation)
	}
	
	return bestSequence
}

// validateTurnSequence проверяет последовательность поворотов на корректность
// Требования:
// 1. Ровно 4 поворота на ~90°
// 2. ВСЕ повороты в ОДНОМ направлении (по часовой стрелке)
// 3. Сумма всех поворотов ≈ 360° (±15°)
// 4. Повороты идут последовательно (без наложений)
// 5. Повороты образуют непрерывную цепочку
func validateTurnSequence(turns []models.Turn, logFile *os.File) (bool, []string) {
	var errors []string

	if logFile != nil {
		fmt.Fprintf(logFile, "\n=== Валидация последовательности поворотов ===\n")
	}

	// Проверка 1: Минимум 4 поворота (берём первые 4, если больше)
	if len(turns) < 4 {
		msg := fmt.Sprintf("Найдено %d поворотов, требуется минимум 4", len(turns))
		errors = append(errors, msg)
		if logFile != nil {
			fmt.Fprintf(logFile, "✗ %s\n", msg)
		}
		return false, errors
	}
	
	// Если найдено больше 4 поворотов, берём только первые 4
	// (компас мог продолжить вращение после завершения калибровки)
	if len(turns) > 4 {
		if logFile != nil {
			fmt.Fprintf(logFile, "ℹ Найдено %d поворотов, анализируем первые 4 (полный круг)\n", len(turns))
		}
		turns = turns[:4] // Обрезаем до первых 4
	}
	
	if logFile != nil {
		fmt.Fprintf(logFile, "✓ Найдено минимум 4 поворота (используем первые 4)\n")
	}

	// Проверка 2: ВСЕ повороты должны быть в одном направлении (по часовой)
	allClockwise := true
	for i, turn := range turns {
		if !turn.IsClockwise {
			allClockwise = false
			msg := fmt.Sprintf("Поворот %d идет ПРОТИВ часовой стрелки (%.2f° → %.2f°, знаковая разница: %.2f°)", 
				i+1, turn.StartAngle, turn.EndAngle, turn.SignedDiff)
			errors = append(errors, msg)
			if logFile != nil {
				fmt.Fprintf(logFile, "✗ %s\n", msg)
			}
		}
	}
	
	if !allClockwise {
		return false, errors
	}
	
	if logFile != nil {
		fmt.Fprintf(logFile, "✓ Все повороты идут в одном направлении (по часовой стрелке)\n")
	}

	// Проверка 3: Последовательность (без пересечений по индексам)
	for i := 1; i < len(turns); i++ {
		// Проверка на пересечение индексов данных
		if turns[i].StartIndex <= turns[i-1].EndIndex {
			msg := fmt.Sprintf("Поворот %d начинается до конца поворота %d (пересечение индексов)", i+1, i)
			errors = append(errors, msg)
			if logFile != nil {
				fmt.Fprintf(logFile, "✗ %s\n", msg)
			}
			return false, errors
		}
	}
	if logFile != nil {
		fmt.Fprintf(logFile, "✓ Повороты идут последовательно без пересечений по индексам\n")
	}
	
	// Проверка 3.5: Непрерывность по индексам сегментов
	// Эта проверка уже выполнена в findBestTurnSequence, просто логируем результат
	if logFile != nil {
		fmt.Fprintf(logFile, "Проверка непрерывности по сегментам:\n")
		for i := 1; i < len(turns); i++ {
			prevToSegment := turns[i-1].ToSegment
			currFromSegment := turns[i].FromSegment
			
			if currFromSegment == prevToSegment {
				fmt.Fprintf(logFile, "  Поворот %d → %d: сегмент %d → %d (непрерывно)\n",
					i, i+1, prevToSegment, currFromSegment)
			}
		}
		fmt.Fprintf(logFile, "✓ Последовательность поворотов непрерывна (выбрана оптимальная цепочка)\n")
	}
	
	// Проверка 4: Непрерывность цепочки (конечный угол поворота N ≈ начальный угол поворота N+1)
	const continuityTolerance = 20.0 // Допуск на непрерывность в градусах
	continuousChain := true
	
	for i := 0; i < len(turns)-1; i++ {
		currentEnd := turns[i].EndAngle
		nextStart := turns[i+1].StartAngle
		gap := normalizeAngleDifference(currentEnd, nextStart)
		
		if logFile != nil {
			fmt.Fprintf(logFile, "Проверка непрерывности: поворот %d конец (%.2f°) → поворот %d начало (%.2f°), разрыв: %.2f°\n",
				i+1, currentEnd, i+2, nextStart, gap)
		}
		
		if gap > continuityTolerance {
			continuousChain = false
			msg := fmt.Sprintf("Разрыв между поворотом %d (конец %.2f°) и поворотом %d (начало %.2f°): %.2f° > %.2f°",
				i+1, currentEnd, i+2, nextStart, gap, continuityTolerance)
			if logFile != nil {
				fmt.Fprintf(logFile, "  ⚠ Предупреждение: %s\n", msg)
			}
			// Не считаем это критической ошибкой, только предупреждение
		}
	}
	
	if continuousChain && logFile != nil {
		fmt.Fprintf(logFile, "✓ Повороты образуют непрерывную цепочку (разрывы ≤ %.2f°)\n", continuityTolerance)
	}

	// Проверка 5: Сумма углов ≈ 360°
	var totalDiff float64
	for _, turn := range turns {
		totalDiff += turn.Diff
	}
	
	// Нормализуем общую сумму к диапазону [0, 360)
	totalDiffNorm := math.Mod(totalDiff, 360)
	deviation := math.Abs(totalDiffNorm - 360)
	if deviation > 180 {
		deviation = 360 - deviation
	}
	
	if logFile != nil {
		fmt.Fprintf(logFile, "Сумма поворотов: %.2f° (нормализовано: %.2f°)\n", totalDiff, totalDiffNorm)
		fmt.Fprintf(logFile, "Отклонение от 360°: %.2f°\n", deviation)
	}
	
	const sumTolerance = 15.0 // Допуск ±15° на сумму
	if deviation > sumTolerance {
		msg := fmt.Sprintf("Сумма поворотов (%.2f°) слишком отличается от 360° (отклонение: %.2f° > %.2f°)", 
			totalDiff, deviation, sumTolerance)
		errors = append(errors, msg)
		if logFile != nil {
			fmt.Fprintf(logFile, "✗ %s\n", msg)
		}
		return false, errors
	}
	if logFile != nil {
		fmt.Fprintf(logFile, "✓ Сумма поворотов близка к 360° (отклонение: %.2f° ≤ %.2f°)\n", deviation, sumTolerance)
	}

	// Проверка 6: Детальная информация о каждом повороте
	if logFile != nil {
		fmt.Fprintf(logFile, "\nДетали поворотов:\n")
		for i, turn := range turns {
			dev := math.Abs(turn.Diff - 90)
			direction := "по часовой ✓"
			if !turn.IsClockwise {
				direction = "против часовой ✗"
			}
			fmt.Fprintf(logFile, "Поворот %d: %.2f° → %.2f° (Δ=%.2f°, знак=%.2f°, отклонение от 90°: %.2f°, %s)\n", 
				i+1, turn.StartAngle, turn.EndAngle, turn.Diff, turn.SignedDiff, dev, direction)
		}
	}

	if logFile != nil {
		fmt.Fprintf(logFile, "\n✓ Все проверки пройдены успешно!\n")
	}

	return true, nil
}

// AnalyzeCompassData анализирует данные компаса и находит повороты на 90 градусов
// Новая логика с детальной валидацией и отчётностью
func AnalyzeCompassData(angles []float64, logFile *os.File) (bool, []models.Turn) {
	// Параметры анализа
	stabilityThreshold := 5.0 // Порог стабильности в градусах
	turnTolerance := 15.0     // Допуск для определения поворота на 90±15 градусов (было 10, увеличено для учета реальных данных)
	minStableLen := 2         // Минимальная длина стабильного сегмента (уменьшено с 3 до 2 для учета коротких переходных зон)
	maxOutliers := 0          // Отключаем гистерезис - каждый нестабильный угол прерывает сегмент

	if logFile != nil {
		fmt.Fprintf(logFile, "\n╔════════════════════════════════════════════════════════════╗\n")
		fmt.Fprintf(logFile, "║         АНАЛИЗ ДАННЫХ КОМПАСА (новый алгоритм)          ║\n")
		fmt.Fprintf(logFile, "╚════════════════════════════════════════════════════════════╝\n")
		fmt.Fprintf(logFile, "\nВсего записей углов: %d\n", len(angles))
		fmt.Fprintf(logFile, "\nПараметры анализа:\n")
		fmt.Fprintf(logFile, "  • Порог стабильности: %.2f°\n", stabilityThreshold)
		fmt.Fprintf(logFile, "  • Допуск поворота (90±X): ±%.2f°\n", turnTolerance)
		fmt.Fprintf(logFile, "  • Минимальная длина сегмента: %d записей\n", minStableLen)
		fmt.Fprintf(logFile, "  • Максимум выбросов (гистерезис): %d\n", maxOutliers)
	}

	// Этап 1: Поиск стабильных сегментов
	segments := findStableSegments(angles, stabilityThreshold, minStableLen, maxOutliers, logFile)

	// Этап 2: Поиск поворотов на ~90° между сегментами
	allTurns := find90DegreeTurns(segments, turnTolerance, logFile)
	
	// Этап 2.5: Поиск лучшей последовательности из 4 непрерывных поворотов
	turns := findBestTurnSequence(allTurns, logFile)

	// Этап 3: Валидация последовательности поворотов
	isValid, validationErrors := validateTurnSequence(turns, logFile)

	// Итоговый отчёт
	if logFile != nil {
		fmt.Fprintf(logFile, "\n╔════════════════════════════════════════════════════════════╗\n")
		fmt.Fprintf(logFile, "║                    ИТОГОВЫЙ РЕЗУЛЬТАТ                     ║\n")
		fmt.Fprintf(logFile, "╚════════════════════════════════════════════════════════════╝\n")
		fmt.Fprintf(logFile, "\nНайдено стабильных сегментов: %d\n", len(segments))
		fmt.Fprintf(logFile, "Найдено поворотов на ~90°: %d", len(allTurns))
		if len(allTurns) > 4 {
			fmt.Fprintf(logFile, " (используем первые 4)")
		}
		fmt.Fprintf(logFile, "\n")
		
		if isValid {
			fmt.Fprintf(logFile, "\n✓✓✓ КАЛИБРОВКА УСПЕШНА ✓✓✓\n")
			fmt.Fprintf(logFile, "\nПоследовательность поворотов (первые 4):\n")
			for i, turn := range turns {
				direction := "по часовой ✓"
				if !turn.IsClockwise {
					direction = "против часовой ✗"
				}
				fmt.Fprintf(logFile, "  %d. %.2f° → %.2f° (Δ = %.2f°, направление: %s)\n", 
					i+1, turn.StartAngle, turn.EndAngle, turn.Diff, direction)
			}
			
			// Если было больше 4 поворотов, показываем дополнительные
			if len(allTurns) > 4 {
				fmt.Fprintf(logFile, "\nДополнительные повороты (вне основного круга):\n")
				for i := 4; i < len(allTurns); i++ {
					turn := allTurns[i]
					direction := "по часовой ✓"
					if !turn.IsClockwise {
						direction = "против часовой ✗"
					}
					fmt.Fprintf(logFile, "  %d. %.2f° → %.2f° (Δ = %.2f°, направление: %s)\n", 
						i+1, turn.StartAngle, turn.EndAngle, turn.Diff, direction)
				}
			}
		} else {
			fmt.Fprintf(logFile, "\n✗✗✗ КАЛИБРОВКА НЕ ПРОШЛА ✗✗✗\n")
			fmt.Fprintf(logFile, "\nПричины отбраковки:\n")
			for i, err := range validationErrors {
				fmt.Fprintf(logFile, "  %d. %s\n", i+1, err)
			}
			
			if len(turns) > 0 {
				fmt.Fprintf(logFile, "\nЧастичные результаты (найденные повороты):\n")
				for i, turn := range turns {
					direction := "по часовой ✓"
					if !turn.IsClockwise {
						direction = "ПРОТИВ часовой ✗"
					}
					fmt.Fprintf(logFile, "  %d. %.2f° → %.2f° (Δ = %.2f°, знак=%.2f°, %s)\n", 
						i+1, turn.StartAngle, turn.EndAngle, turn.Diff, turn.SignedDiff, direction)
				}
			}
		}
		
		fmt.Fprintf(logFile, "\n" + strings.Repeat("=", 60) + "\n")
	}

	return isValid, turns
}

// GetSegments возвращает найденные стабильные сегменты для визуализации
func GetSegments(angles []float64) []AngleSegment {
	stabilityThreshold := 5.0
	minStableLen := 2  // Те же параметры, что в AnalyzeCompassData
	maxOutliers := 0   // Те же параметры, что в AnalyzeCompassData
	return findStableSegments(angles, stabilityThreshold, minStableLen, maxOutliers, nil)
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

