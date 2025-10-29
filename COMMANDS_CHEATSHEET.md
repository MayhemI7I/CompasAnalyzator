# 🎯 Шпаргалка команд для GUI

## ⚡ Быстрый запуск (без флагов):

```bash
# Запуск с консолью (для отладки)
go run main.go gui
```

---

## 🎨 Правильная сборка GUI для Windows:

### **С консолью** (для отладки и просмотра ошибок):
```bash
go build -o compass_analyzer_gui.exe
compass_analyzer_gui.exe gui
```

### **Без консоли** (чистое GUI приложение): ⭐
```bash
go build -ldflags "-H windowsgui" -o compass_analyzer_gui.exe
compass_analyzer_gui.exe gui
```

---

## 📚 Объяснение флагов:

### `-ldflags "-H windowsgui"`
**Что делает:** Скрывает консольное окно на Windows  
**Когда использовать:** Для финальной сборки приложения  
**Результат:** Открывается только GUI окно (без черного окна консоли)

**Пример:**
```bash
# БЕЗ флага: Откроется 2 окна (консоль + GUI)
go build -o app.exe
app.exe gui

# С ФЛАГОМ: Откроется только GUI окно ⭐
go build -ldflags "-H windowsgui" -o app.exe
app.exe gui
```

---

### `-o compass_analyzer_gui.exe`
**Что делает:** Задаёт имя выходного файла  
**По умолчанию:** Имя берётся из go.mod (compass_analyzer.exe)  
**С флагом:** Можно назвать как угодно

**Примеры:**
```bash
go build -o MyApp.exe           # → MyApp.exe
go build -o bin/app.exe         # → bin/app.exe
go build -o gui_v2.exe          # → gui_v2.exe
```

---

### `-tags static`
**Что делает:** Статическая линковка библиотек  
**Когда нужно:** Для переносимого .exe без зависимостей  
**Результат:** Больший размер файла, но работает везде

```bash
go build -tags static -o app.exe
```

---

## 🚀 Полная команда (всё вместе):

```bash
# Оптимальная сборка для Windows GUI
go build -ldflags "-H windowsgui -s -w" -o compass_analyzer_gui.exe
```

**Флаги `-s -w`:**
- `-s` — убрать таблицу символов (меньше размер)
- `-w` — убрать DWARF отладочную информацию (меньше размер)
- **Результат:** .exe файл на 30-50% меньше!

---

## 📋 Все варианты запуска:

### 1. Через `go run` (без компиляции):
```bash
# С консолью (видны ошибки)
go run main.go gui

# Нельзя убрать консоль в режиме go run
```

### 2. Через компиляцию (создаёт .exe):
```bash
# Вариант A: С консолью (отладка)
go build -o app.exe
app.exe gui

# Вариант B: Без консоли (релиз)
go build -ldflags "-H windowsgui" -o app.exe
app.exe gui

# Вариант C: Оптимизированная сборка
go build -ldflags "-H windowsgui -s -w" -o app.exe
app.exe gui
```

### 3. Через батник (рекомендуется):
```
start_gui.bat  (двойной клик)
```

---

## 🎯 Какой способ выбрать:

| Задача | Команда |
|--------|---------|
| Быстрая проверка | `go run main.go gui` |
| Отладка ошибок | `go build` + запуск |
| Финальная версия | `go build -ldflags "-H windowsgui -s -w"` |
| Ежедневное использование | `start_gui.bat` |

---

## 🐛 Если не компилируется:

### Ошибка про Fyne:
```bash
# Установи зависимости
go mod tidy
go mod download
```

### Ошибка про GCC (на Windows):
```bash
# Скачай и установи TDM-GCC:
# https://jmeubank.github.io/tdm-gcc/

# Или MinGW:
# https://sourceforge.net/projects/mingw/
```

### Ошибка про go.sum:
```bash
# Пересоздай go.sum
del go.sum
go mod tidy
```

---

## 💾 Размеры файлов:

| Флаги | Размер .exe |
|-------|-------------|
| Без флагов | ~25 МБ |
| `-ldflags "-H windowsgui"` | ~25 МБ |
| `-ldflags "-H windowsgui -s -w"` | ~15 МБ ⭐ |
| `-ldflags "-H windowsgui -s -w" -tags static` | ~40 МБ |

---

## ⚙️ Дополнительные флаги (опционально):

### Для кросс-компиляции на другие ОС:
```bash
# Сборка для Linux
GOOS=linux GOARCH=amd64 go build -o app_linux

# Сборка для macOS
GOOS=darwin GOARCH=amd64 go build -o app_mac

# Сборка для Windows ARM
GOOS=windows GOARCH=arm64 go build -o app_arm.exe
```

### Для оптимизации:
```bash
# Параллельная компиляция (быстрее)
go build -p 4

# С verbose (показывать процесс)
go build -v

# Очистка кеша перед сборкой
go clean -cache && go build
```

---

## 🎯 ИТОГОВАЯ РЕКОМЕНДАЦИЯ:

### Для разработки (с консолью для логов):
```bash
go run main.go gui
```

### Для финальной сборки (без консоли):
```bash
go build -ldflags "-H windowsgui -s -w" -o compass_analyzer_gui.exe
```

### Через батник (автоматически):
```
start_gui.bat  ← уже с правильными флагами!
```

---

**Просто запусти `install_dependencies.bat`, затем `start_gui.bat` — всё настроено!** 🚀

