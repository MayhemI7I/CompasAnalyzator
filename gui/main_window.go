package gui

import (
	"fmt"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// AppState хранит глобальное состояние приложения
type AppState struct {
	DataDir      string
	SuccessDir   string
	FailureDir   string
	CurrentLog   string
	Results      []CompassResult
	IsProcessing bool
}

// CompassResult представляет результат анализа компаса
type CompassResult struct {
	Name       string
	Status     string // "Успешно" / "Брак"
	TurnsCount int
	LogPath    string
}

// MainWindow представляет главное окно приложения
type MainWindow struct {
	app    fyne.App
	window fyne.Window
	state  *AppState

	// Вкладки
	analysisTab *AnalysisTab
	logsTab     *LogsTab
	editorTab   *EditorTab
	reportsTab  *ReportsTab
	settingsTab *SettingsTab
}

// NewMainWindow создает новое главное окно
func NewMainWindow() *MainWindow {
	myApp := app.NewWithID("com.ulyanov.compass-analyzer")
	myApp.SetIcon(theme.ComputerIcon())

	window := myApp.NewWindow("Compass Analyzer v2.0 - Анализатор калибровки компасов")
	window.Resize(fyne.NewSize(1200, 800))
	window.CenterOnScreen()

	state := &AppState{
		Results: make([]CompassResult, 0),
	}

	mw := &MainWindow{
		app:    myApp,
		window: window,
		state:  state,
	}

	// Создаем вкладки
	mw.analysisTab = NewAnalysisTab(mw)
	mw.logsTab = NewLogsTab(mw)
	mw.editorTab = NewEditorTab(mw)
	mw.reportsTab = NewReportsTab(mw)
	mw.settingsTab = NewSettingsTab(mw)

	// Создаем интерфейс
	mw.setupUI()

	return mw
}

// setupUI создает пользовательский интерфейс
func (mw *MainWindow) setupUI() {
	// Заголовок с логотипом
	header := mw.createHeader()

	// Вкладки
	tabs := container.NewAppTabs(
		container.NewTabItemWithIcon("Анализ", theme.SearchIcon(), mw.analysisTab.Content()),
		container.NewTabItemWithIcon("Логи", theme.DocumentIcon(), mw.logsTab.Content()),
		container.NewTabItemWithIcon("Редактор", theme.ContentCutIcon(), mw.editorTab.Content()),
		container.NewTabItemWithIcon("Отчеты", theme.InfoIcon(), mw.reportsTab.Content()),
		container.NewTabItemWithIcon("Настройки", theme.SettingsIcon(), mw.settingsTab.Content()),
	)

	tabs.SetTabLocation(container.TabLocationLeading)

	// Футер со статусом
	footer := mw.createFooter()

	// Основной контейнер
	content := container.NewBorder(
		header, // top
		footer, // bottom
		nil,    // left
		nil,    // right
		tabs,   // center
	)

	mw.window.SetContent(content)
}

// createHeader создает заголовок приложения
func (mw *MainWindow) createHeader() *fyne.Container {
	// Логотип
	logo := canvas.NewText("🧭 Compass Analyzer", color.RGBA{R: 99, G: 102, B: 241, A: 255})
	logo.TextSize = 24
	logo.TextStyle = fyne.TextStyle{Bold: true}

	// Версия
	version := widget.NewLabel("v2.0 Neural Edition")

	// Автор
	author := widget.NewLabel("© Ульянов Александр Юрьевич | Регулировщик 3-го разряда")

	leftBox := container.NewVBox(
		logo,
		version,
	)

	// Кнопки быстрого доступа
	quickButtons := container.NewHBox(
		widget.NewButtonWithIcon("Выбрать папку", theme.FolderOpenIcon(), func() {
			mw.analysisTab.SelectDirectory()
		}),
		widget.NewButtonWithIcon("Запустить анализ", theme.MediaPlayIcon(), func() {
			mw.analysisTab.StartAnalysis()
		}),
		widget.NewButtonWithIcon("Экспорт", theme.DocumentSaveIcon(), func() {
			mw.reportsTab.ExportReport()
		}),
	)

	header := container.NewBorder(
		nil,
		nil,
		leftBox,
		quickButtons,
		author,
	)

	// Добавляем разделитель
	separator := canvas.NewLine(color.RGBA{R: 128, G: 128, B: 128, A: 128})
	separator.StrokeWidth = 1

	return container.NewVBox(
		container.NewPadded(header),
		separator,
	)
}

// createFooter создает футер со статусом
func (mw *MainWindow) createFooter() *fyne.Container {
	statusLabel := widget.NewLabel("Готов к работе")
	statusLabel.Importance = widget.LowImportance

	progressBar := widget.NewProgressBar()
	progressBar.Hide()

	separator := canvas.NewLine(color.RGBA{R: 128, G: 128, B: 128, A: 128})
	separator.StrokeWidth = 1

	footer := container.NewVBox(
		separator,
		container.NewPadded(
			container.NewBorder(
				nil,
				nil,
				statusLabel,
				nil,
				progressBar,
			),
		),
	)

	return footer
}

// Run запускает приложение
func (mw *MainWindow) Run() {
	mw.window.ShowAndRun()
}

// UpdateStatus обновляет статусную строку
func (mw *MainWindow) UpdateStatus(message string) {
	// TODO: Реализовать обновление статуса
	fmt.Println("Status:", message)
}

// ShowProgress показывает прогресс-бар
func (mw *MainWindow) ShowProgress(show bool) {
	// TODO: Реализовать показ прогресса
}

// CreateDesktopApp создает и запускает десктопное приложение
func CreateDesktopApp() {
	mainWindow := NewMainWindow()
	mainWindow.Run()
}

// AppendLog добавляет сообщение в лог
func (mw *MainWindow) AppendLog(message string) {
	mw.state.CurrentLog += message + "\n"
	mw.logsTab.UpdateLog(mw.state.CurrentLog)
}

// ClearLog очищает лог
func (mw *MainWindow) ClearLog() {
	mw.state.CurrentLog = ""
	mw.logsTab.UpdateLog("")
}
