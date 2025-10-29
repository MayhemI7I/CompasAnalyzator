package gui

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"compass_analyzer/analyzer"
	"compass_analyzer/models"
	"compass_analyzer/parser"
)

// AnalysisTab представляет вкладку анализа
type AnalysisTab struct {
	mainWindow *MainWindow
	content    *fyne.Container

	dirEntry     *widget.Entry
	resultsTable *widget.Table
	progressBar  *widget.ProgressBar
	statsLabel   *widget.Label
	startBtn     *widget.Button

	tableData [][]string
}

// NewAnalysisTab создает новую вкладку анализа
func NewAnalysisTab(mw *MainWindow) *AnalysisTab {
	tab := &AnalysisTab{
		mainWindow: mw,
		tableData:  [][]string{{"Компас", "Статус", "Повороты", "Действие"}},
	}

	tab.buildUI()
	return tab
}

// buildUI создает интерфейс вкладки
func (at *AnalysisTab) buildUI() {
	// Заголовок
	title := widget.NewLabelWithStyle(
		"Анализ калибровки компасов",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)

	subtitle := widget.NewLabel("Выберите директорию с данными компасов для начала анализа")
	subtitle.Importance = widget.LowImportance

	// Выбор директории
	at.dirEntry = widget.NewEntry()
	at.dirEntry.SetPlaceHolder("C:\\Data\\Compasses")
	at.dirEntry.OnChanged = func(s string) {
		at.mainWindow.state.DataDir = s
	}

	browseBtn := widget.NewButtonWithIcon("Обзор...", theme.FolderOpenIcon(), func() {
		at.SelectDirectory()
	})

	dirBox := container.NewBorder(
		nil,
		nil,
		nil,
		browseBtn,
		at.dirEntry,
	)

	// Кнопки действий
	at.startBtn = widget.NewButtonWithIcon("Запустить анализ", theme.MediaPlayIcon(), func() {
		at.StartAnalysis()
	})
	at.startBtn.Importance = widget.HighImportance

	stopBtn := widget.NewButtonWithIcon("Остановить", theme.MediaStopIcon(), func() {
		at.StopAnalysis()
	})

	clearBtn := widget.NewButtonWithIcon("Очистить", theme.ContentClearIcon(), func() {
		at.ClearResults()
	})

	actionsBox := container.NewHBox(
		at.startBtn,
		stopBtn,
		clearBtn,
		layout.NewSpacer(),
	)

	// Прогресс-бар
	at.progressBar = widget.NewProgressBar()
	at.progressBar.Hide()

	// Статистика
	at.statsLabel = widget.NewLabel("Готов к работе")
	at.statsLabel.Importance = widget.MediumImportance

	// Таблица результатов
	at.resultsTable = widget.NewTable(
		func() (int, int) {
			return len(at.tableData), len(at.tableData[0])
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("Cell")
		},
		func(id widget.TableCellID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			label.SetText(at.tableData[id.Row][id.Col])

			// Цветовое кодирование статусов
			if id.Col == 1 && id.Row > 0 {
				status := at.tableData[id.Row][1]
				if status == "✅ Успешно" {
					label.Importance = widget.SuccessImportance
				} else if status == "❌ Брак" {
					label.Importance = widget.DangerImportance
				} else if status == "⏳ Обработка..." {
					label.Importance = widget.WarningImportance
				}
			}
		},
	)

	at.resultsTable.SetColumnWidth(0, 200)
	at.resultsTable.SetColumnWidth(1, 150)
	at.resultsTable.SetColumnWidth(2, 100)
	at.resultsTable.SetColumnWidth(3, 150)

	// Основной контейнер
	at.content = container.NewBorder(
		container.NewVBox(
			title,
			subtitle,
			widget.NewSeparator(),
			dirBox,
			actionsBox,
			at.progressBar,
			at.statsLabel,
			widget.NewSeparator(),
		),
		nil,
		nil,
		nil,
		at.resultsTable,
	)
}

