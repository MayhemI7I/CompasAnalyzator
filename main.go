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

	"github.com/fatih/color"
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
	// Создаем цветные принтеры
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	// Выводим итоговую статистику в начале
	fmt.Printf("\n%s\n", cyan("Итоги анализа:"))
	fmt.Printf("%s: %d компасов\n", green("Успешно проанализировано"), len(results.SuccessfulCompasses))
	fmt.Printf("%s: %d компасов\n", red("Ошибок анализа"), len(results.FailedCompasses))

	// Показываем успешные компасы (кратко)
	fmt.Printf("\n%s:\n", green("Успешные компасы"))
	if len(results.SuccessfulCompasses) == 0 {
		fmt.Printf("%s\n", yellow("Нет успешно проанализированных компасов"))
	} else {
		for number := range results.SuccessfulCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	// Показываем неуспешные компасы (кратко)
	fmt.Printf("\n%s:\n", red("Неуспешные компасы"))
	if len(results.FailedCompasses) == 0 {
		fmt.Printf("%s\n", yellow("Нет неуспешных компасов"))
	} else {
		for number := range results.FailedCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	// Спрашиваем, нужно ли показать подробную информацию
	fmt.Printf("\n%s", cyan("Показать подробную информацию по компасам? (y/n): "))
	if getInput("") == "y" {
		showDetailedResults(results)
	}
}

// showDetailedResults показывает подробную информацию по компасам
func showDetailedResults(results models.SessionResults) {
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	fmt.Printf("\n%s\n", cyan("Подробная информация по компасам:"))
	for number, result := range results.SuccessfulCompasses {
		fmt.Printf("\n%s %s:\n", green("Компас"), number)
		fmt.Printf("%s\n", yellow("Найденные повороты:"))
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

			fmt.Printf("%s %d: %s %.2f°, %s %.2f°, %s %.2f°\n",
				yellow("Поворот"), i+1,
				cyan("Изменение:"), result.Angles[i],
				cyan("Начальный угол:"), startAngle,
				cyan("Конечный угол:"), endAngle)
		}
		fmt.Printf("\n%s\n", yellow("Все записи углов:"))
		for i, angle := range result.AllAngles {
			fmt.Printf("%d: %.2f°\n", i+1, angle)
		}
	}

	for number, result := range results.FailedCompasses {
		fmt.Printf("\n%s %s:\n", red("Компас"), number)
		fmt.Printf("%s\n", yellow("Ошибки:"))
		for _, err := range result.Errors {
			fmt.Printf("- %s\n", red(err))
		}

		if len(result.Angles) > 0 {
			fmt.Printf("\n%s\n", yellow("Найденные повороты:"))
			for i := 0; i < len(result.Angles); i++ {
				startAngle := result.TurnStartAngles[i]
				endAngle := result.TurnEndAngles[i]
				diff := result.Angles[i]
				fmt.Printf("Поворот %d: %s %.2f° -> %.2f° (%s %.2f°)\n",
					i+1,
					cyan("Изменение:"), startAngle, endAngle,
					cyan("разница:"), diff)
			}
		}

		fmt.Printf("\n%s\n", yellow("Все записи углов:"))
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

		folderName := folder.Name()

		// Проверка формата имени папки: "число" или "число(число)"
		isValidFormat := false
		mainNumberStr := ""

		openParenIndex := strings.Index(folderName, "(")
		closeParenIndex := strings.Index(folderName, ")")

		if openParenIndex > 0 && closeParenIndex == len(folderName)-1 && closeParenIndex > openParenIndex {
			// Формат "число(число)"
			mainNumberStr = folderName[:openParenIndex]
			// Дополнительно проверяем, что часть в скобках - это тоже число. (необязательно по условию, но хорошая практика)
			subNumberStr := folderName[openParenIndex+1 : closeParenIndex]
			if _, err := strconv.Atoi(subNumberStr); err == nil {
				isValidFormat = true
			}
		} else if openParenIndex == -1 && closeParenIndex == -1 {
			// Формат "число" (нет скобок)
			mainNumberStr = folderName
			isValidFormat = true
		}

		// Если формат кажется корректным, проверяем основное число и диапазон
		if isValidFormat && mainNumberStr != "" {
			mainNumber, err := strconv.Atoi(mainNumberStr)
			if err != nil || mainNumber < 1 || mainNumber > 1000000 {
				isValidFormat = false // Некорректное число или вне диапазона
			}
		} else {
			isValidFormat = false // Некорректный формат
		}

		// Если формат невалидный после всех проверок, пропускаем папку
		if !isValidFormat {
			fmt.Printf("Пропускаем папку '%s': некорректный формат имени или номер вне диапазона (1-1000000)\n", folderName)
			continue
		}

		csvPath := filepath.Join(dataDir, folderName, "SB_CMPS.csv")

		if _, err := os.Stat(csvPath); os.IsNotExist(err) {
			fmt.Printf("Компас %s: файл не найден\n", folderName)
			result := models.CompassResult{
				CompassNumber: folderName,
				Errors:        []string{fmt.Sprintf("Файл данных SB_CMPS.csv не найден: %s", csvPath)},
			}
			results.FailedCompasses[folderName] = result
			continue
		} else if err != nil {
			// Handle other potential errors from os.Stat, like permission issues or file in use
			fmt.Printf("Компас %s: ошибка доступа к файлу - %v\n", folderName, err)
			result := models.CompassResult{
				CompassNumber: folderName,
				Errors:        []string{fmt.Sprintf("Ошибка доступа к файлу SB_CMPS.csv (%s): %v", csvPath, err)},
			}
			results.FailedCompasses[folderName] = result
			continue
		}

		// Определяем путь к файлу лога для текущего компаса
		logFilePath := ""
		if analysisLogDir != "" {
			logFileName := fmt.Sprintf("compass_%s_analysis.log", folderName)
			logFilePath = filepath.Join(analysisLogDir, logFileName)
		}

		// Читаем и анализируем данные
		data, err := parser.ReadCSVFile(csvPath)
		if err != nil {
			fmt.Printf("Компас %s: ошибка чтения данных - %v\n", folderName, err)
			result := models.CompassResult{
				CompassNumber: folderName,
				Errors:        []string{fmt.Sprintf("Ошибка чтения файла данных (%s): %v", csvPath, err)},
			}
			results.FailedCompasses[folderName] = result
			continue
		}

		result := analyzer.AnalyzeCompassData(data, logFilePath)
		result.CompassNumber = folderName

		// Сохраняем результаты (analysis errors are already in result.Errors from AnalyzeCompassData)
		if result.IsValid {
			results.SuccessfulCompasses[folderName] = result
		} else {
			results.FailedCompasses[folderName] = result
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
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	// Проверяем существование директории
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return fmt.Errorf("%s: %s", red("директория не существует"), dir)
	}

	// Читаем содержимое директории
	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("%s: %v", red("ошибка чтения директории"), err)
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
			fmt.Printf("%s %s: %v\n", red("Ошибка переименования файла"), oldName, err)
			continue
		}
		renamedCount++
		fmt.Printf("%s: %s -> %s\n", green("Переименован файл"), yellow(oldName), yellow(newName))
	}

	fmt.Printf("\n%s: %d\n", cyan("Всего переименовано файлов"), renamedCount)
	return nil
}

