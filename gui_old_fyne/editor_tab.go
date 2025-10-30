package gui

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// EditorTab представляет вкладку редактора файлов
type EditorTab struct {
	mainWindow   *MainWindow
	content      *fyne.Container
	dirEntry     *widget.Entry
	previewTable *widget.Table
	tableData    [][]string
}

// NewEditorTab создает новую вкладку редактора
func NewEditorTab(mw *MainWindow) *EditorTab {
	tab := &EditorTab{
		mainWindow: mw,
		tableData:  [][]string{{"Старое имя", "Новое имя"}},
	}

	tab.buildUI()
	return tab
}

// buildUI создает интерфейс вкладки
func (et *EditorTab) buildUI() {
	title := widget.NewLabelWithStyle(
		"Массовое переименование файлов",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)

	subtitle := widget.NewLabel("Удаление подстроки 'tim.' из названий файлов")
	subtitle.Importance = widget.LowImportance

	// Выбор директории
	et.dirEntry = widget.NewEntry()
	et.dirEntry.SetPlaceHolder("Директория для обработки...")

	browseBtn := widget.NewButtonWithIcon("Обзор...", theme.FolderOpenIcon(), func() {
		et.SelectDirectory()
	})

	dirBox := container.NewBorder(
		nil,
		nil,
		nil,
		browseBtn,
		et.dirEntry,
	)

	// Кнопки действий
	scanBtn := widget.NewButtonWithIcon("Сканировать", theme.SearchIcon(), func() {
		et.ScanFiles()
	})

	applyBtn := widget.NewButtonWithIcon("Применить", theme.ConfirmIcon(), func() {
		et.ApplyRename()
	})
	applyBtn.Importance = widget.HighImportance

	actionsBox := container.NewHBox(
		scanBtn,
		applyBtn,
	)

	// Таблица preview
	et.previewTable = widget.NewTable(
		func() (int, int) {
			return len(et.tableData), len(et.tableData[0])
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("Cell")
		},
		func(id widget.TableCellID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			label.SetText(et.tableData[id.Row][id.Col])
		},
	)

	et.previewTable.SetColumnWidth(0, 300)
	et.previewTable.SetColumnWidth(1, 300)

	et.content = container.NewBorder(
		container.NewVBox(
			title,
			subtitle,
			widget.NewSeparator(),
			dirBox,
			actionsBox,
			widget.NewSeparator(),
		),
		nil,
		nil,
		nil,
		et.previewTable,
	)
}

// Content возвращает содержимое вкладки
func (et *EditorTab) Content() *fyne.Container {
	return et.content
}

// SelectDirectory открывает диалог выбора директории
func (et *EditorTab) SelectDirectory() {
	dialog.ShowFolderOpen(func(dir fyne.ListableURI, err error) {
		if err != nil || dir == nil {
			return
		}
		et.dirEntry.SetText(dir.Path())
	}, et.mainWindow.window)
}

// ScanFiles сканирует файлы для переименования
func (et *EditorTab) ScanFiles() {
	dirPath := et.dirEntry.Text
	if dirPath == "" {
		dialog.ShowError(fmt.Errorf("Укажите директорию"), et.mainWindow.window)
		return
	}

	et.tableData = [][]string{{"Старое имя", "Новое имя"}}

	// Рекурсивно обходим файлы
	filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		fileName := filepath.Base(path)
		if strings.Contains(fileName, "tim.") {
			newName := strings.Replace(fileName, "tim.", "", 1)
			et.tableData = append(et.tableData, []string{fileName, newName})
		}

		return nil
	})

	et.previewTable.Refresh()
	et.mainWindow.AppendLog(fmt.Sprintf("Найдено файлов для переименования: %d\n", len(et.tableData)-1))
}

// ApplyRename применяет переименование
func (et *EditorTab) ApplyRename() {
	if len(et.tableData) <= 1 {
		dialog.ShowError(fmt.Errorf("Нет файлов для переименования"), et.mainWindow.window)
		return
	}

	dirPath := et.dirEntry.Text
	count := 0

	for i := 1; i < len(et.tableData); i++ {
		oldName := et.tableData[i][0]
		newName := et.tableData[i][1]

		oldPath := filepath.Join(dirPath, oldName)
		newPath := filepath.Join(filepath.Dir(oldPath), newName)

		if err := os.Rename(oldPath, newPath); err == nil {
			count++
			et.mainWindow.AppendLog(fmt.Sprintf("✓ %s → %s\n", oldName, newName))
		} else {
			et.mainWindow.AppendLog(fmt.Sprintf("✗ Ошибка: %s - %v\n", oldName, err))
		}
	}

	dialog.ShowInformation("Готово", fmt.Sprintf("Переименовано файлов: %d", count), et.mainWindow.window)
	et.ScanFiles() // Обновляем список
}