// Content возвращает содержимое вкладки
func (at *AnalysisTab) Content() *fyne.Container {
	return at.content
}

// SelectDirectory открывает диалог выбора директории
func (at *AnalysisTab) SelectDirectory() {
	dialog.ShowFolderOpen(func(dir fyne.ListableURI, err error) {
		if err != nil || dir == nil {
			return
		}

		path := dir.Path()
		at.dirEntry.SetText(path)
		at.mainWindow.state.DataDir = path

		at.mainWindow.AppendLog(fmt.Sprintf("✓ Выбрана директория: %s\n", path))
	}, at.mainWindow.window)
}

// StartAnalysis запускает процесс анализа
func (at *AnalysisTab) StartAnalysis() {
	if at.mainWindow.state.DataDir == "" {
		dialog.ShowError(fmt.Errorf("Не выбрана директория с данными"), at.mainWindow.window)
		return
	}

	// Проверяем, что директория существует
	if _, err := os.Stat(at.mainWindow.state.DataDir); os.IsNotExist(err) {
		dialog.ShowError(fmt.Errorf("Директория не существует: %s", at.mainWindow.state.DataDir), at.mainWindow.window)
		return
	}

	at.mainWindow.state.IsProcessing = true
	at.startBtn.Disable()
	at.progressBar.Show()
	at.ClearResults()

	at.mainWindow.ClearLog()
	at.mainWindow.AppendLog(fmt.Sprintf("╔════════════════════════════════════════════════════════════╗\n"))
	at.mainWindow.AppendLog(fmt.Sprintf("║         НАЧАЛО АНАЛИЗА КОМПАСОВ                          ║\n"))
	at.mainWindow.AppendLog(fmt.Sprintf("╚════════════════════════════════════════════════════════════╝\n\n"))
	at.mainWindow.AppendLog(fmt.Sprintf("Директория: %s\n\n", at.mainWindow.state.DataDir))

	// Запускаем анализ в отдельной горутине
	go at.processDirectory()
}

// processDirectory обрабатывает директорию с компасами
func (at *AnalysisTab) processDirectory() {
	defer func() {
		at.mainWindow.state.IsProcessing = false
		at.startBtn.Enable()
		at.progressBar.Hide()
	}()

	// Читаем список папок
	folders, err := os.ReadDir(at.mainWindow.state.DataDir)
	if err != nil {
		dialog.ShowError(fmt.Errorf("Ошибка чтения директории: %v", err), at.mainWindow.window)
		return
	}

	// Фильтруем только директории
	validFolders := []os.DirEntry{}
	for _, folder := range folders {
		if folder.IsDir() {
			validFolders = append(validFolders, folder)
		}
	}

	totalCount := len(validFolders)
	successCount := 0
	failCount := 0

	at.mainWindow.AppendLog(fmt.Sprintf("Найдено папок для анализа: %d\n\n", totalCount))

	// Обрабатываем каждую папку
	for i, folder := range validFolders {
		folderName := folder.Name()
		folderPath := filepath.Join(at.mainWindow.state.DataDir, folderName)

		// Обновляем прогресс
		progress := float64(i) / float64(totalCount)
		at.progressBar.SetValue(progress)

		// Добавляем в таблицу
		at.addTableRow(folderName, "⏳ Обработка...", "-")

		at.mainWindow.AppendLog(fmt.Sprintf("─────────────────────────────────────────────────────────────\n"))
		at.mainWindow.AppendLog(fmt.Sprintf("Анализ: %s\n", folderName))

		// Анализируем
		isValid, turns := at.analyzeCompass(folderPath, folderName)

		// Обновляем результат в таблице
		status := "❌ Брак"
		if isValid {
			status = "✅ Успешно"
			successCount++
		} else {
			failCount++
		}

		at.updateTableRow(i, folderName, status, fmt.Sprintf("%d/4", len(turns)))

		// Пауза для визуализации (можно убрать в продакшене)
		time.Sleep(100 * time.Millisecond)
	}

	// Финальная статистика
	at.progressBar.SetValue(1.0)

	statsMsg := fmt.Sprintf("Обработано: %d | ✅ Успешно: %d | ❌ Брак: %d",
		totalCount, successCount, failCount)
	at.statsLabel.SetText(statsMsg)

	at.mainWindow.AppendLog(fmt.Sprintf("\n╔════════════════════════════════════════════════════════════╗\n"))
	at.mainWindow.AppendLog(fmt.Sprintf("║              АНАЛИЗ ЗАВЕРШЕН                              ║\n"))
	at.mainWindow.AppendLog(fmt.Sprintf("╚════════════════════════════════════════════════════════════╝\n\n"))
	at.mainWindow.AppendLog(statsMsg + "\n")

	dialog.ShowInformation("Анализ завершен", statsMsg, at.mainWindow.window)
}

