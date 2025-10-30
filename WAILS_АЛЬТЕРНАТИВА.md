# ⚠️ Wails - Альтернативный подход

## Проблема:

Wails требует:
1. **Node.js** (для минификации фронтенда)
2. **Сложную настройку** с go.mod 1.24+
3. **Дополнительные зависимости** (которые конфликтуют)

## ✅ РЕКОМЕНДАЦИЯ: Использовать WEB версию

**Ваше текущее решение ОТЛИЧНО работает:**

```cmd
rebuild_web.bat  # Собрать веб-версию
start_web.bat    # Запустить
```

Открывается в браузере: **http://localhost:8080**

### Преимущества веб-версии:

✅ **Работает прямо сейчас**  
✅ **Не требует зависимостей**  
✅ **Быстрая разработка**  
✅ **Доступна с любого ПК в сети**  
✅ **Один .exe файл + папка webui**

---

## 🎯 Альтернатива Desktop (если ОЧЕНЬ нужно)

### Вариант 1: Electron (проще чем Wails)

```bash
npm install electron-packager -g
```

Создаёте простую обертку:
- Electron запускает ваш Go сервер
- Открывает встроенный браузер на localhost:8080

**Плюсы:**
- Проще настройки
- Работает с текущим кодом без изменений

**Минусы:**
- Большой размер (~150 МБ)

### Вариант 2: WebView2 (нативный Windows)

Используете библиотеку `webview/webview`:

```go
import "github.com/webview/webview"

func main() {
    // Запускаем Go сервер
    go startWebServer()
    
    // Открываем нативное окно WebView2
    w := webview.New(true)
    defer w.Destroy()
    w.SetTitle("Compass Analyzer")
    w.SetSize(1400, 900, webview.HintNone)
    w.Navigate("http://localhost:8080")
    w.Run()
}
```

**Плюсы:**
- Маленький размер (~5 МБ)
- Нативное окно Windows
- Простая интеграция

**Минусы:**
- Нужен Edge WebView2 Runtime (обычно уже установлен в Windows 10/11)

### Вариант 3: Создать Desktop ярлык (самое простое!)

Создайте `.bat` файл:

```batch
@echo off
start compass_analyzer.exe web
timeout /t 2
start http://localhost:8080
exit
```

Создайте `.vbs` для скрытия окна:

```vb
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "start_web.bat", 0, False
Set WshShell = Nothing
```

**Результат:** Двойной клик → открывается "как приложение"!

---

## 📊 Сравнение решений:

| Критерий | WEB (текущее) | Wails | Electron | WebView2 | VBS ярлык |
|----------|---------------|-------|----------|----------|-----------|
| **Размер** | 5 МБ | 10-15 МБ | 150 МБ | 5 МБ | 5 МБ |
| **Сложность** | ✅ Просто | ⚠️ Сложно | ⚠️ Средне | ✅ Просто | ✅ ОЧЕНЬ просто |
| **Зависимости** | ❌ Нет | ⚠️ Node.js, Go 1.24 | ⚠️ Node.js | ❌ Нет* | ❌ Нет |
| **Работает сейчас** | ✅ ДА | ❌ НЕТ | ❌ НЕТ | ⚠️ Нужна настройка | ✅ ДА |
| **Нативный вид** | ❌ Браузер | ✅ | ✅ | ✅ | ⚠️ Браузер |

\* WebView2 Runtime обычно уже есть в Windows 10/11

---

## 🎬 МОЯ РЕКОМЕНДАЦИЯ:

### Для БЫСТРОГО старта (прямо сейчас):

**Используйте VBS ярлык!**

Создам файл `start_desktop.vbs`:

```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\compass_analyzer.exe"" web", 0
WScript.Sleep 2000
WshShell.Run "http://localhost:8080"
Set WshShell = Nothing
```

**Результат:**
- Двойной клик на `.vbs`
- Сервер запускается скрыто
- Браузер открывается автоматически
- **Выглядит как Desktop приложение!**

---

### Для НАСТОЯЩЕГО Desktop (позже):

**Используйте WebView2** - простая интеграция с вашим текущим кодом!

```go
// main_webview.go
package main

import (
    "log"
    "net/http"
    "time"
    
    "compass_analyzer/webui"
    "github.com/webview/webview"
)

func main() {
    // Запускаем веб-сервер
    go func() {
        log.Println("Starting web server...")
        if err := webui.StartServer(":8080"); err != nil {
            log.Fatal(err)
        }
    }()
    
    // Ждем запуска сервера
    time.Sleep(1 * time.Second)
    
    // Создаем нативное окно
    w := webview.New(true)
    defer w.Destroy()
    w.SetTitle("Compass Analyzer - Desktop")
    w.SetSize(1400, 900, webview.HintNone)
    w.Navigate("http://localhost:8080")
    w.Run()
}
```

Установка:
```bash
go get github.com/webview/webview
go build -ldflags="-H windowsgui" -o compass_desktop.exe main_webview.go
```

**Готово!** Один .exe файл с нативным окном!

---

## ❓ Что выбрать?

**Если нужно ПРЯМО СЕЙЧАС:**
→ Используйте `.vbs` ярлык (сделаю за 1 минуту!)

**Если нужен красивый Desktop:**
→ Используйте WebView2 (настройка ~15 минут)

**Если Wails обязателен:**
→ Нужно установить Node.js и продолжить отладку

**Что предпочитаете?** 🤔

