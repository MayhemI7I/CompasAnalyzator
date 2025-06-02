package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"compass_analyzer/analyzer"
	"compass_analyzer/models"
	"compass_analyzer/parser"
)

// Config хранит пути к директориям
// и сохраняется в JSON-файл
// в os.UserConfigDir()/compass_analyzer/config.json
type Config struct {
	DataDir    string `json:"data_dir"`
	SuccessDir string `json:"success_dir"`
	FailureDir string `json:"failure_dir"`
	RenameDir  string `json:"rename_dir"` // Новая директория для переименования файлов
}

// showResults выводит подробные результаты анализа компасов.
// Функция отображает информацию об успешных и неуспешных анализах,
// включая найденные углы поворотов и ошибки.
//
// Параметры:
//   - results: результаты сессии анализа
//
// Пример:
//
//	showResults(sessionResults)
func showResults(results models.SessionResults) {
	// Выводим итоговую статистику в начале
	fmt.Printf("\nИтоги анализа:\n")
	fmt.Printf("Успешно проанализировано: %d компасов\n", len(results.SuccessfulCompasses))
	fmt.Printf("Ошибок анализа: %d компасов\n", len(results.FailedCompasses))

	// Показываем успешные компасы (кратко)
	fmt.Println("\nУспешные компасы:")
	if len(results.SuccessfulCompasses) == 0 {
		fmt.Println("Нет успешно проанализированных компасов")
	} else {
		// Сначала показываем краткую информацию (только номера)
		for number := range results.SuccessfulCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	// Показываем неуспешные компасы (кратко)
	fmt.Println("\nНеуспешные компасы:")
	if len(results.FailedCompasses) == 0 {
		fmt.Println("Нет неуспешных компасов")
	} else {
		// Сначала показываем краткую информацию (только номера)
		for number := range results.FailedCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	// Спрашиваем, нужно ли показать подробную информацию
	fmt.Print("\nПоказать подробную информацию по компасам? (y/n): ")
	if getInput("") == "y" {
		showDetailedResults(results)
	}
}

// showDetailedResults показывает подробную информацию по компасам
func showDetailedResults(results models.SessionResults) {
	fmt.Println("\nПодробная информация по компасам:")
	for number, result := range results.SuccessfulCompasses {
		fmt.Printf("\nКомпас %s:\n", number)
		fmt.Println("Найденные повороты:")
		for i := 0; i < len(result.Angles); i++ {
			startAngle := 0.0
			endAngle := 0.0

			// Determine start and end angles based on the turn sequence
			if i == 0 {
				if len(result.TurnEndAngles) > 3 && len(result.TurnStartAngles) > 0 {
					startAngle = result.TurnEndAngles[3]
					endAngle = result.TurnStartAngles[0]
				}
			} else if i > 0 && i < len(result.Angles) {
				if len(result.TurnEndAngles) > i-1 && len(result.TurnStartAngles) > i {
					startAngle = result.TurnEndAngles[i-1]
					endAngle = result.TurnStartAngles[i]
				}
			}

			fmt.Printf("Поворот %d: Изменение: %.2f°, Начальный угол: %.2f°, Конечный угол: %.2f°\n",
				i+1, result.Angles[i], startAngle, endAngle)
		}
		fmt.Println("\nВсе записи углов:")
		for i, angle := range result.AllAngles {
			fmt.Printf("%d: %.2f°\n", i+1, angle)
		}
	}

	for number, result := range results.FailedCompasses {
		fmt.Printf("\nКомпас %s:\n", number)
		fmt.Println("Ошибки:")
		for _, err := range result.Errors {
			fmt.Printf("- %s\n", err)
		}
		if len(result.Angles) > 0 {
			fmt.Printf("Найденные повороты (изменения угла): %.2f°\n", result.Angles)
		}
		fmt.Println("\nВсе записи углов:")
		for i, angle := range result.AllAngles {
			fmt.Printf("%d: %.2f°\n", i+1, angle)
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
//
//	name := getInput("Введите имя: ")
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
//
//	err := moveFolder("source/dir", "dest/dir")
//	if err != nil {
//	    log.Fatal(err)
//	}
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
//
//	results := runSession("data", "success", "failure")
//	showResults(results)
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

	// Определяем директорию для логов анализа
	analysisLogDir := filepath.Join(filepath.Dir(dataDir), "analysis_logs")
	// Создаем директорию для логов, если она не существует
	if err := os.MkdirAll(analysisLogDir, 0755); err != nil {
		log.Printf("Ошибка создания директории логов анализа %s: %v", analysisLogDir, err)
		// Продолжаем выполнение, но логи анализа не будут записаны
		analysisLogDir = "" // Сбрасываем путь, чтобы не пытаться писать логи
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
			result := models.CompassResult{
				CompassNumber: folder.Name(),
				Errors:        []string{fmt.Sprintf("Файл данных SB_CMPS.csv не найден: %s", csvPath)},
			}
			results.FailedCompasses[folder.Name()] = result
			continue
		} else if err != nil {
			// Handle other potential errors from os.Stat, like permission issues or file in use
			fmt.Printf("Компас %s: ошибка доступа к файлу - %v\n", folder.Name(), err)
			result := models.CompassResult{
				CompassNumber: folder.Name(),
				Errors:        []string{fmt.Sprintf("Ошибка доступа к файлу SB_CMPS.csv (%s): %v", csvPath, err)},
			}
			results.FailedCompasses[folder.Name()] = result
			continue
		}

		// Определяем путь к файлу лога для текущего компаса
		logFilePath := ""
		if analysisLogDir != "" {
			logFileName := fmt.Sprintf("compass_%s_analysis.log", folder.Name())
			logFilePath = filepath.Join(analysisLogDir, logFileName)
		}

		// Читаем и анализируем данные
		data, err := parser.ReadCSVFile(csvPath)
		if err != nil {
			fmt.Printf("Компас %s: ошибка чтения данных - %v\n", folder.Name(), err)
			result := models.CompassResult{
				CompassNumber: folder.Name(),
				Errors:        []string{fmt.Sprintf("Ошибка чтения файла данных (%s): %v", csvPath, err)},
			}
			results.FailedCompasses[folder.Name()] = result
			continue
		}

		result := analyzer.AnalyzeCompassData(data, logFilePath)
		result.CompassNumber = folder.Name()

		// Сохраняем результаты (analysis errors are already in result.Errors from AnalyzeCompassData)
		if result.IsValid {
			results.SuccessfulCompasses[folder.Name()] = result
		} else {
			results.FailedCompasses[folder.Name()] = result
		}
	}

	// Перемещаем папки
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

	return results
}

// loadConfig загружает конфиг из файла
func loadConfig() (*Config, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	configPath := filepath.Join(configDir, "compass_analyzer", "config.json")
	file, err := os.Open(configPath)
	if err != nil {
		return &Config{}, nil // если файла нет — возвращаем пустой конфиг
	}
	defer file.Close()
	var cfg Config
	if err := json.NewDecoder(file).Decode(&cfg); err != nil {
		return &Config{}, nil
	}
	return &cfg, nil
}

// saveConfig сохраняет конфиг в файл
func saveConfig(cfg *Config) error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	appDir := filepath.Join(configDir, "compass_analyzer")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return err
	}
	configPath := filepath.Join(appDir, "config.json")
	file, err := os.Create(configPath)
	if err != nil {
		return err
	}
	defer file.Close()
	return json.NewEncoder(file).Encode(cfg)
}

// askOrDefault спрашивает пользователя, хочет ли он изменить путь
func askOrDefault(prompt, current string) string {
	if current != "" {
		fmt.Printf("%s [%s]: ", prompt, current)
	} else {
		fmt.Printf("%s: ", prompt)
	}
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan()
	input := scanner.Text()
	if input == "" {
		return current
	}
	return input
}

// renameFiles переименовывает файлы в указанной директории, удаляя "tim" из названия
func renameFiles(dir string) error {
	// Проверяем существование директории
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return fmt.Errorf("директория не существует: %s", dir)
	}

	// Читаем содержимое директории
	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("ошибка чтения директории: %v", err)
	}

	renamedCount := 0
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		oldName := file.Name()
		// Проверяем, содержит ли файл "tim" в названии
		if !strings.Contains(oldName, "tim") {
			continue
		}

		// Создаем новое имя файла
		newName := strings.Replace(oldName, "tim.", "", 1)
		oldPath := filepath.Join(dir, oldName)
		newPath := filepath.Join(dir, newName)

		// Переименовываем файл
		if err := os.Rename(oldPath, newPath); err != nil {
			fmt.Printf("Ошибка переименования файла %s: %v\n", oldName, err)
			continue
		}
		renamedCount++
		fmt.Printf("Переименован файл: %s -> %s\n", oldName, newName)
	}

	fmt.Printf("\nВсего переименовано файлов: %d\n", renamedCount)
	return nil
}