// analyzeCompass анализирует один компас
func (at *AnalysisTab) analyzeCompass(folderPath, folderName string) (bool, []models.Turn) {
	// Ищем CSV файл
	csvPath := filepath.Join(folderPath, "SB_CMPS.csv")
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		at.mainWindow.AppendLog(fmt.Sprintf("  ✗ Файл SB_CMPS.csv не найден\n"))
		return false, nil
	}

	// Читаем данные
	data, err := parser.ReadCSVFile(csvPath)
	if err != nil {
		at.mainWindow.AppendLog(fmt.Sprintf("  ✗ Ошибка чтения CSV: %v\n", err))
		return false, nil
	}

	// Извлекаем углы
	angles := make([]float64, len(data))
	for i, d := range data {
		angles[i] = d.Angle
	}

	at.mainWindow.AppendLog(fmt.Sprintf("  ✓ Прочитано записей: %d\n", len(angles)))

	// Используем конфигурацию по умолчанию
	config := analyzer.DefaultConfig()
	// Анализируем (без лог-файла для GUI)
	isValid, turns := analyzer.AnalyzeCompassData(angles, config, nil)

	at.mainWindow.AppendLog(fmt.Sprintf("  • Найдено поворотов: %d/4\n", len(turns)))

	if isValid {
		at.mainWindow.AppendLog(fmt.Sprintf("  ✅ КАЛИБРОВКА УСПЕШНА\n"))
		for i, turn := range turns {
			at.mainWindow.AppendLog(fmt.Sprintf("    %d. %.2f° → %.2f° (Δ=%.2f°)\n",
				i+1, turn.StartAngle, turn.EndAngle, turn.Diff))
		}
	} else {
		at.mainWindow.AppendLog(fmt.Sprintf("  ❌ КАЛИБРОВКА НЕ ПРОШЛА\n"))
		if len(turns) < 4 {
			at.mainWindow.AppendLog(fmt.Sprintf("    Причина: Недостаточно поворотов (%d < 4)\n", len(turns)))
		}
	}

	return isValid, turns
}

// addTableRow добавляет строку в таблицу
func (at *AnalysisTab) addTableRow(name, status, turns string) {
	row := []string{name, status, turns, "Детали >"}
	at.tableData = append(at.tableData, row)
	at.resultsTable.Refresh()
}

// updateTableRow обновляет строку в таблице
func (at *AnalysisTab) updateTableRow(index int, name, status, turns string) {
	if index+1 < len(at.tableData) {
		at.tableData[index+1] = []string{name, status, turns, "Детали >"}
		at.resultsTable.Refresh()
	}
}

// StopAnalysis останавливает анализ
func (at *AnalysisTab) StopAnalysis() {
	at.mainWindow.state.IsProcessing = false
	at.mainWindow.AppendLog("\n⚠ Анализ остановлен пользователем\n")
}

// ClearResults очищает таблицу результатов
func (at *AnalysisTab) ClearResults() {
	at.tableData = [][]string{{"Компас", "Статус", "Повороты", "Действие"}}
	at.resultsTable.Refresh()
	at.statsLabel.SetText("Готов к работе")
	at.progressBar.SetValue(0)
}
