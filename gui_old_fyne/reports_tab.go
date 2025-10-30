package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// ReportsTab представляет вкладку отчетов
type ReportsTab struct {
	mainWindow *MainWindow
	content    *fyne.Container
}

// NewReportsTab создает новую вкладку отчетов
func NewReportsTab(mw *MainWindow) *ReportsTab {
	tab := &ReportsTab{
		mainWindow: mw,
	}

	tab.buildUI()
	return tab
}

// buildUI создает интерфейс вкладки
func (rt *ReportsTab) buildUI() {
	title := widget.NewLabelWithStyle(
		"Отчеты и статистика",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)

	subtitle := widget.NewLabel("Экспорт результатов анализа в различных форматах")
	subtitle.Importance = widget.LowImportance

	// Кнопки экспорта
	exportCSVBtn := widget.NewButtonWithIcon("Экспорт в CSV", theme.DocumentSaveIcon(), func() {
		rt.ExportReport()
	})

	exportJSONBtn := widget.NewButtonWithIcon("Экспорт в JSON", theme.DocumentSaveIcon(), func() {
		rt.ExportReport()
	})

	exportPDFBtn := widget.NewButtonWithIcon("Экспорт в PDF", theme.DocumentSaveIcon(), func() {
		rt.ExportReport()
	})

	buttonsBox := container.NewVBox(
		exportCSVBtn,
		exportJSONBtn,
		exportPDFBtn,
	)

	infoLabel := widget.NewLabel("Функция экспорта отчетов в разработке...")
	infoLabel.Importance = widget.MediumImportance

	rt.content = container.NewBorder(
		container.NewVBox(
			title,
			subtitle,
			widget.NewSeparator(),
		),
		nil,
		nil,
		nil,
		container.NewVBox(
			buttonsBox,
			infoLabel,
		),
	)
}

// Content возвращает содержимое вкладки
func (rt *ReportsTab) Content() *fyne.Container {
	return rt.content
}

// ExportReport экспортирует отчет
func (rt *ReportsTab) ExportReport() {
	rt.mainWindow.AppendLog("Экспорт отчета (в разработке)\n")
}
