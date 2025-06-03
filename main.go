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
type Config struct {
	DataDir    string `json:"data_dir"`
	SuccessDir string `json:"success_dir"`
	FailureDir string `json:"failure_dir"`
	RenameDir  string `json:"rename_dir"`
}

func showResults(results models.SessionResults) {
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	fmt.Printf("\n%s\n", cyan("Итоги анализа:"))
	fmt.Printf("%s: %d компасов\n", green("Успешно проанализировано"), len(results.SuccessfulCompasses))
	fmt.Printf("%s: %d компасов\n", red("Ошибок анализа"), len(results.FailedCompasses))

	fmt.Printf("\n%s:\n", green("Успешные компасы"))
	if len(results.SuccessfulCompasses) == 0 {
		fmt.Printf("%s\n", yellow("Нет успешно проанализированных компасов"))
	} else {
		for number := range results.SuccessfulCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	fmt.Printf("\n%s:\n", red("Неуспешные компасы"))
	if len(results.FailedCompasses) == 0 {
		fmt.Printf("%s\n", yellow("Нет неуспешных компасов"))
	} else {
		for number := range results.FailedCompasses {
			fmt.Printf("%s ", number)
		}
		fmt.Println()
	}

	fmt.Printf("\n%s", cyan("Показать подробную информацию по компасам? (y/n): "))
	if getInput("") == "y" {
		showDetailedResults(results)
	}
}

func showDetailedResults(results models.SessionResults) {
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	fmt.Printf("\n%s\n", cyan("Подробная информация по компасам:"))

	for number, result := range results.SuccessfulCompasses {
		fmt.Printf("\n%s %s:\n", green("Компас"), number)
		fmt.Printf("%s\n", yellow("Найденные повороты:"))
		for i, turn := range result.Turns {
			fmt.Printf("Поворот %d: %.2f° -> %.2f° (изменение: %.2f°)\n",
				i+1, turn.StartAngle, turn.EndAngle, turn.Diff)
			fmt.Printf("  Индексы: %d -> %d\n", turn.StartIndex, turn.EndIndex)
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
		if len(result.Turns) > 0 {
			fmt.Printf("\n%s\n", yellow("Найденные повороты:"))
			for i, turn := range result.Turns {
				fmt.Printf("Поворот %d: %.2f° -> %.2f° (изменение: %.2f°)\n",
					i+1, turn.StartAngle, turn.EndAngle, turn.Diff)
				fmt.Printf("  Индексы: %d -> %d\n", turn.StartIndex, turn.EndIndex)
			}
		}
		fmt.Printf("\n%s\n", yellow("Все записи углов:"))
		for i, angle := range result.AllAngles {
			fmt.Printf("%d: %.2f°\n", i+1, angle)
		}
	}
}

func getInput(prompt string) string {
	fmt.Print(prompt)
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan()
	return scanner.Text()
}

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

	analysisLogDir := filepath.Join(filepath.Dir(dataDir), "analysis_logs")
	if err := os.MkdirAll(analysisLogDir, 0755); err != nil {
		log.Printf("Ошибка создания директории логов анализа %s: %v", analysisLogDir, err)
		analysisLogDir = ""
	}

	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		folderName := folder.Name()
		isValidFormat := false
		mainNumberStr := ""

		openParenIndex := strings.Index(folderName, "(")
		closeParenIndex := strings.Index(folderName, ")")

		if openParenIndex > 0 && closeParenIndex == len(folderName)-1 && closeParenIndex > openParenIndex {
			mainNumberStr = folderName[:openParenIndex]
			subNumberStr := folderName[openParenIndex+1 : closeParenIndex]
			if _, err := strconv.Atoi(subNumberStr); err == nil {
				isValidFormat = true
			}
		} else if openParenIndex == -1 && closeParenIndex == -1 {
			mainNumberStr = folderName
			isValidFormat = true
		}

		if isValidFormat && mainNumberStr != "" {
			mainNumber, err := strconv.Atoi(mainNumberStr)
			if err != nil || mainNumber < 1 || mainNumber > 1000000 {
				isValidFormat = false
			}
		} else {
			isValidFormat = false
		}

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
			fmt.Printf("Компас %s: ошибка доступа к файлу - %v\n", folderName, err)
			result := models.CompassResult{
				CompassNumber: folderName,
				Errors:        []string{fmt.Sprintf("Ошибка доступа к файлу SB_CMPS.csv (%s): %v", csvPath, err)},
			}
			results.FailedCompasses[folderName] = result
			continue
		}

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

		// Получаем углы из данных
		angles := make([]float64, len(data))
		for i, d := range data {
			angles[i] = d.Angle
		}

		// Анализируем данные с помощью нового алгоритма
		turns := analyzer.AnalyzeCompassData(angles)

		result := models.CompassResult{
			CompassNumber: folderName,
			AllAngles:     angles,
			Turns:         turns,
			IsValid:       len(turns) >= 4,
		}

		if !result.IsValid {
			result.Errors = append(result.Errors,
				fmt.Sprintf("Недостаточно найденных поворотов на ~90 градусов: %d (ожидалось не менее 4)", len(turns)))
		}

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

func loadConfig() (*Config, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	configPath := filepath.Join(configDir, "compass_analyzer", "config.json")
	file, err := os.Open(configPath)
	if err != nil {
		return &Config{}, nil
	}
	defer file.Close()
	var cfg Config
	if err := json.NewDecoder(file).Decode(&cfg); err != nil {
		return &Config{}, nil
	}
	return &cfg, nil
}

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

func renameFiles(dir string) error {
	cyan := color.New(color.FgCyan).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return fmt.Errorf("%s: %s", red("директория не существует"), dir)
	}

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
		if !strings.Contains(oldName, "tim") {
			continue
		}

		newName := strings.Replace(oldName, "tim.", "", 1)
		oldPath := filepath.Join(dir, oldName)
		newPath := filepath.Join(dir, newName)

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

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("Ошибка загрузки конфигурации: %v", err)
	}

	fmt.Println("Анализатор данных компаса")
	fmt.Println("------------------------")
	fmt.Println("1. Запустить анализ")
	fmt.Println("2. Настроить пути")
	fmt.Println("3. Переименовать файлы")
	fmt.Println("4. Выход")

	choice := getInput("\nВыберите действие (1-4): ")

	switch choice {
	case "1":
		if cfg.DataDir == "" || cfg.SuccessDir == "" || cfg.FailureDir == "" {
			fmt.Println("Сначала настройте пути к директориям!")
			return
		}
		results := runSession(cfg.DataDir, cfg.SuccessDir, cfg.FailureDir)
		showResults(results)

	case "2":
		cfg.DataDir = askOrDefault("Путь к директории с данными", cfg.DataDir)
		cfg.SuccessDir = askOrDefault("Путь к директории для успешных результатов", cfg.SuccessDir)
		cfg.FailureDir = askOrDefault("Путь к директории для неуспешных результатов", cfg.FailureDir)
		cfg.RenameDir = askOrDefault("Путь к директории для переименования файлов", cfg.RenameDir)

		if err := saveConfig(cfg); err != nil {
			fmt.Printf("Ошибка сохранения конфигурации: %v\n", err)
		} else {
			fmt.Println("Конфигурация сохранена")
		}

	case "3":
		if cfg.RenameDir == "" {
			fmt.Println("Сначала укажите путь к директории для переименования файлов!")
			return
		}
		if err := renameFiles(cfg.RenameDir); err != nil {
			fmt.Printf("Ошибка переименования файлов: %v\n", err)
		}

	case "4":
		return

	default:
		fmt.Println("Неверный выбор")
	}
}
