package webui

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"compass_analyzer/analyzer"
	"compass_analyzer/models"
	"compass_analyzer/parser"
)

// AnalysisRequest представляет запрос на анализ
type AnalysisRequest struct {
	FolderPath string `json:"folderPath"`
}

// AnalysisResponse представляет ответ с результатами анализа
type AnalysisResponse struct {
	Success    bool           `json:"success"`
	IsValid    bool           `json:"isValid"`
	Compass    string         `json:"compass"`
	Turns      []models.Turn  `json:"turns"`
	AllAngles  []float64      `json:"allAngles"`
	Segments   []SegmentInfo  `json:"segments"`
	Errors     []string       `json:"errors"`
	Log        string         `json:"log"`
}

// SegmentInfo представляет информацию о сегменте для фронтенда
type SegmentInfo struct {
	StartIndex int     `json:"startIndex"`
	EndIndex   int     `json:"endIndex"`
	AvgAngle   float64 `json:"avgAngle"`
	Length     int     `json:"length"`
}

// Server представляет веб-сервер
type Server struct {
	port string
}

// NewServer создает новый веб-сервер
func NewServer(port string) *Server {
	return &Server{port: port}
}

// Start запускает веб-сервер
func (s *Server) Start() error {
	// Обслуживание статических файлов
	fs := http.FileServer(http.Dir("webui/static"))
	http.Handle("/", fs)

	// API endpoints
	http.HandleFunc("/api/analyze", s.handleAnalyze)
	http.HandleFunc("/api/batch-analyze", s.handleBatchAnalyze)
	http.HandleFunc("/api/batch-analyze-stream", s.handleBatchAnalyzeStream)

	addr := ":" + s.port
	fmt.Printf("\n╔════════════════════════════════════════════════════════╗\n")
	fmt.Printf("║      Compass Analyzer - Web Interface Started       ║\n")
	fmt.Printf("╚════════════════════════════════════════════════════════╝\n")
	fmt.Printf("\n🌐 Открой в браузере: http://localhost%s\n\n", addr)

	return http.ListenAndServe(addr, nil)
}

// handleAnalyze обрабатывает запрос на анализ одного компаса
func (s *Server) handleAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := s.analyzeFolder(req.FolderPath)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleBatchAnalyze обрабатывает пакетный анализ нескольких компасов
func (s *Server) handleBatchAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DataDir string `json:"dataDir"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	folders, err := os.ReadDir(req.DataDir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var responses []AnalysisResponse

	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		folderPath := filepath.Join(req.DataDir, folder.Name())
		response := s.analyzeFolder(folderPath)
		responses = append(responses, response)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}

// handleBatchAnalyzeStream обрабатывает пакетный анализ с потоковой отправкой результатов
func (s *Server) handleBatchAnalyzeStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DataDir string `json:"dataDir"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	folders, err := os.ReadDir(req.DataDir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Подсчитываем количество папок
	totalFolders := 0
	for _, folder := range folders {
		if folder.IsDir() {
			totalFolders++
		}
	}

	// Настройка SSE (Server-Sent Events)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	log.Printf("📦 Потоковый пакетный анализ: начало обработки %d папок из %s", totalFolders, req.DataDir)

	processed := 0

	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		processed++
		folderPath := filepath.Join(req.DataDir, folder.Name())
		
		log.Printf("⏳ [%d/%d] Анализ: %s", processed, totalFolders, folder.Name())
		
		response := s.analyzeFolder(folderPath)
		
		// Создаем сообщение с прогрессом
		progressMsg := map[string]interface{}{
			"type":      "progress",
			"current":   processed,
			"total":     totalFolders,
			"compass":   folder.Name(),
			"completed": false,
		}
		
		// Отправляем прогресс
		data, _ := json.Marshal(progressMsg)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		
		// Отправляем результат
		resultMsg := map[string]interface{}{
			"type":   "result",
			"result": response,
		}
		
		data, _ = json.Marshal(resultMsg)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	// Отправляем сообщение о завершении
	completeMsg := map[string]interface{}{
		"type":      "complete",
		"total":     totalFolders,
		"completed": true,
	}
	
	data, _ := json.Marshal(completeMsg)
	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()

	log.Printf("✅ Потоковый пакетный анализ завершен: %d папок обработано", totalFolders)
}

// analyzeFolder анализирует данные компаса из указанной папки
func (s *Server) analyzeFolder(folderPath string) AnalysisResponse {
	response := AnalysisResponse{
		Compass: filepath.Base(folderPath),
	}

	// Проверяем наличие CSV файла
	csvPath := filepath.Join(folderPath, "SB_CMPS.csv")
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		response.Success = false
		response.Errors = []string{fmt.Sprintf("Файл SB_CMPS.csv не найден в %s", folderPath)}
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

	// Создаем временный лог-файл
	logFile, err := os.CreateTemp("", "compass_log_*.txt")
	if err != nil {
		log.Printf("Не удалось создать лог-файл: %v", err)
		logFile = nil
	}
	defer func() {
		if logFile != nil {
			logFile.Close()
			os.Remove(logFile.Name())
		}
	}()

	// Анализируем
	isValid, turns := analyzer.AnalyzeCompassData(angles, logFile)

	response.Success = true
	response.IsValid = isValid
	response.Turns = turns

	// Читаем лог
	if logFile != nil {
		logFile.Seek(0, 0)
		logBytes, _ := io.ReadAll(logFile)
		response.Log = string(logBytes)
	}

	// Получаем информацию о сегментах (для визуализации)
	// Пересоздаем сегменты для отправки на фронт
	segments := analyzer.GetSegments(angles)
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
			fmt.Sprintf("Недостаточно найденных поворотов на ~90 градусов: %d (ожидалось 4)", len(turns)),
		}
	}

	return response
}

// StartWebUI запускает веб-интерфейс
func StartWebUI(port string) {
	server := NewServer(port)
	if err := server.Start(); err != nil {
		log.Fatalf("Ошибка запуска веб-сервера: %v", err)
	}
}

