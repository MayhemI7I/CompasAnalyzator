package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"compass_analyzer/analyzer"
	"compass_analyzer/models"
	"compass_analyzer/parser"
)

// showResults выводит подробные результаты анализа компасов.
// Функция отображает информацию об успешных и неуспешных анализах,
// включая найденные углы поворотов и ошибки.
//
// Параметры:
//   - results: результаты сессии анализа
//
// Пример:
//   showResults(sessionResults)
func showResults(results models.SessionResults) {
	fmt.Println("\nРезультаты анализа:")
	fmt.Println("------------------")

	// Показываем успешные компасы
	fmt.Println("\nУспешные компасы:")
	if len(results.SuccessfulCompasses) == 0 {
		fmt.Println("Нет успешно проанализированных компасов")
	} else {
		for number, result := range results.SuccessfulCompasses {
			fmt.Printf("\nКомпас %s:\n", number)
			fmt.Printf("Найденные повороты (изменения угла): %.2f, %.2f, %.2f, %.2f\n", 
				result.Angles[0], result.Angles[1], result.Angles[2], result.Angles[3])
			fmt.Printf("Начальный угол: %.2f, Конечный угол: %.2f\n", 
				result.InitialAngle, result.FinalAngle)
		}
	}

	// Показываем неуспешные компасы
	fmt.Println("\nНеуспешные компасы:")
	if len(results.FailedCompasses) == 0 {
		fmt.Println("Нет неуспешных компасов")
	} else {
		for number, result := range results.FailedCompasses {
			fmt.Printf("\nКомпас %s:\n", number)
			fmt.Println("Ошибки:")
			for _, err := range result.Errors {
				fmt.Printf("- %s\n", err)
			}
			if len(result.Angles) > 0 {
				fmt.Printf("Найденные повороты (изменения угла): %.2f\n", result.Angles)
			}
			fmt.Printf("Начальный угол: %.2f, Конечный угол: %.2f\n", 
				result.InitialAngle, result.FinalAngle)
		}
	}
}

// getInput получает ввод от пользователя с заданным приглашением.
//
// Параметры:
//   - prompt: текст приглашения для ввода
//
// Возвращает:
//   - string: введенная пользователем строка
//
// Пример:
//   name := getInput("Введите имя: ")
func getInput(prompt string) string {
	fmt.Print(prompt)
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan()
	return scanner.Text()
}

// moveFolder перемещает папку из исходной директории в целевую.
// Функция создает целевую директорию, если она не существует.
//
// Параметры:
//   - source: путь к исходной папке
//   - destination: путь к целевой директории
//
// Возвращает:
//   - error: ошибка перемещения, если операция не удалась
//
// Пример:
//   err := moveFolder("source/dir", "dest/dir")
//   if err != nil {
//       log.Fatal(err)
//   }
func moveFolder(source, destination string) error {
	if err := os.MkdirAll(destination, 0755); err != nil {
		return fmt.Errorf("ошибка создания директории назначения: %v", err)
	}

	folderName := filepath.Base(source)
	newPath := filepath.Join(destination, folderName)

	if err := os.Rename(source, newPath); err != nil {
		return fmt.Errorf("ошибка перемещения папки: %v", err)
	}

	return nil
}

// runSession выполняет одну сессию анализа данных компаса.
// Функция анализирует все папки с данными компасов в указанной директории
// и перемещает их в соответствующие директории в зависимости от результатов.
//
// Параметры:
//   - dataDir: путь к директории с данными компасов
//   - successDir: путь к директории для успешных результатов
//   - failureDir: путь к директории для неуспешных результатов
//
// Возвращает:
//   - models.SessionResults: результаты анализа всех компасов
//
// Пример:
//   results := runSession("data", "success", "failure")
//   showResults(results)
func runSession(dataDir, successDir, failureDir string) models.SessionResults {
	fmt.Println("\nАнализатор данных компаса")
	fmt.Println("------------------------")

	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		log.Fatalf("Директория с данными не существует: %s", dataDir)
	}

	folders, err := os.ReadDir(dataDir)
	if err != nil {
		log.Fatalf("Ошибка чтения директории: %v", err)
	}

	results := models.SessionResults{
		SuccessfulCompasses: make(map[string]models.CompassResult),
		FailedCompasses:     make(map[string]models.CompassResult),
	}

	// Анализируем каждый компас
	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		// Проверяем, что имя папки - это число
		compassNumber, err := strconv.Atoi(folder.Name())
		if err != nil || compassNumber > 20000 {
			continue
		}

		csvPath := filepath.Join(dataDir, folder.Name(), "SB_CMPS.csv")

		if _, err := os.Stat(csvPath); os.IsNotExist(err) {
			fmt.Printf("Компас %s: файл не найден\n", folder.Name())
			continue
		}

		// Читаем и анализируем данные
		data, err := parser.ReadCSVFile(csvPath)
		if err != nil {
			fmt.Printf("Компас %s: ошибка чтения данных - %v\n", folder.Name(), err)
			continue
		}

		result := analyzer.AnalyzeCompassData(data)
		result.CompassNumber = folder.Name()

		// Сохраняем результаты
		if result.IsValid {
			results.SuccessfulCompasses[folder.Name()] = result
		} else {
			results.FailedCompasses[folder.Name()] = result
		}

		// Выводим краткие результаты
		fmt.Printf("\nАнализ компаса %s:\n", folder.Name())
		if result.IsValid {
			fmt.Println("Статус: УСПЕШНО")
		} else {
			fmt.Println("Статус: ОШИБКА")
			for _, err := range result.Errors {
				fmt.Println("-", err)
			}
		}
	}

	// Перемещаем папки
	fmt.Println("\nПеремещение папок...")
	for number := range results.SuccessfulCompasses {
		sourcePath := filepath.Join(dataDir, number)
		if err := moveFolder(sourcePath, successDir); err != nil {
			fmt.Printf("Ошибка перемещения компаса %s: %v\n", number, err)
		}
	}

	for number := range results.FailedCompasses {
		sourcePath := filepath.Join(dataDir, number)
		if err := moveFolder(sourcePath, failureDir); err != nil {
			fmt.Printf("Ошибка перемещения компаса %s: %v\n", number, err)
		}
	}

	// Выводим итоговую статистику
	fmt.Printf("\nИтоги анализа:\n")
	fmt.Printf("Успешно проанализировано: %d компасов\n", len(results.SuccessfulCompasses))
	fmt.Printf("Ошибок анализа: %d компасов\n", len(results.FailedCompasses))

	return results
}

// main является точкой входа в программу.
// Функция запускает интерактивный цикл анализа данных компаса,
// позволяя пользователю выполнить несколько сессий анализа.
func main() {
	for {
		// Запрашиваем пути к директориям
		dataDir := getInput("Введите путь к директории с данными компасов: ")
		successDir := getInput("Введите путь для успешных результатов: ")
		failureDir := getInput("Введите путь для неуспешных результатов: ")

		// Запускаем сессию
		results := runSession(dataDir, successDir, failureDir)

		// Предлагаем показать результаты
		fmt.Print("\nПоказать подробные результаты? (y/n): ")
		if getInput("") == "y" {
			showResults(results)
		}

		// Спрашиваем о новой сессии
		fmt.Print("\nНачать новую сессию? (y/n): ")
		if getInput("") != "y" {
			break
		}
	}

	fmt.Println("\nПрограмма завершена. Нажмите Enter для выхода...")
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}