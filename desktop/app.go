package desktop

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"compass_analyzer/analyzer"
	"compass_analyzer/parser"
	
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App структура
type App struct {
	ctx context.Context
}

// NewApp создает экземпляр
func NewApp() *App {
	return &App{}
}

// Startup вызывается при запуске
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	fmt.Println("🖥️ Compass Analyzer Desktop запущен!")
}

// AnalysisResponse структура ответа
type AnalysisResponse struct {
	Success    bool          `json:"success"`
	IsValid    bool          `json:"isValid"`
	Compass    string        `json:"compass"`
	DeviceType string        `json:"deviceType"` // Тип устройства
	Turns      []TurnInfo    `json:"turns"`
	AllAngles  []float64     `json:"allAngles"`
	Segments   []SegmentInfo `json:"segments"`
	Errors     []string      `json:"errors,omitempty"`
	Log        string        `json:"log,omitempty"`
}

// TurnInfo информация о повороте
type TurnInfo struct {
	StartAngle  float64 `json:"startAngle"`
	EndAngle    float64 `json:"endAngle"`
	Diff        float64 `json:"diff"`
	SignedDiff  float64 `json:"signedDiff"`
	IsClockwise bool    `json:"isClockwise"`
	StartIndex  int     `json:"startIndex"`
	EndIndex    int     `json:"endIndex"`
}

// SegmentInfo информация о сегменте
type SegmentInfo struct {
	StartIndex int     `json:"startIndex"`
	EndIndex   int     `json:"endIndex"`
	AvgAngle   float64 `json:"avgAngle"`
	Length     int     `json:"length"`
}

// AnalyzeCompass анализирует компас
func (a *App) AnalyzeCompass(folderPath string, config analyzer.AnalysisConfig, deviceType string) AnalysisResponse {
	response := AnalysisResponse{
		Compass:    filepath.Base(folderPath),
		DeviceType: deviceType,
	}

	// Проверяем CSV
	csvPath := filepath.Join(folderPath, "SB_CMPS.csv")
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		response.Success = false
		response.Errors = []string{fmt.Sprintf("Файл SB_CMPS.csv не найден: %s", csvPath)}
		return response
	}

	// Читаем данные
	data, err := parser.ReadCSVFile(csvPath)
	if err != nil {
		response.Success = false
		response.Errors = []string{fmt.Sprintf("Ошибка чтения CSV: %v", err)}
		return response
	}

	// Извлекаем углы
	angles := make([]float64, len(data))
	for i, d := range data {
		angles[i] = d.Angle
	}
	response.AllAngles = angles

	// Создаем временный лог
	logFile, err := os.CreateTemp("", "compass_log_*.txt")
	if err != nil {
		logFile = nil
	}
	defer func() {
		if logFile != nil {
			logFile.Close()
			os.Remove(logFile.Name())
		}
	}()

	// Анализ
	isValid, turns := analyzer.AnalyzeCompassData(angles, config, logFile)

	response.Success = true
	response.IsValid = isValid

	// Конвертируем turns
	for _, turn := range turns {
		response.Turns = append(response.Turns, TurnInfo{
			StartAngle:  turn.StartAngle,
			EndAngle:    turn.EndAngle,
			Diff:        turn.Diff,
			SignedDiff:  turn.SignedDiff,
			IsClockwise: turn.IsClockwise,
			StartIndex:  turn.StartIndex,
			EndIndex:    turn.EndIndex,
		})
	}

	// Читаем лог
	if logFile != nil {
		logFile.Seek(0, 0)
		logBytes, _ := io.ReadAll(logFile)
		response.Log = string(logBytes)
	}

	// Сегменты
	segments := analyzer.GetSegments(angles, config)
	for _, seg := range segments {
		response.Segments = append(response.Segments, SegmentInfo{
			StartIndex: seg.StartIndex,
			EndIndex:   seg.EndIndex,
			AvgAngle:   seg.AvgAngle,
			Length:     len(seg.AllAngles),
		})
	}

	if !isValid {
		response.Errors = []string{
			fmt.Sprintf("Недостаточно поворотов: %d (ожидалось 4)", len(turns)),
		}
	}

	return response
}