// main — теперь с выбором операции
func main() {
	// Load configuration
	config, err := loadConfig()

	usePrevious := true
	if err != nil {
		fmt.Println("Конфигурационный файл не найден или поврежден. Будут запрошены новые директории.")
		usePrevious = false
	} else {
		// Ask user if they want to use previous directories
		fmt.Printf("Найдена предыдущая конфигурация с директориями:\n")
		fmt.Printf("  Директория входных данных: %s\n", config.DataDir)
		fmt.Printf("  Директория выходных данных: %s\n", config.SuccessDir)
		fmt.Printf("  Директория для переименования: %s\n", config.RenameDir)
		fmt.Print("Хотите использовать их? (да/нет): ")
		var response string
		fmt.Scanln(&response)

		if strings.ToLower(strings.TrimSpace(response)) != "да" {
			fmt.Println("Выбрана ручная настройка директорий.")
			usePrevious = false
		}
	}

	// Get directories from user or use config
	if !usePrevious {
		config.DataDir = askOrDefault("Введите директорию с файлами компасов", config.DataDir)
		config.SuccessDir = askOrDefault("Введите директорию для сохранения результатов", config.SuccessDir)
		config.FailureDir = askOrDefault("Введите директорию для неуспешных результатов", config.FailureDir)
		config.RenameDir = askOrDefault("Введите директорию для переименования файлов", config.RenameDir)
	}

	// Save the potentially updated config
	if err := saveConfig(config); err != nil {
		log.Fatalf("Ошибка сохранения конфигурации: %v", err)
	}

	// Основной цикл программы
	for {
		fmt.Println("\nВыберите операцию:")
		fmt.Println("1. Проверка компасов")
		fmt.Println("2. Корректировка названий файлов")
		fmt.Println("3. Выход")
		fmt.Print("Ваш выбор (1-3): ")

		choice := getInput("")
		switch choice {
		case "1":
			results := runSession(config.DataDir, config.SuccessDir, config.FailureDir)
			showResults(results)
		case "2":
			fmt.Printf("\nНачинаем переименование файлов в директории: %s\n", config.RenameDir)
			if err := renameFiles(config.RenameDir); err != nil {
				fmt.Printf("Ошибка при переименовании файлов: %v\n", err)
			}
		case "3":
			fmt.Println("\nПрограмма завершена. Нажмите Enter для выхода...")
			bufio.NewReader(os.Stdin).ReadBytes('\n')
			return
		default:
			fmt.Println("Неверный выбор. Пожалуйста, выберите 1, 2 или 3.")
		}
	}
}
