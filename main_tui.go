package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"compass_analyzer/analyzer"
	"compass_analyzer/parser"

	"github.com/fatih/color"
)

// TUI - Terminal User Interface (улучшенная консольная версия)

func clearScreen() {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("cmd", "/c", "cls")
		cmd.Stdout = os.Stdout
		cmd.Run()
	} else {
		cmd := exec.Command("clear")
		cmd.Stdout = os.Stdout
		cmd.Run()
	}
}

func drawBox(title string, width int) {
	cyan := color.New(color.FgCyan).SprintFunc()
	
	fmt.Println(cyan("╔" + strings.Repeat("═", width-2) + "╗"))
	
	padding := (width - len(title) - 2) / 2
	fmt.Print(cyan("║"))
	fmt.Print(strings.Repeat(" ", padding))
	fmt.Print(title)
	fmt.Print(strings.Repeat(" ", width-len(title)-padding-2))
	fmt.Println(cyan("║"))
	
	fmt.Println(cyan("╚" + strings.Repeat("═", width-2) + "╝"))
}

func showProgressBar(current, total int) {
	width := 50
	filled := int(float64(current) / float64(total) * float64(width))
	
	bar := "["
	bar += strings.Repeat("█", filled)
	bar += strings.Repeat("░", width-filled)
	bar += "]"
	
	percent := int(float64(current) / float64(total) * 100)
	
	cyan := color.New(color.FgCyan).SprintFunc()
	fmt.Printf("\r%s %3d%% (%d/%d)", cyan(bar), percent, current, total)
}

func runTUIAnalysis() {
	clearScreen()
	
	cyan := color.New(color.FgCyan).SprintFunc()
	green := color.New(color.FgGreen).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	red := color.New(color.FgRed).SprintFunc()
	
	drawBox("🧭 COMPASS ANALYZER v2.0 - TUI MODE", 70)
	fmt.Println()
	
	// Выбор директории
	fmt.Print(cyan("📁 Директория с данными: "))
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan()
	dataDir := scanner.Text()
	
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		fmt.Println(red("\n❌ Директория не существует!"))
		fmt.Println("\nНажми Enter...")
		scanner.Scan()
		return
	}
	
	fmt.Println()
	drawBox("НАЧАЛО АНАЛИЗА", 70)
	fmt.Println()
	
	// Читаем папки
	folders, err := os.ReadDir(dataDir)
	if err != nil {
		fmt.Println(red("❌ Ошибка чтения директории:", err))
		return
	}
	
	validFolders := []os.DirEntry{}
	for _, folder := range folders {
		if folder.IsDir() {
			validFolders = append(validFolders, folder)
		}
	}
	
	totalCount := len(validFolders)
	successCount := 0
	failCount := 0
	
	fmt.Printf("%s %d\n\n", cyan("Найдено папок:"), totalCount)
	
	// Таблица результатов
	results := make([]struct {
		Name   string
		Status string
		Turns  int
	}, 0)
	
	// Анализ
	for i, folder := range validFolders {
		folderName := folder.Name()
		folderPath := filepath.Join(dataDir, folderName)
		
		// Прогресс
		showProgressBar(i+1, totalCount)
		
		// Анализируем
		csvPath := filepath.Join(folderPath, "SB_CMPS.csv")
		if _, err := os.Stat(csvPath); os.IsNotExist(err) {
			results = append(results, struct {
				Name   string
				Status string
				Turns  int
			}{folderName, "Нет файла", 0})
			failCount++
			continue
		}
		
		data, err := parser.ReadCSVFile(csvPath)
		if err != nil {
			results = append(results, struct {
				Name   string
				Status string
				Turns  int
			}{folderName, "Ошибка чтения", 0})
			failCount++
			continue
		}
		
		angles := make([]float64, len(data))
		for i, d := range data {
			angles[i] = d.Angle
		}
		
		isValid, turns := analyzer.AnalyzeCompassData(angles, nil)
		
		status := "Брак"
		if isValid {
			status = "Успешно"
			successCount++
		} else {
			failCount++
		}
		
		results = append(results, struct {
			Name   string
			Status string
			Turns  int
		}{folderName, status, len(turns)})
		
		time.Sleep(50 * time.Millisecond)
	}
	
	fmt.Println() // Новая строка после прогресс-бара
	fmt.Println()
	
	// Результаты
	drawBox("РЕЗУЛЬТАТЫ АНАЛИЗА", 70)
	fmt.Println()
	
	fmt.Printf("%s: %d\n", cyan("Всего обработано"), totalCount)
	fmt.Printf("%s: %d\n", green("✅ Успешно"), successCount)
	fmt.Printf("%s: %d\n", red("❌ Брак"), failCount)
	fmt.Println()
	
	// Таблица
	fmt.Println(cyan("┌─────────────────────┬──────────────┬───────────┐"))
	fmt.Println(cyan("│") + " Компас              " + cyan("│") + " Статус       " + cyan("│") + " Повороты  " + cyan("│"))
	fmt.Println(cyan("├─────────────────────┼──────────────┼───────────┤"))
	
	for _, result := range results {
		nameCell := result.Name
		if len(nameCell) > 19 {
			nameCell = nameCell[:16] + "..."
		} else {
			nameCell = nameCell + strings.Repeat(" ", 19-len(nameCell))
		}
		
		statusCell := result.Status
		statusColor := yellow
		if result.Status == "Успешно" {
			statusColor = green
			statusCell = "✅ " + result.Status
		} else if result.Status == "Брак" {
			statusColor = red
			statusCell = "❌ " + result.Status
		}
		statusCell = statusCell + strings.Repeat(" ", 12-len(result.Status))
		
		turnsCell := fmt.Sprintf("%d/4", result.Turns)
		turnsCell = turnsCell + strings.Repeat(" ", 9-len(turnsCell))
		
		fmt.Printf("%s %s %s %s %s %s %s\n",
			cyan("│"), nameCell,
			cyan("│"), statusColor(statusCell),
			cyan("│"), turnsCell,
			cyan("│"))
	}
	
	fmt.Println(cyan("└─────────────────────┴──────────────┴───────────┘"))
	fmt.Println()
	
	// Меню действий
	fmt.Println(yellow("Что дальше?"))
	fmt.Println("  1. Показать детальный лог")
	fmt.Println("  2. Экспорт в CSV")
	fmt.Println("  3. Новый анализ")
	fmt.Println("  4. Выход")
	fmt.Print("\nВыбери действие (1-4): ")
	
	scanner.Scan()
	choice := scanner.Text()
	
	switch choice {
	case "1":
		showDetailedLog(results)
	case "2":
		fmt.Println(yellow("\n💾 Экспорт в разработке..."))
	case "3":
		runTUIAnalysis()
		return
	case "4":
		return
	}
	
	fmt.Println("\nНажми Enter для продолжения...")
	scanner.Scan()
}

func showDetailedLog(results []struct {
	Name   string
	Status string
	Turns  int
}) {
	clearScreen()
	cyan := color.New(color.FgCyan).SprintFunc()
	
	drawBox("ДЕТАЛЬНЫЕ ЛОГИ", 70)
	fmt.Println()
	
	for _, result := range results {
		fmt.Printf("%s %s\n", cyan("━"), result.Name)
		fmt.Printf("  Статус: %s\n", result.Status)
		fmt.Printf("  Повороты: %d/4\n", result.Turns)
		fmt.Println()
	}
	
	fmt.Println("Нажми Enter...")
	bufio.NewScanner(os.Stdin).Scan()
}

// StartTUI запускает Terminal User Interface
func StartTUI() {
	runTUIAnalysis()
}

