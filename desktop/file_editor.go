package desktop

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// RenameResult результат переименования файла
type RenameResult struct {
	OldName string `json:"oldName"`
	NewName string `json:"newName"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// RenameStats статистика переименования
type RenameStats struct {
	Total     int            `json:"total"`
	Success   int            `json:"success"`
	Failed    int            `json:"failed"`
	Results   []RenameResult `json:"results"`
	Directory string         `json:"directory"`
}

// RemoveTextFromFilenames удаляет текст из названий файлов в директории
func (a *App) RemoveTextFromFilenames(directory string, textToRemove string, recursive bool) RenameStats {
	stats := RenameStats{
		Directory: directory,
		Results:   []RenameResult{},
	}

	if textToRemove == "" {
		return stats
	}

	// Получаем список файлов
	var files []string
	if recursive {
		err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && strings.Contains(info.Name(), textToRemove) {
				files = append(files, path)
			}
			return nil
		})
		if err != nil {
			stats.Results = append(stats.Results, RenameResult{
				Success: false,
				Error:   fmt.Sprintf("Ошибка обхода директории: %v", err),
			})
			return stats
		}
	} else {
		entries, err := os.ReadDir(directory)
		if err != nil {
			stats.Results = append(stats.Results, RenameResult{
				Success: false,
				Error:   fmt.Sprintf("Ошибка чтения директории: %v", err),
			})
			return stats
		}

		for _, entry := range entries {
			if !entry.IsDir() && strings.Contains(entry.Name(), textToRemove) {
				files = append(files, filepath.Join(directory, entry.Name()))
			}
		}
	}

	stats.Total = len(files)

	// Переименовываем файлы
	for _, oldPath := range files {
		oldName := filepath.Base(oldPath)
		newName := strings.ReplaceAll(oldName, textToRemove, "")
		
		// Пропускаем если имя не изменилось
		if newName == oldName {
			continue
		}

		newPath := filepath.Join(filepath.Dir(oldPath), newName)

		result := RenameResult{
			OldName: oldName,
			NewName: newName,
		}

		// Проверяем, не существует ли уже файл с новым именем
		if _, err := os.Stat(newPath); err == nil {
			result.Success = false
			result.Error = "Файл с таким именем уже существует"
			stats.Failed++
		} else {
			// Переименовываем
			err := os.Rename(oldPath, newPath)
			if err != nil {
				result.Success = false
				result.Error = fmt.Sprintf("Ошибка: %v", err)
				stats.Failed++
			} else {
				result.Success = true
				stats.Success++
			}
		}

		stats.Results = append(stats.Results, result)
	}

	return stats
}

// PreviewRename предпросмотр переименования (без изменений)
func (a *App) PreviewRename(directory string, textToRemove string, recursive bool) RenameStats {
	stats := RenameStats{
		Directory: directory,
		Results:   []RenameResult{},
	}

	if textToRemove == "" {
		return stats
	}

	// Получаем список файлов
	var files []string
	if recursive {
		filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && strings.Contains(info.Name(), textToRemove) {
				files = append(files, path)
			}
			return nil
		})
	} else {
		entries, err := os.ReadDir(directory)
		if err != nil {
			return stats
		}

		for _, entry := range entries {
			if !entry.IsDir() && strings.Contains(entry.Name(), textToRemove) {
				files = append(files, filepath.Join(directory, entry.Name()))
			}
		}
	}

	stats.Total = len(files)

	// Создаем превью без реального переименования
	for _, oldPath := range files {
		oldName := filepath.Base(oldPath)
		newName := strings.ReplaceAll(oldName, textToRemove, "")
		
		if newName != oldName {
			result := RenameResult{
				OldName: oldName,
				NewName: newName,
				Success: true,
			}
			stats.Results = append(stats.Results, result)
			stats.Success++
		}
	}

	return stats
}

// GetFilesCount возвращает количество файлов с указанным текстом
func (a *App) GetFilesCount(directory string, textToFind string, recursive bool) int {
	count := 0

	if recursive {
		filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && strings.Contains(info.Name(), textToFind) {
				count++
			}
			return nil
		})
	} else {
		entries, err := os.ReadDir(directory)
		if err != nil {
			return 0
		}

		for _, entry := range entries {
			if !entry.IsDir() && strings.Contains(entry.Name(), textToFind) {
				count++
			}
		}
	}

	return count
}

