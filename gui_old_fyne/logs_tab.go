package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// LogsTab представляет вкладку логов
type LogsTab struct {
	mainWindow *MainWindow
	content    *fyne.Container
	logText    *widget.Entry
}

// NewLogsTab создает новую вкладку логов
func NewLogsTab(mw *MainWindow) *LogsTab {
	tab := &LogsTab{
		mainWindow: mw,
	}

	tab.buildUI()
	return tab
}

// buildUI создает интерфейс вкладки
func (lt *LogsTab) buildUI() {
	// Заголовок
	title := widget.NewLabelWithStyle(
		"Детальные логи анализа",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)

	subtitle := widget.NewLabel("Подробная информация о каждом этапе анализа")
	subtitle.Importance = widget.LowImportance

	// Лог-область
	lt.logText = widget.NewMultiLineEntry()
	lt.logText.SetPlaceHolder("Логи появятся здесь после запуска анализа...")
	lt.logText.Wrapping = fyne.TextWrapWord

	// Кнопки
	clearBtn := widget.NewButtonWithIcon("Очистить", theme.ContentClearIcon(), func() {
		lt.logText.SetText("")
		lt.mainWindow.ClearLog()
	})

	exportBtn := widget.NewButtonWithIcon("Экспорт", theme.DocumentSaveIcon(), func() {
		lt.ExportLog()
	})

	buttonsBox := container.NewHBox(
		clearBtn,
		exportBtn,
	)

	// Основной контейнер
	lt.content = container.NewBorder(
		container.NewVBox(
			title,
			subtitle,
			widget.NewSeparator(),
			buttonsBox,
			widget.NewSeparator(),
		),
		nil,
		nil,
		nil,
		container.NewScroll(lt.logText),
	)
}

// Content возвращает содержимое вкладки
func (lt *LogsTab) Content() *fyne.Container {
	return lt.content
}

// UpdateLog обновляет содержимое лога
func (lt *LogsTab) UpdateLog(text string) {
	lt.logText.SetText(text)
	// Прокручиваем вниз
	lt.logText.CursorRow = len(lt.logText.Text)
}

// ExportLog экспортирует лог в файл
func (lt *LogsTab) ExportLog() {
	// TODO: Реализовать экспорт
	lt.mainWindow.AppendLog("Экспорт логов (в разработке)\n")
}
