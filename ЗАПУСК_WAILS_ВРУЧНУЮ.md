# ⚡ ЗАПУСК WAILS - Пошаговая инструкция

## ✅ Все готово к сборке!

Файлы созданы, зависимости настроены. Осталось **запустить сборку вручную** из CMD.

---

## 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ:

### Шаг 1: Откройте CMD (не PowerShell!)

**Способ 1:**
- Нажмите `Win + R`
- Введите: `cmd`
- Нажмите Enter

**Способ 2:**
- В проводнике откройте папку проекта
- В адресной строке напишите: `cmd`
- Нажмите Enter

---

### Шаг 2: Перейдите в папку проекта

```cmd
cd /d E:\User\Рабочий стол\Ульянов\dev\CompasAnalyzer
```

---

### Шаг 3: Скачайте зависимости Go

```cmd
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache
go mod download
```

**Ожидайте:** Скачается ~50 МБ пакетов (2-3 минуты).

---

### Шаг 4: Соберите Wails приложение

```cmd
wails build -f main_desktop.go
```

**Ожидайте:** Первая сборка займет 3-5 минут.

**Вы увидите:**
```
Building target: windows/amd64
...
Compiling application...
Packing resources...
Build complete!
```

---

### Шаг 5: Запустите приложение!

```cmd
build\bin\CompassAnalyzer.exe
```

**Готово!** 🎉 Desktop приложение запущено!

---

## 🎯 Альтернатива - Режим разработки (быстрее):

Если сборка долгая, попробуйте режим разработки:

```cmd
wails dev -f main_desktop.go
```

**Преимущества:**
- ⚡ Быстрый запуск (30 секунд)
- 🔥 Hot reload (изменения применяются сразу)
- 🐛 Удобно для отладки

**Минус:**
- Не создает .exe файл (работает только пока запущена команда)

---

## 📦 Что вы получите:

После успешной сборки:

```
build/
└── bin/
    └── CompassAnalyzer.exe  (~10-15 МБ)
```

**Этот файл можно:**
- ✅ Запускать двойным кликом
- ✅ Копировать на другие ПК
- ✅ Распространять без установки

---

## 🐛 Если возникли ошибки:

### Ошибка: "wails: command not found"

**Решение:**
```cmd
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Проверьте установку:
```cmd
wails version
```

---

### Ошибка: "node: command not found"

**Решение:**
```cmd
node --version
```

Если не установлен, скачайте: https://nodejs.org/

У вас уже установлен ✅ v22.17.0

---

### Ошибка: "cannot find module"

**Решение:**
```cmd
go clean -modcache
go mod download
go mod tidy
```

---

### Ошибка: "access denied" или "permission denied"

**Решение:**
Запустите CMD **как администратор**:
1. Найдите "Командная строка" в меню Пуск
2. ПКМ → "Запуск от имени администратора"
3. Повторите шаги 2-4

---

## 📊 Сравнение вариантов:

| Команда | Время | Результат | Использование |
|---------|-------|-----------|---------------|
| `wails build` | 3-5 мин | .exe файл | **Production** |
| `wails dev` | 30 сек | Режим разработки | **Отладка** |
| `start_web.bat` | 10 сек | Веб-версия | **Быстрый тест** |

---

## 💡 Рекомендация:

### Для первого раза:

**Используйте `wails dev`** - быстрее увидите результат!

```cmd
cd /d E:\User\Рабочий стол\Ульянов\dev\CompasAnalyzer
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache
wails dev -f main_desktop.go
```

**Результат:** Через 30 секунд откроется desktop приложение!

### Для финальной версии:

**Используйте `wails build`** - получите .exe файл!

```cmd
wails build -f main_desktop.go
```

**Результат:** `build\bin\CompassAnalyzer.exe` готов к распространению!

---

## ✅ Checklist перед запуском:

- [ ] CMD открыт (не PowerShell!)
- [ ] Путь к проекту правильный (`cd /d E:\User\...`)
- [ ] Go установлен (`go version`)
- [ ] Node.js установлен (`node --version`)
- [ ] Wails установлен (`wails version`)
- [ ] Интернет подключен (для скачивания зависимостей)

---

## 🎉 Готово к запуску!

**Скопируйте и выполните в CMD:**

```cmd
cd /d E:\User\Рабочий стол\Ульянов\dev\CompasAnalyzer
set GOMODCACHE=C:\go_modules
set GOCACHE=C:\go_modules\cache
wails dev -f main_desktop.go
```

**Через 30 секунд увидите ваше desktop приложение!** 🚀

---

## 📞 Если не получается:

1. **Попробуйте веб-версию** (она 100% работает):
   ```cmd
   rebuild_web.bat
   ```

2. **Или используйте VBS-ярлык** (desktop-подобный запуск):
   ```cmd
   start_desktop.vbs
   ```

Обе альтернативы готовы и работают! ✅

