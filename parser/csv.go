package parser

import (
	"encoding/csv"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"compass_analyzer/models"
)

// ParseUnixTime парсит Unix timestamp из строки в объект time.Time.
// Функция обрабатывает строку, содержащую Unix timestamp в секундах.
//
// Параметры:
//   - timeStr: строка, содержащая Unix timestamp
//
// Возвращает:
//   - time.Time: время, соответствующее Unix timestamp
//   - error: ошибка парсинга, если строка некорректна
//
// Пример:
//
//	t, err := ParseUnixTime("1646092800") // вернет 2022-03-01 00:00:00 +0000 UTC
func ParseUnixTime(timeStr string) (time.Time, error) {
	timeStr = strings.TrimSpace(timeStr)
	timestamp, err := strconv.ParseInt(timeStr, 10, 64)
	if err != nil {
		return time.Time{}, fmt.Errorf("ошибка парсинга Unix timestamp '%s': %v", timeStr, err)
	}
	return time.Unix(timestamp, 0), nil
}

// ReadCSVFile читает данные из CSV файла и преобразует их в массив CompassData.
// Функция ожидает файл с разделителем ';' и следующими столбцами:
// - A: Unix timestamp
// - B: Строка времени (опционально)
// - J: Значение угла азимута
//
// Параметры:
//   - filePath: путь к CSV файлу
//
// Возвращает:
//   - []models.CompassData: массив данных компаса
//   - error: ошибка чтения или парсинга файла
//
// Пример:
//
//	data, err := ReadCSVFile("path/to/file.csv")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Printf("Прочитано %d записей\n", len(data))
func ReadCSVFile(filePath string) ([]models.CompassData, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("ошибка открытия файла: %v", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ';'          // Разделитель в CSV файле
	reader.FieldsPerRecord = -1 // Разрешаем разное количество полей в строках

	// Пропускаем заголовок
	if _, err := reader.Read(); err != nil {
		return nil, fmt.Errorf("ошибка чтения заголовка: %v", err)
	}

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения данных: %v", err)
	}

	// Сортируем записи по Unix timestamp в первом столбце
	sort.SliceStable(records, func(i, j int) bool {
		timestampI, errI := strconv.ParseInt(records[i][0], 10, 64)
		if errI != nil {
			// Если парсинг не удался, считаем, что текущий элемент больше для стабильной сортировки
			return false
		}
		timestampJ, errJ := strconv.ParseInt(records[j][0], 10, 64)
		if errJ != nil {
			// Если парсинг не удался для j, считаем, что i меньше
			return true
		}
		return timestampI < timestampJ
	})

	// Перезаписываем файл отсортированными данными
	outFile, err := os.Create(filePath) // Открываем файл для записи (обрезая существующее содержимое)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания файла для записи отсортированных данных: %v", err)
	}
	defer outFile.Close()

	writer := csv.NewWriter(outFile)
	writer.Comma = ';' // Используем тот же разделитель

	// Опционально: можно записать заголовок снова, если это необходимо.
	// Пропускаем запись заголовка, так как мы не храним его отдельно.

	if err := writer.WriteAll(records); err != nil {
		return nil, fmt.Errorf("ошибка записи отсортированных данных в файл: %v", err)
	}

	writer.Flush()

	if len(records) == 0 {
		return nil, fmt.Errorf("файл не содержит данных")
	}

	var data []models.CompassData
	for _, record := range records {
		if len(record) < 10 {
			continue
		}

		// Парсим время из столбца A
		t, err := ParseUnixTime(record[0])
		if err != nil {
			continue
		}

		// Парсим угол из столбца J
		angleStr := strings.TrimSpace(record[9])
		angle, err := strconv.ParseFloat(angleStr, 64)
		if err != nil {
			continue
		}

		// Получаем строку времени из столбца B
		timeStringB := ""
		if len(record) > 1 {
			timeStringB = strings.TrimSpace(record[1])
		}

		data = append(data, models.CompassData{
			Time:       t,
			Angle:      angle,
			TimeString: timeStringB,
		})
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("не удалось прочитать ни одной записи из файла")
	}

	return data, nil
}
