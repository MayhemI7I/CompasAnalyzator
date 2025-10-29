package gui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// SettingsTab представляет вкладку настроек
type SettingsTab struct {
	mainWindow      *MainWindow
	content         *fyne.Container
	dataDirEntry    *widget.Entry
	successDirEntry *widget.Entry
	failureDirEntry *widget.Entry
}

// NewSettingsTab создает новую вкладку настроек
func NewSettingsTab(mw *MainWindow) *SettingsTab {
	tab := &SettingsTab{
		mainWindow: mw,
	}

	tab.buildUI()
	return tab
}

// buildUI создает интерфейс вкладки
func (st *SettingsTab) buildUI() {
	title := widget.NewLabelWithStyle(
		"Настройки приложения",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)

	subtitle := widget.NewLabel("Конфигурация путей и параметров анализа")
	subtitle.Importance = widget.LowImportance

	// Пути к директориям
	st.dataDirEntry = widget.NewEntry()
	st.dataDirEntry.SetPlaceHolder("Директория с данными...")

	st.successDirEntry = widget.NewEntry()
	st.successDirEntry.SetPlaceHolder("Директория для успешных...")

	st.failureDirEntry = widget.NewEntry()
	st.failureDirEntry.SetPlaceHolder("Директория для брака...")

	form := &widget.Form{
		Items: []*widget.FormItem{
			{Text: "Директория с данными:", Widget: st.dataDirEntry},
			{Text: "Успешные:", Widget: st.successDirEntry},
			{Text: "Брак:", Widget: st.failureDirEntry},
		},
		OnSubmit: func() {
			st.SaveSettings()
		},
	}

	saveBtn := widget.NewButtonWithIcon("Сохранить", theme.DocumentSaveIcon(), func() {
		st.SaveSettings()
	})
	saveBtn.Importance = widget.HighImportance

	// О программе
	aboutText := widget.NewLabel(`
Compass Analyzer v2.0 Neural Edition

Автор: Ульянов Александр Юрьевич
Должность: Регулировщик 3-го разряда

© 2025 Все права защищены
Копирование запрещено

Система автоматического анализа калибровки компасов
с использованием современного алгоритма обработки данных.
	`)
	aboutText.Wrapping = fyne.TextWrapWord

	st.content = container.NewBorder(
		container.NewVBox(
			title,
			subtitle,
			widget.NewSeparator(),
		),
		nil,
		nil,
		nil,
		container.NewVScroll(
			container.NewVBox(
				form,
				saveBtn,
				widget.NewSeparator(),
				widget.NewLabelWithStyle("О программе", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
				aboutText,
			),
		),
	)
}

// Content возвращает содержимое вкладки
func (st *SettingsTab) Content() *fyne.Container {
	return st.content
}

// SaveSettings сохраняет настройки
func (st *SettingsTab) SaveSettings() {
	st.mainWindow.state.DataDir = st.dataDirEntry.Text
	st.mainWindow.state.SuccessDir = st.successDirEntry.Text
	st.mainWindow.state.FailureDir = st.failureDirEntry.Text

	dialog.ShowInformation("Настройки сохранены", "Настройки успешно сохранены", st.mainWindow.window)
}
