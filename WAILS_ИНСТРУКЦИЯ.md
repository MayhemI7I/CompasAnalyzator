# 🖥️ Wails Desktop - Инструкция по сборке

## ✅ Готово к сборке!

Все файлы созданы. Node.js v22.17.0 установлен ✅

---

## 🚀 Сборка Desktop приложения:

### Вариант 1: Через bat-файл (рекомендуется)

```cmd
wails_build.bat
```

**Что произойдет:**
1. Скачаются зависимости Go
2. Сгенерируются Wails bindings
3. Соберется desktop приложение

**Результат:** `build\bin\CompassAnalyzer.exe` (~10-15 МБ)

---

### Вариант 2: Вручную

```cmd
# 1. Скачать зависимости
go mod download

# 2. Сгенерировать bindings
wails generate module

# 3. Собрать приложение
wails build -f main_desktop.go
```

---

## 🔥 Режим разработки (Hot Reload):

```cmd
wails_dev.bat
```

Или:
```cmd
wails dev -f main_desktop.go
```

**Изменения HTML/CSS/JS применяются автоматически!**

---

## 📦 Структура проекта:

```
CompasAnalyzer/
├── main_desktop.go          ← Точка входа Wails
├── desktop/
│   └── app.go              ← Go API для фронтенда
├── wails.json              ← Конфигурация Wails
├── go.mod                  ← Зависимости (чистый, без конфликтов)
├── webui/static/
│   ├── index.html          ← HTML (универсальный)
│   ├── app_wails.js        ← JS (работает и в Wails, и в Web)
│   └── styles.css          ← CSS
├── frontend/               ← Сгенерированные Wails bindings
├── build/bin/              ← Готовый .exe после сборки
├── wails_build.bat         ← Скрипт сборки
└── wails_dev.bat           ← Скрипт разработки
```

---

## 🎯 Как это работает:

### 1. **Go Backend (desktop/app.go)**

Экспортирует функции для JavaScript:

```go
func (a *App) AnalyzeCompass(folderPath string, config analyzer.AnalysisConfig) AnalysisResponse
func (a *App) BatchAnalyze(dataDir string, config analyzer.AnalysisConfig) []AnalysisResponse
func (a *App) GetDefaultConfig() analyzer.AnalysisConfig
```

### 2. **JavaScript Frontend (app_wails.js)**

Вызывает Go функции:

```javascript
// Автоматически определяет режим (Wails или Web)
if (window.go && window.go.desktop && window.go.desktop.App) {
    // Wails Desktop режим
    data = await window.go.desktop.App.AnalyzeCompass(folderPath, config);
} else {
    // Web режим
    const response = await fetch('/api/analyze', {...});
}
```

**Результат:** Один интерфейс работает в обоих режимах!

---

## ⚙️ Настройки (wails.json):

```json
{
  "name": "compass_analyzer_desktop",
  "outputfilename": "CompassAnalyzer",
  "assetdir": "./webui/static",
  "info": {
    "companyName": "МТЦ",
    "productName": "Compass Analyzer Desktop",
    "productVersion": "2.0"
  }
}
```

---

## 🎨 Интерфейс:

**Точно такой же**, как в веб-версии:
- ✅ Анализ одного компаса
- ✅ Пакетный анализ
- ✅ Настройки (5 параметров)
- ✅ Графики с зумом
- ✅ Цветовая индикация браков
- ✅ Экспорт в JSON/CSV
- ✅ История (в разработке)

**Отличия от веб-версии:**
- 🖥️ Нативное окно Windows
- ⚡ Не нужен браузер
- 📦 Один .exe файл
- 🚀 Быстрый запуск

---

## 🐛 Возможные ошибки:

### 1. "wails: command not found"

**Решение:**
```cmd
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 2. "Node.js required"

**Решение:**
```cmd
node --version  # Проверьте версию (должна быть 16+)
```

У вас уже установлен ✅ v22.17.0

### 3. "build failed: cannot find package"

**Решение:**
```cmd
go mod download
go mod tidy
```

---

## 📊 Сравнение режимов:

| Функция | Web (start_web.bat) | Desktop (wails_build.bat) |
|---------|---------------------|---------------------------|
| **Окно** | Браузер | Нативное Windows окно |
| **Запуск** | Нужен сервер | Двойной клик на .exe |
| **Размер** | 5 МБ | 10-15 МБ |
| **Зависимости** | ❌ Нет | ❌ Нет (после сборки) |
| **Интерфейс** | ✅ Полный | ✅ Полный |
| **Настройки** | ✅ | ✅ |
| **Графики** | ✅ | ✅ |
| **Распространение** | Нужен Go | Один .exe |

---

## 🎓 Следующие шаги:

### 1. **Соберите приложение:**

```cmd
wails_build.bat
```

Дождитесь сообщения: **"✅ СБОРКА УСПЕШНА!"**

### 2. **Запустите:**

```cmd
build\bin\CompassAnalyzer.exe
```

Или двойной клик на файле!

### 3. **Проверьте работу:**

- Введите путь к папке компаса
- Нажмите "Анализировать"
- Проверьте результаты

### 4. **Распространение:**

Скопируйте `CompassAnalyzer.exe` на другой ПК - он будет работать без установки!

---

## 🎉 Готово!

Теперь у вас:
- ✅ **Веб-версия**: `start_web.bat`
- ✅ **Desktop версия**: `wails_build.bat` → `CompassAnalyzer.exe`

**Оба варианта используют один и тот же код!**

---

## 💡 Советы:

### Для разработки:

```cmd
wails_dev.bat  # Hot reload
```

### Для сборки production:

```cmd
wails build -f main_desktop.go -clean
```

### Для создания установщика (Windows):

```cmd
wails build -nsis
```

Создаст `.msi` установщик!

---

## 📞 Поддержка:

Если возникли проблемы:

1. Проверьте логи в консоли
2. Убедитесь, что Node.js установлен: `node --version`
3. Попробуйте очистить кэш: `go clean -cache`
4. Пересоберите: `wails build -clean -f main_desktop.go`

---

**Приступайте к сборке!** 🚀

```cmd
wails_build.bat
```