// BatchAnalyze пакетный анализ с параллельной обработкой
func (a *App) BatchAnalyze(dataDir string, config analyzer.AnalysisConfig, deviceType string) []AnalysisResponse {
	folders, err := os.ReadDir(dataDir)
	if err != nil {
		return []AnalysisResponse{{
			Success: false,
			Errors:  []string{fmt.Sprintf("Ошибка чтения: %v", err)},
		}}
	}

	// Фильтруем только директории
	var validFolders []os.DirEntry
	for _, folder := range folders {
		if folder.IsDir() {
			validFolders = append(validFolders, folder)
		}
	}

	// Параллельная обработка с горутинами
	return a.batchAnalyzeParallel(dataDir, validFolders, config, deviceType)
}

// batchAnalyzeParallel параллельная обработка с горутинами
func (a *App) batchAnalyzeParallel(dataDir string, folders []os.DirEntry, config analyzer.AnalysisConfig, deviceType string) []AnalysisResponse {
	// Автоопределение оптимального количества воркеров
	// На 4-ядерном процессоре = 4 воркера, на 8-ядерном = 8
	numWorkers := runtime.NumCPU()
	if numWorkers > 8 {
		numWorkers = 8 // Ограничение для избежания перегрузки
	}
	totalFolders := len(folders)
	
	// Каналы для работы
	jobs := make(chan int, totalFolders)
	results := make(chan struct {
		index    int
		response AnalysisResponse
	}, totalFolders)

	// Запускаем воркеры (горутины)
	for w := 0; w < numWorkers; w++ {
		go func() {
			for index := range jobs {
				folder := folders[index]
				folderPath := filepath.Join(dataDir, folder.Name())
				
				// Полный анализ с типом устройства
				response := a.AnalyzeCompass(folderPath, config, deviceType)
				
				results <- struct {
					index    int
					response AnalysisResponse
				}{index, response}
			}
		}()
	}

	// Отправляем задачи
	for i := range folders {
		jobs <- i
	}
	close(jobs)

	// Собираем результаты
	responseMap := make(map[int]AnalysisResponse)
	for i := 0; i < totalFolders; i++ {
		result := <-results
		responseMap[result.index] = result.response
	}
	close(results)

	// Восстанавливаем порядок
	responses := make([]AnalysisResponse, totalFolders)
	for i := 0; i < totalFolders; i++ {
		responses[i] = responseMap[i]
	}

	return responses
}

// GetDefaultConfig возвращает конфигурацию по умолчанию
func (a *App) GetDefaultConfig() analyzer.AnalysisConfig {
	return analyzer.DefaultConfig()
}

// GetHistoryDir возвращает путь к папке с историей
func (a *App) GetHistoryDir() (string, error) {
	return GetHistoryPath()
}

// SelectDirectory открывает диалог выбора директории через Wails
func (a *App) SelectDirectory(title string) (string, error) {
	// Используем Wails runtime для открытия диалога
	// Этот метод вызывается из JavaScript
	selection, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: title,
	})
	
	return selection, err
}

// SaveExportFile сохраняет файл экспорта в соответствующую папку
func (a *App) SaveExportFile(content string, filename string, fileType string, customDir string) (string, error) {
	var exportDir string
	
	if customDir != "" {
		// Используем выбранную директорию
		exportDir = customDir
	} else {
		// Получаем путь к exe файлу (по умолчанию)
		exePath, err := os.Executable()
		if err != nil {
			return "", fmt.Errorf("не удалось определить путь к приложению: %v", err)
		}
		
		exeDir := filepath.Dir(exePath)
		
		// Определяем папку в зависимости от типа
		if fileType == "csv" {
			exportDir = filepath.Join(exeDir, "Export Results CSV")
		} else if fileType == "json" {
			exportDir = filepath.Join(exeDir, "Export Results JSON")
		} else {
			return "", fmt.Errorf("неизвестный тип файла: %s", fileType)
		}
	}
	
	// Создаем папку если не существует
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания папки: %v", err)
	}
	
	// Полный путь к файлу
	fullPath := filepath.Join(exportDir, filename)
	
	// Сохраняем файл
	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка сохранения файла: %v", err)
	}
	
	return fullPath, nil
}