// main — теперь с выбором операции
func main() {
	// Создаем цветные принтеры
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()
	blue := color.New(color.FgBlue).SprintFunc()

	// Показываем информацию об авторе
	fmt.Printf("\n%s\n", cyan(`
    ____                      ____      
   / ___|___  _ __ ___  _ __ |  _ \ ___ 
  | |   / _ \| '_ \ _ \| '_ \| |_) / __|
  | |__| (_) | | | | | | |_) |  _ \__ \
   \____\___/|_| |_| |_| .__/|_| \_\___/
                       |_|             
`))
	fmt.Printf("%s\n", yellow("====================================="))
	fmt.Printf("%s\n", green("Created by: Ульянов Александр Юрьевич"))
	fmt.Printf("%s\n", blue("Version: 1.0.0"))
	fmt.Printf("%s\n\n", yellow("====================================="))

	// Load configuration
	config, err := loadConfig()

	usePrevious := true
	if err != nil {
		fmt.Printf("%s\n", red("Конфигурационный файл не найден или поврежден. Будут запрошены новые директории."))
		usePrevious = false
	} else {
		// Ask user if they want to use previous directories
		fmt.Printf("%s\n", cyan("Найдена предыдущая конфигурация с директориями:"))
		fmt.Printf("  %s: %s\n", yellow("Директория входных данных"), config.DataDir)
		fmt.Printf("  %s: %s\n", yellow("Директория успешных результатов"), config.SuccessDir)
		fmt.Printf("  %s: %s\n", yellow("Директория неуспешных результатов"), config.FailureDir)
		fmt.Printf("  %s: %s\n", yellow("Директория для переименования"), config.RenameDir)
		fmt.Printf("%s", cyan("Хотите использовать их? (да/нет): "))
		var response string
		fmt.Scanln(&response)

		if strings.ToLower(strings.TrimSpace(response)) != "да" {
			fmt.Printf("%s\n", yellow("Выбрана ручная настройка директорий."))
			usePrevious = false
		}
	}

	// Get directories from user or use config
	if !usePrevious {
		config.DataDir = askOrDefault(cyan("Введите директорию с файлами компасов"), config.DataDir)
		config.SuccessDir = askOrDefault(cyan("Введите директорию для успешных результатов"), config.SuccessDir)
		config.FailureDir = askOrDefault(cyan("Введите директорию для неуспешных результатов"), config.FailureDir)
		config.RenameDir = askOrDefault(cyan("Введите директорию для переименования файлов"), config.RenameDir)
	}

	// Save the potentially updated config
	if err := saveConfig(config); err != nil {
		log.Fatalf("%s: %v\n", red("Ошибка сохранения конфигурации"), err)
	}

	// Основной цикл программы
	for {
		fmt.Printf("\n%s\n", cyan("Выберите операцию:"))
		fmt.Printf("%s\n", yellow("1. Проверка компасов"))
		fmt.Printf("%s\n", yellow("2. Корректировка названий файлов"))
		fmt.Printf("%s\n", yellow("3. Выход"))
		fmt.Printf("%s", cyan("Ваш выбор (1-3): "))

		choice := getInput("")
		switch choice {
		case "1":
			results := runSession(config.DataDir, config.SuccessDir, config.FailureDir)
			showResults(results)
		case "2":
			fmt.Printf("\n%s: %s\n", cyan("Начинаем переименование файлов в директории"), yellow(config.RenameDir))
			if err := renameFiles(config.RenameDir); err != nil {
				fmt.Printf("%s: %v\n", red("Ошибка при переименовании файлов"), err)
			}
		case "3":
			fmt.Printf("\n%s\n", green("Программа завершена. Нажмите Enter для выхода..."))
			bufio.NewReader(os.Stdin).ReadBytes('\n')
			return
		default:
			fmt.Printf("%s\n", red("Неверный выбор. Пожалуйста, выберите 1, 2 или 3."))
		}
	}
}
