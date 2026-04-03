// Compass Analyzer - Unified app.js (работает и в Wails, и в веб-режиме)

// Global state
const state = {
    currentPage: 'analyze',
    currentData: null,
    batchResults: null,
    chart: null,
    settings: null,
    currentChartData: null,  // Для управления диапазоном графика
    historyData: null,
    historyDataFull: null,   // Полные данные для фильтрации
    historyFiltered: null,   // Отфильтрованные данные истории (для навигации)
    batchFiltered: null,     // Отфильтрованные данные пакетного анализа (для навигации)
    // Для навигации по результатам
    navigationSource: null,  // 'history' или 'batch'
    navigationIndex: -1,     // Текущий индекс в списке
    navigationList: [],      // Список ID/индексов для навигации
    // Система предзагрузки (скользящее окно)
    preloadedHistory: new Map(),  // Map<itemID, parsedData> - предзагруженные данные истории
    preloadWindowSize: 50,        // Максимальное количество записей в памяти (скользящее окно)
    preloadRadius: 20             // Сколько записей подгружать вперед и назад
};

// Default settings
const DEFAULT_SETTINGS = {
    stabilityThreshold: 5.0,
    turnTolerance: 10.0,
    minSegmentLength: 2,
    maxOutliers: 0,
    sumTolerance: 20.0
};

// Проверка режима работы
function isWailsMode() {
    return !!(window.go && window.go.desktop && window.go.desktop.App);
}

// Load settings
function loadSettings() {
    const saved = localStorage.getItem('compassSettings');
    if (saved) {
        try {
            state.settings = JSON.parse(saved);
        } catch (e) {
            state.settings = {...DEFAULT_SETTINGS};
        }
    } else {
        state.settings = {...DEFAULT_SETTINGS};
    }
    return state.settings;
}

// Save settings
function saveSettings(settings) {
    state.settings = settings;
    localStorage.setItem('compassSettings', JSON.stringify(settings));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupNavigation();
    setupButtons();
    initSettingsPage();
    restoreLastViewedAnalysis();
    
    const mode = isWailsMode() ? '🖥️ Desktop (Wails)' : '🌐 Web';
    showToast(`${mode} режим готов к работе!`, 'success');
});

// Restore last viewed analysis info on page load
function restoreLastViewedAnalysis() {
    const lastCompass = localStorage.getItem('lastViewedCompass');
    const lastDeviceType = localStorage.getItem('lastViewedDeviceType');
    
    if (lastCompass && lastDeviceType) {
        // Если есть сохраненные данные, показываем их в панели информации
        const deviceTypeEl = document.getElementById('deviceTypeDisplay');
        const compassNumberEl = document.getElementById('compassNumberDisplay');
        
        if (deviceTypeEl && compassNumberEl) {
            deviceTypeEl.textContent = lastDeviceType;
            compassNumberEl.textContent = lastCompass;
            console.log('📋 Восстановлена информация о последнем анализе:', lastCompass, lastDeviceType);
        }
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.dataset.page);
        });
    });
}

function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    const titles = {
        analyze: { title: 'Анализ калибровки компаса', subtitle: 'Система анализа калибровки компасов МТЦ' },
        batch: { title: 'Пакетный анализ', subtitle: 'Массовая обработка нескольких компасов с параллельной обработкой' },
        history: { title: 'История анализов', subtitle: 'Просмотр выполненных проверок с фильтрацией и поиском' },
        settings: { title: 'Настройки алгоритма', subtitle: 'Конфигурация параметров анализа' },
        editor: { title: 'Редактор файлов', subtitle: 'Массовое переименование файлов в директории' },
        logs: { title: 'Логи отладки', subtitle: 'Просмотр детальных логов для диагностики проблем' }
    };
    
    if (titles[pageName]) {
        document.getElementById('page-title').textContent = titles[pageName].title;
        document.getElementById('page-subtitle').textContent = titles[pageName].subtitle;
    }
    
    // Header всегда виден
    
    // Если переходим на analyze, скрываем результаты и показываем uploadZone
    if (pageName === 'analyze') {
        const resultsSection = document.getElementById('resultsSection');
        const uploadZone = document.getElementById('uploadZone');
        if (resultsSection && resultsSection.style.display === 'block') {
            // Не скрываем автоматически результаты
        } else if (uploadZone) {
            uploadZone.style.display = 'flex';
            if (resultsSection) {
                resultsSection.style.display = 'none';
            }
        }
    }
    
    state.currentPage = pageName;
    
    // Загружаем логи при переходе на страницу логов
    if (pageName === 'logs') {
        setTimeout(loadLogs, 100);
    }
    
    console.log('📄 Переключение на страницу:', pageName);
}

// Setup buttons
function setupButtons() {
    // Кнопка для выбора папки (точечный анализ)
    const selectFolderBtn = document.createElement('button');
    selectFolderBtn.className = 'btn btn-secondary';
    selectFolderBtn.innerHTML = '<span class="material-icons">folder_open</span>';
    selectFolderBtn.title = 'Выбрать папку';
    selectFolderBtn.addEventListener('click', selectSingleFolder);
    
    const singleInputGroup = document.querySelector('#singleFolderInput').parentElement;
    singleInputGroup.insertBefore(selectFolderBtn, document.getElementById('analyzeSingleBtn'));
    
    // Кнопка для выбора директории (пакетный анализ)
    const selectBatchDirBtn = document.createElement('button');
    selectBatchDirBtn.className = 'btn btn-secondary';
    selectBatchDirBtn.innerHTML = '<span class="material-icons">folder_open</span>';
    selectBatchDirBtn.title = 'Выбрать директорию';
    selectBatchDirBtn.addEventListener('click', selectBatchDirectory);
    
    const batchInputGroup = document.querySelector('#batchDirInput').parentElement;
    batchInputGroup.insertBefore(selectBatchDirBtn, document.getElementById('batchAnalyzeBtn'));
    
    document.getElementById('analyzeSingleBtn').addEventListener('click', () => {
        const folderPath = document.getElementById('singleFolderInput').value.trim();
        if (folderPath) {
            openAnalysisDeviceModal('single', folderPath);
        } else {
            showToast('⚠️ Введите путь к папке или выберите через диалог', 'warning');
        }
    });
    
    // Обработчики для экспорта и копирования
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('exportCSVBtn').addEventListener('click', exportResultsCSV);
    const copyLogBtn = document.getElementById('copyLogBtn');
    if (copyLogBtn) copyLogBtn.addEventListener('click', copyLog);
    
    const batchBtn = document.getElementById('batchAnalyzeBtn');
    if (batchBtn) batchBtn.addEventListener('click', () => {
        const dirInput = document.getElementById('batchDirInput').value.trim();
        if (!dirInput) {
            showToast('⚠️ Укажите директорию', 'warning');
            return;
        }
        openAnalysisDeviceModal('batch', dirInput);
    });
}

// Функция выбора папки для точечного анализа
async function selectSingleFolder() {
    if (!isWailsMode()) {
        showToast('⚠️ Выбор папки доступен только в Desktop режиме', 'warning');
        return;
    }
    
    try {
        // Используем Go метод через Wails binding
        const result = await window.go.desktop.App.SelectDirectory('Выберите папку с данными компаса');
        
        if (result) {
            document.getElementById('singleFolderInput').value = result;
            showToast('📁 Папка выбрана', 'success');
        }
    } catch (error) {
        console.error('Ошибка выбора папки:', error);
        showToast(`❌ Ошибка: ${error.message || error}`, 'error');
    }
}

// Функция выбора директории для пакетного анализа
async function selectBatchDirectory() {
    if (!isWailsMode()) {
        showToast('⚠️ Выбор директории доступен только в Desktop режиме', 'warning');
        return;
    }
    
    try {
        // Используем Go метод через Wails binding
        const result = await window.go.desktop.App.SelectDirectory('Выберите директорию с папками компасов');
        
        if (result) {
            document.getElementById('batchDirInput').value = result;
            showToast('📁 Директория выбрана', 'success');
        }
    } catch (error) {
        console.error('Ошибка выбора директории:', error);
        showToast(`❌ Ошибка: ${error.message || error}`, 'error');
    }
}

function resetAnalysis() {
    state.currentData = null;
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('singleFolderInput').value = '';
    
    // Восстанавливаем заголовок
    document.getElementById('page-title').textContent = 'Анализ калибровки компаса';
    document.getElementById('page-subtitle').textContent = 'Система анализа калибровки компасов МТЦ';
}

// Модальное окно выбора типа устройства перед анализом
function openAnalysisDeviceModal(analysisType, path) {
    const modal = document.getElementById('analysisDeviceTypeModal');
    modal.style.display = 'flex';
    
    // Загружаем последний введенный тип
    const lastDeviceType = localStorage.getItem('lastDeviceType') || 'Коралл';
    document.getElementById('analysisDeviceTypeInput').value = lastDeviceType;
    
    // Обработчик кнопки подтверждения
    const confirmBtn = document.getElementById('confirmAnalysisBtn');
    confirmBtn.onclick = () => {
        const deviceType = document.getElementById('analysisDeviceTypeInput').value.trim();
        if (!deviceType) {
            showToast('⚠️ Введите тип устройства', 'warning');
            return;
        }
        
        // Сохраняем последний введенный тип
        localStorage.setItem('lastDeviceType', deviceType);
        
        closeAnalysisDeviceModal();
        
        // Выполняем анализ
        if (analysisType === 'single') {
            analyzeSingleFolder(path, deviceType);
        } else if (analysisType === 'batch') {
            handleBatchAnalyze(path, deviceType);
        }
    };
    
    // Фокус на поле ввода
    setTimeout(() => {
        document.getElementById('analysisDeviceTypeInput').focus();
        document.getElementById('analysisDeviceTypeInput').select();
    }, 100);
}

// Закрыть модальное окно
window.closeAnalysisDeviceModal = function() {
    document.getElementById('analysisDeviceTypeModal').style.display = 'none';
};

// Analyze single folder (универсальная функция)
async function analyzeSingleFolder(folderPath, deviceType) {
    showLoading(true);
    
    try {
        showToast('📊 Анализ начат...', 'info');
        
        const config = {
            stabilityThreshold: state.settings.stabilityThreshold,
            turnTolerance: state.settings.turnTolerance,
            minStableLen: state.settings.minSegmentLength,
            maxOutliers: state.settings.maxOutliers,
            sumTolerance: state.settings.sumTolerance
        };
        
        let data;
        
        if (isWailsMode()) {
            // Wails Desktop
            console.log('🖥️ Wails API: AnalyzeCompass');
            data = await window.go.desktop.App.AnalyzeCompass(folderPath, config, deviceType);
        } else {
            // Web API
            console.log('🌐 Web API: /api/analyze');
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folderPath, config: config, deviceType: deviceType })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            data = await response.json();
        }
        
        if (!data.success) {
            throw new Error(data.errors ? data.errors.join(', ') : 'Неизвестная ошибка');
        }
        
        displayResults(data);
        
        // Сохраняем в историю (только в Wails режиме)
        if (isWailsMode()) {
            await saveToHistory(data, folderPath);
        }
        
        showToast('✅ Анализ завершен!', 'success');
    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Функция сохранения в историю
async function saveToHistory(analysisData, folderPath) {
    try {
        // Извлекаем имя папки из пути
        const compassName = analysisData.compass || folderPath.split(/[\/\\]/).pop() || 'Unknown';
        
        const historyItem = {
            id: '',  // Будет сгенерирован на бэкенде
            timestamp: Date.now(),
            compass: compassName,
            deviceType: analysisData.deviceType || 'Неизвестно',
            isValid: analysisData.isValid,
            turnsCount: analysisData.turns ? analysisData.turns.length : 0,
            anglesCount: analysisData.allAngles ? analysisData.allAngles.length : 0,
            fullData: JSON.stringify(analysisData)
        };
        
        // AddToHistory теперь возвращает ID!
        const createdID = await window.go.desktop.App.AddToHistory(historyItem);
        console.log('💾 Результат сохранен в историю, ID:', createdID);
        
        // Сохраняем ID в данных для возможности разрешения конфликта
        if (createdID && state.currentData) {
            state.currentData.historyItemID = createdID;
        }
    } catch (error) {
        console.error('Ошибка сохранения в историю:', error);
        // Не показываем ошибку пользователю, это не критично
    }
}

// Batch analyze (универсальная функция)
async function handleBatchAnalyze(dirInput, deviceType) {
    showLoading(true, 'Пакетный анализ...');
    
    try {
        const config = {
            stabilityThreshold: state.settings.stabilityThreshold,
            turnTolerance: state.settings.turnTolerance,
            minStableLen: state.settings.minSegmentLength,
            maxOutliers: state.settings.maxOutliers,
            sumTolerance: state.settings.sumTolerance
        };
        
        let results;
        
        if (isWailsMode()) {
            // Wails Desktop
            console.log('🖥️ Wails API: BatchAnalyze');
            results = await window.go.desktop.App.BatchAnalyze(dirInput, config, deviceType);
        } else {
            // Web API (fallback to non-streaming для простоты)
            console.log('🌐 Web API: /api/batch-analyze');
            const response = await fetch('/api/batch-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: dirInput, config: config, deviceType: deviceType })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            results = await response.json();
        }
        
        displayBatchResults(results);
        
        // Показываем результаты сразу, сохранение в фоне
        showToast(`✅ Обработано: ${results.length}`, 'success');
        
        // Сохраняем в историю в ФОНЕ (не блокируя UI)
        if (isWailsMode() && results && results.length > 0) {
            saveBatchToHistory(results, dirInput).then(() => {
                console.log('💾 Результаты сохранены в историю');
                showToast('💾 Результаты сохранены в историю', 'success');
            }).catch(err => {
                console.error('Ошибка сохранения в историю:', err);
            });
        }
    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Функция сохранения пакетных результатов в историю (ОПТИМИЗИРОВАНО)
async function saveBatchToHistory(results, baseDir) {
    try {
        // Подготавливаем все записи для пакетного сохранения
        const historyItems = [];
        
        for (const result of results) {
            if (result.success) {
                const compassName = result.compass || 'Unknown';
                
                historyItems.push({
                    id: '',  // Будет сгенерирован на бэкенде
                    timestamp: Date.now(),
                    compass: compassName,
                    deviceType: result.deviceType || 'Неизвестно',
                    isValid: result.isValid,
                    turnsCount: result.turns ? result.turns.length : 0,
                    anglesCount: result.allAngles ? result.allAngles.length : 0,
                    fullData: JSON.stringify(result)
                });
            }
        }
        
        if (historyItems.length > 0) {
            // Одна операция вместо тысяч!
            await window.go.desktop.App.AddManyToHistory(historyItems);
            console.log(`💾 Сохранено в историю: ${historyItems.length} записей за один раз`);
        }
    } catch (error) {
        console.error('Ошибка сохранения пакета в историю:', error);
    }
}

// Display results
function displayResults(data) {
    state.currentData = data;
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    // Обновляем заголовок с номером компаса
    const compassName = data.compass || 'Unknown';
    document.getElementById('page-title').textContent = `Анализ калибровки компаса: ${compassName}`;
    document.getElementById('page-subtitle').textContent = `Детальный просмотр результатов анализа`;
    
    // Обновляем информацию о типе устройства и номере ДСС
    const deviceType = data.deviceType || 'Не указано';
    document.getElementById('deviceTypeDisplay').textContent = deviceType;
    document.getElementById('compassNumberDisplay').textContent = compassName;
    
    // Сохраняем последние просмотренные данные для отображения после перезапуска
    localStorage.setItem('lastViewedCompass', compassName);
    localStorage.setItem('lastViewedDeviceType', deviceType);
    
    // Определяем статус
    let statusText, statusColor, iconName, iconClass;
    if (data.isValid) {
        statusText = '✓ Валидно';
        statusColor = 'var(--success)';
        iconName = 'check_circle';
        iconClass = 'success';
    } else {
        statusText = '✗ Не прошло';
        statusColor = 'var(--error)';
        iconName = 'cancel';
        iconClass = 'error';
    }
    
    // Обновляем иконку статуса
    const statIconEl = document.getElementById('statIcon');
    if (statIconEl) {
        statIconEl.textContent = iconName;
        statIconEl.className = `material-icons stat-icon ${iconClass}`;
    }
    
    const statValidEl = document.getElementById('statValid');
    statValidEl.textContent = statusText;
    statValidEl.style.color = statusColor;
    
    // Добавляем возможность изменения статуса по КЛИКУ (для ЛЮБОГО статуса!)
    console.log('🔧 displayResults: статус кликабельный, historyItemID:', data.historyItemID, 'resolvedByOperator:', data.resolvedByOperator);
    
    // Делаем статус кликабельным ВСЕГДА (и success, и failed можно изменить)
    if (true) {
        console.log('✅ Настройка клика для статуса, ID:', data.historyItemID);
        statValidEl.style.cursor = 'pointer';
        statValidEl.title = 'Нажмите для разрешения конфликта';
        
        // Удаляем старый обработчик - клонируем элемент
        const newStatValidEl = statValidEl.cloneNode(true);
        statValidEl.parentNode.replaceChild(newStatValidEl, statValidEl);
        
        // Получаем обновленную ссылку и добавляем обработчик КЛИКА (ЛКМ)
        const updatedStatValidEl = document.getElementById('statValid');
        const savedItemID = data.historyItemID; // Может быть undefined для новых анализов
        const savedData = data; // Сохраняем все данные
        
        updatedStatValidEl.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🔧 Клик на статусе, ID:', savedItemID);
            
            // Если нет ID - это новый анализ, нужно сначала сохранить в историю
            if (!savedItemID && isWailsMode()) {
                try {
                    showLoading(true, 'Сохранение в историю...');
                    
                    // Сохраняем в историю
                    const compassName = savedData.compass || 'Unknown';
                    
                    const historyItem = {
                        id: '',
                        timestamp: Date.now(),
                        compass: compassName,
                        deviceType: savedData.deviceType || 'Неизвестно',
                        isValid: savedData.isValid,
                        turnsCount: savedData.turns ? savedData.turns.length : 0,
                        anglesCount: savedData.allAngles ? savedData.allAngles.length : 0,
                        fullData: JSON.stringify(savedData)
                    };
                    
                    // AddToHistory теперь возвращает ID созданной записи!
                    const createdID = await window.go.desktop.App.AddToHistory(historyItem);
                    console.log('💾 Анализ сохранен в историю, получен ID:', createdID);
                    
                    if (createdID) {
                        savedData.historyItemID = createdID;
                        state.currentData.historyItemID = createdID; // Обновляем и в state
                        showLoading(false);
                        const statusMsg = savedData.isValid ? 'Текущий статус: Валидно' : 'Текущий статус: Не прошло';
                        openChangeStatusModal(createdID, statusMsg);
                    } else {
                        showLoading(false);
                        showToast('❌ Не удалось получить ID записи', 'error');
                    }
                } catch (error) {
                    showLoading(false);
                    console.error('Ошибка сохранения:', error);
                    showToast('❌ Ошибка сохранения в историю', 'error');
                }
            } else if (savedItemID) {
                // ID есть - просто открываем модальное окно
                const statusMsg = savedData.isValid ? 'Текущий статус: Валидно' : 'Текущий статус: Не прошло';
                openChangeStatusModal(savedItemID, statusMsg);
            }
        });
    } else {
        console.log('⚠️ Клик не настроен: нет warnings');
        statValidEl.style.cursor = 'default';
        statValidEl.title = '';
    }
    
    // Показываем плашку "Разрешено оператором" если применимо
    const operatorBadgeContainer = document.getElementById('operatorBadgeContainer');
    if (operatorBadgeContainer) {
        if (data.resolvedByOperator) {
            operatorBadgeContainer.style.display = 'block';
            operatorBadgeContainer.innerHTML = `
                <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: rgb(139, 92, 246); border: 1px solid rgba(139, 92, 246, 0.4); font-size: 0.875rem; padding: 0.5rem 1rem;">
                    <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 0.25rem;">verified</span>
                    Разрешено оператором
                </span>
            `;
            if (data.operatorComment) {
                operatorBadgeContainer.title = data.operatorComment;
            }
        } else {
            operatorBadgeContainer.style.display = 'none';
        }
    }
    document.getElementById('statTurns').textContent = data.turns ? data.turns.length : 0;
    document.getElementById('statSegments').textContent = data.segments ? data.segments.length : 0;
    document.getElementById('statAngles').textContent = data.allAngles ? data.allAngles.length : 0;
    
    displayTurnsTable(data.turns || []);
    
    // Автоматически устанавливаем диапазон графика по индексам поворотов
    let chartStart = 0;
    let chartEnd = data.allAngles ? data.allAngles.length - 1 : 0;
    
    if (data.turns && data.turns.length > 0) {
        // Определяем диапазон: от начала первого поворота до конца последнего
        const validTurns = data.turns.filter(t => t.startIndex !== undefined && t.endIndex !== undefined);
        if (validTurns.length > 0) {
            chartStart = Math.min(...validTurns.map(t => t.startIndex));
            chartEnd = Math.max(...validTurns.map(t => t.endIndex));
            
            // Добавляем небольшой отступ (5% от диапазона) для лучшей видимости
            const range = chartEnd - chartStart;
            const padding = Math.max(2, Math.floor(range * 0.05));
            chartStart = Math.max(0, chartStart - padding);
            chartEnd = Math.min((data.allAngles ? data.allAngles.length - 1 : 0), chartEnd + padding);
        }
    }
    
    displayPolarChart(data, chartStart, chartEnd);
    
    if (data.log) {
        document.getElementById('logViewer').textContent = data.log;
    }
    
    // Безопасная проверка на существование turns
    document.getElementById('turnsBadge').textContent = (data.turns && data.turns.length) || 0;
}

// Display turns table
function displayTurnsTable(turns) {
    const tbody = document.getElementById('turnsTableBody');
    
    if (!turns || !Array.isArray(turns) || turns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">info</span>Повороты не обнаружены</td></tr>';
        return;
    }
    
    tbody.innerHTML = turns.map((turn, index) => {
        const tolerance = state.settings.turnTolerance;
        const minAngle = 90 - tolerance;
        const maxAngle = 90 + tolerance;
        const diff = turn.diff || 0;
        
        let badgeClass, iconName, statusText;
        
        // Проверяем статус поворота (если он установлен алгоритмом)
        if (turn.status === 'failed') {
            // Красный - провал
            badgeClass = 'error';
            iconName = 'cancel';
            statusText = turn.warningReason || 'БРАК!';
        } else if (turn.status === 'success' || (diff >= minAngle && diff <= maxAngle)) {
            // Зеленый - успех
            badgeClass = 'success';
            iconName = 'check_circle';
            statusText = `В допуске`;
        } else if (diff >= minAngle - 5 && diff <= maxAngle + 5) {
            // Желтый - близко к границе
            badgeClass = 'warning';
            iconName = 'warning';
            statusText = `Близко к границе`;
        } else {
            // Красный - брак
            badgeClass = 'error';
            iconName = 'cancel';
            statusText = `БРАК!`;
        }
        
        // Желтый фон для предупреждений, красный для ошибок
        let bgStyle = '';
        if (badgeClass === 'error') {
            bgStyle = 'background: rgba(239, 68, 68, 0.1);';
        } else if (turn.status === 'warning') {
            bgStyle = 'background: rgba(251, 191, 36, 0.1);';
        }
        
        return `
            <tr style="${bgStyle}">
                <td><strong>#${index + 1}</strong></td>
                <td><code style="font-size: 0.875rem; color: var(--text-secondary);">${turn.startIndex || 0}–${turn.endIndex || 0}</code></td>
                <td>${(turn.startAngle || 0).toFixed(2)}°</td>
                <td>${(turn.endAngle || 0).toFixed(2)}°</td>
                <td><span class="badge ${badgeClass}">${diff.toFixed(2)}°</span></td>
                <td><span class="material-icons" title="${statusText}">${iconName}</span></td>
            </tr>
        `;
    }).join('');
}

// Display polar chart
function displayPolarChart(data, startIndex = null, endIndex = null) {
    const ctx = document.getElementById('polarChart');
    
    if (state.chart) state.chart.destroy();
    
    // Сохраняем полные данные для возможности изменения диапазона
    state.currentChartData = data;
    
    // Безопасная проверка данных
    const allAngles = (data && data.allAngles && Array.isArray(data.allAngles)) ? data.allAngles : [];
    const turns = (data && data.turns && Array.isArray(data.turns)) ? data.turns : [];
    
    if (allAngles.length === 0) {
        // Нет данных для отображения
        const canvas = document.getElementById('polarChart');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.font = '16px Arial';
        context.fillStyle = '#999';
        context.textAlign = 'center';
        context.fillText('Нет данных для отображения графика', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Определяем диапазон
    const start = startIndex !== null ? startIndex : 0;
    const end = endIndex !== null ? endIndex : allAngles.length - 1;
    
    // Обновляем поля ввода
    document.getElementById('chartStartIndex').value = start;
    document.getElementById('chartEndIndex').value = end;
    document.getElementById('chartStartIndex').max = allAngles.length - 1;
    document.getElementById('chartEndIndex').max = allAngles.length - 1;
    
    // Основные данные (с учетом диапазона)
    const angleData = allAngles
        .map((angle, index) => ({ x: index, y: angle }))
        .filter(point => point.x >= start && point.x <= end);
    
    // Создаем датасеты для подсветки поворотов
    const datasets = [{
        label: 'Все углы',
        data: angleData,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        pointRadius: 3,
        pointHoverRadius: 5
    }];
    
    // Добавляем датасеты для каждого поворота (подсветка, с учетом диапазона)
    if (turns.length > 0) {
        const colors = [
            'rgba(239, 68, 68, 0.8)',   // Красный
            'rgba(34, 197, 94, 0.8)',   // Зеленый
            'rgba(251, 191, 36, 0.8)',  // Желтый
            'rgba(147, 51, 234, 0.8)'   // Фиолетовый
        ];
        
        turns.forEach((turn, index) => {
            const turnData = [];
            // Учитываем диапазон при построении поворотов
            const turnStart = Math.max(turn.startIndex, start);
            const turnEnd = Math.min(turn.endIndex, end);
            
            for (let i = turnStart; i <= turnEnd && i < allAngles.length; i++) {
                turnData.push({
                    x: i,
                    y: allAngles[i]
                });
            }
            
            if (turnData.length > 0) {
                datasets.push({
                    label: `Поворот ${index + 1}`,
                    data: turnData,
                    backgroundColor: colors[index % colors.length],
                    borderColor: colors[index % colors.length],
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    showLine: true,
                    borderWidth: 2
                });
            }
        });
    }
    
    state.chart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].parsed.x;
                            const angle = context[0].parsed.y;
                            return `Угол: ${angle.toFixed(2)}°`;
                        },
                        label: function(context) {
                            const index = context.parsed.x;
                            return `Индекс: ${index}`;
                        }
                    }
                },
                zoom: {
                    pan: { enabled: true, mode: 'xy' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Индекс' } },
                y: { title: { display: true, text: 'Угол (°)' }, min: 0, max: 360 }
            }
        }
    });
}

// Display batch results
function displayBatchResults(results, applyFilters = false) {
    const container = document.getElementById('batchResults');
    container.style.display = 'block';
    
    state.batchResults = results;
    
    let filteredResults = [...results];
    
    // Применяем фильтры если нужно
    if (applyFilters) {
        filteredResults = applyBatchFilters(results);
    }
    
    // Сохраняем отфильтрованные данные для навигации
    state.batchFiltered = filteredResults;
    
    // Подсчет статусов с учетом warning (по отфильтрованным)
    const successCount = filteredResults.filter(r => r.isValid).length;
    const failedCount = filteredResults.filter(r => !r.isValid).length;
    
    document.getElementById('batchSuccess').textContent = successCount;
    document.getElementById('batchFailed').textContent = failedCount;
    document.getElementById('batchTotal').textContent = filteredResults.length;
    
    const tbody = document.getElementById('batchResultsBody');
    tbody.innerHTML = filteredResults.map((result, index) => {
        // Определяем badge
        let badgeClass, badgeText;
        if (result.isValid) {
            badgeClass = 'success';
            badgeText = '✓ Успешно';
        } else {
            badgeClass = 'error';
            badgeText = '✗ Ошибка';
        }
        
        // Находим исходный индекс в state.batchResults для корректного viewBatchResult
        const originalIndex = state.batchResults.findIndex(r => r.compass === result.compass);
        
        // Все строки кликабельны (и success, и failed можно изменить)
        const rowAttrs = `data-batch-index="${originalIndex}" style="cursor: pointer;"`;
        
        return `
        <tr ${rowAttrs}>
            <td><strong>${index + 1}</strong></td>
            <td><strong>${result.compass}</strong></td>
            <td>${result.deviceType || 'Неизвестно'}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${result.turns ? result.turns.length : 0}/4</td>
            <td>
                <button class="btn-icon" onclick="viewBatchResult(${originalIndex})" title="Детальный просмотр">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        </tr>
    `;
    }).join('');
    
    // Добавляем обработчики клика для ВСЕХ строк (можно менять статус)
    setTimeout(() => {
        const allRows = tbody.querySelectorAll('tr[data-batch-index]');
        console.log(`🔧 Пакетный анализ: найдено строк: ${allRows.length}`);
        allRows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Игнорируем клик на кнопку просмотра
                if (e.target.closest('.btn-icon')) {
                    return;
                }
                
                const batchIndex = parseInt(row.getAttribute('data-batch-index'));
                console.log('🔧 Клик на строке пакетного анализа, индекс:', batchIndex);
                
                if (isNaN(batchIndex) || !state.batchResults[batchIndex]) {
                    showToast('⚠️ Ошибка: результат не найден', 'error');
                    return;
                }
                
                // Открываем детальный просмотр - там уже будет работать клик на статус
                viewBatchResult(batchIndex);
            });
        });
    }, 100);
}

// Функция фильтрации и сортировки пакетного анализа
function applyBatchFilters(results) {
    let filtered = [...results];
    
    // Поиск по номеру компаса
    const searchQuery = document.getElementById('batchSearchInput').value.trim().toLowerCase();
    if (searchQuery) {
        filtered = filtered.filter(item => 
            item.compass.toLowerCase().includes(searchQuery)
        );
        
        // ПРИОРИТЕТ: Точное совпадение первым!
        filtered.sort((a, b) => {
            const aLower = a.compass.toLowerCase();
            const bLower = b.compass.toLowerCase();
            const aExact = aLower === searchQuery;
            const bExact = bLower === searchQuery;
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            const aStarts = aLower.startsWith(searchQuery);
            const bStarts = bLower.startsWith(searchQuery);
            
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return compareCompassNames(a.compass, b.compass);
        });
    }
    
    // Фильтр по статусу
    const statusFilter = document.getElementById('batchFilterStatus').value;
    if (statusFilter === 'success') {
        filtered = filtered.filter(item => item.isValid);
    } else if (statusFilter === 'failed') {
        filtered = filtered.filter(item => !item.isValid);
    }
    
    // Сортировка (если не было поиска)
    if (!searchQuery) {
        const sortBy = document.getElementById('batchSort').value;
        
        switch (sortBy) {
            case 'name-asc':
                filtered.sort((a, b) => compareCompassNames(a.compass, b.compass));
                break;
            case 'name-desc':
                filtered.sort((a, b) => compareCompassNames(b.compass, a.compass));
                break;
            case 'status-failed':
                filtered.sort((a, b) => {
                    const aFailed = !a.isValid;
                    const bFailed = !b.isValid;
                    if (aFailed && !bFailed) return -1;
                    if (!aFailed && bFailed) return 1;
                    return compareCompassNames(a.compass, b.compass);
                });
                break;
            case 'status-success':
                filtered.sort((a, b) => {
                    const aSuccess = a.isValid;
                    const bSuccess = b.isValid;
                    if (aSuccess && !bSuccess) return -1;
                    if (!aSuccess && bSuccess) return 1;
                    return compareCompassNames(a.compass, b.compass);
                });
                break;
        }
    }
    
    return filtered;
}

// Просмотр результата из пакетного анализа (глобальная функция для onclick)
window.viewBatchResult = function(index, skipNavUpdate = false) {
    try {
        console.log('🔍 Запрос просмотра результата:', index);
        
        if (!state.batchResults || !Array.isArray(state.batchResults)) {
            console.error('❌ Результаты пакетного анализа не загружены');
            showToast('⚠️ Результаты пакетного анализа не найдены', 'warning');
            return;
        }
        
        if (index < 0 || index >= state.batchResults.length) {
            console.error('❌ Неверный индекс:', index, 'из', state.batchResults.length);
            showToast('⚠️ Результат не найден (неверный индекс)', 'warning');
            return;
        }
        
        const result = state.batchResults[index];
        console.log('📊 Результат найден:', result);
        
        if (!result) {
            showToast('⚠️ Результат не найден', 'warning');
            return;
        }
        
        if (!result.success) {
            showToast('⚠️ Этот анализ завершился с ошибкой', 'warning');
            return;
        }
        
        console.log('📊 Просмотр из пакетного анализа:', result.compass);
        
        // Настраиваем навигацию (только при первом открытии)
        // Используем отфильтрованные данные если есть, иначе все данные
        if (!skipNavUpdate) {
            // Очищаем кэш истории при переключении на пакетный анализ
            if (state.navigationSource === 'history') {
                state.preloadedHistory.clear();
                console.log('🧹 Кэш истории очищен (переключение на пакетный анализ)');
            }
            
            const batchSource = state.batchFiltered || state.batchResults || [];
            state.navigationSource = 'batch';
            // Находим индексы успешных результатов в ИСХОДНОМ массиве state.batchResults
            state.navigationList = batchSource
                .filter(r => r.success)
                .map(r => state.batchResults.findIndex(orig => orig.compass === r.compass && orig.deviceType === r.deviceType));
            state.navigationIndex = state.navigationList.indexOf(index);
            console.log(`🧭 Навигация: пакет, позиция ${state.navigationIndex + 1}/${state.navigationList.length} (отфильтровано: ${state.batchFiltered ? 'да' : 'нет'})`);
        }
        
        // Отображаем результаты как обычный анализ
        displayResults(result);
        updateNavigationUI();
        switchPage('analyze');
        showToast(`📊 Просмотр результата: ${result.compass}`, 'info');
        
    } catch (error) {
        console.error('❌ Ошибка при просмотре результата:', error);
        showToast(`Ошибка: ${error.message || error}`, 'error');
    }
};

// Settings
function initSettingsPage() {
    updateSettingsFields();
    
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const newSettings = {
            stabilityThreshold: parseFloat(document.getElementById('setting-stability').value),
            turnTolerance: parseFloat(document.getElementById('setting-tolerance').value),
            minSegmentLength: parseInt(document.getElementById('setting-minLength').value),
            maxOutliers: parseInt(document.getElementById('setting-outliers').value),
            sumTolerance: parseFloat(document.getElementById('setting-sumTolerance').value)
        };
        
        saveSettings(newSettings);
        updateSettingsPreview();
        showToast('✅ Настройки сохранены!', 'success');
    });
    
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
        if (confirm('Сбросить настройки?')) {
            saveSettings({...DEFAULT_SETTINGS});
            updateSettingsFields();
            showToast('♻️ Настройки сброшены', 'info');
        }
    });
    
    ['setting-stability', 'setting-tolerance', 'setting-minLength', 'setting-outliers', 'setting-sumTolerance'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSettingsPreview);
    });
}

function updateSettingsFields() {
    const s = state.settings || DEFAULT_SETTINGS;
    document.getElementById('setting-stability').value = s.stabilityThreshold;
    document.getElementById('setting-tolerance').value = s.turnTolerance;
    document.getElementById('setting-minLength').value = s.minSegmentLength;
    document.getElementById('setting-outliers').value = s.maxOutliers;
    document.getElementById('setting-sumTolerance').value = s.sumTolerance;
    updateSettingsPreview();
}

function updateSettingsPreview() {
    document.getElementById('preview-stability').textContent = document.getElementById('setting-stability').value + '°';
    document.getElementById('preview-tolerance').textContent = '±' + document.getElementById('setting-tolerance').value + '°';
    document.getElementById('preview-sumTolerance').textContent = '±' + document.getElementById('setting-sumTolerance').value + '°';
    document.getElementById('preview-minLength').textContent = document.getElementById('setting-minLength').value;
    document.getElementById('preview-outliers').textContent = document.getElementById('setting-outliers').value;
}

// Utilities
function showLoading(show, message = 'Загрузка...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
    overlay.querySelector('.loading-text').textContent = message;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    toast.innerHTML = `<span class="material-icons">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function copyLog() {
    const logContent = document.getElementById('logViewer').textContent;
    navigator.clipboard.writeText(logContent).then(() => showToast('📋 Лог скопирован', 'success'));
}

async function exportResults() {
    if (!state.currentData) {
        showToast('⚠️ Нет данных', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(state.currentData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const compass = state.currentData.compass || 'Unknown';
    const filename = `compass_analysis_${compass}_${timestamp}.json`;
    
    if (isWailsMode()) {
        try {
            // Сохраняем через Go backend в папку "Export Results JSON"
            const savedDir = localStorage.getItem('lastExportDir') || '';
            const savedPath = await window.go.desktop.App.SaveExportFile(dataStr, filename, 'json', savedDir);
            showToast(`📁 Сохранено: ${savedPath}`, 'success');
            console.log('✅ JSON сохранен:', savedPath);
        } catch (error) {
            console.error('Ошибка сохранения через backend:', error);
            // Fallback - обычное скачивание
            downloadFileDirectly(dataStr, filename, 'application/json');
        }
    } else {
        // В веб-режиме - обычное скачивание
        downloadFileDirectly(dataStr, filename, 'application/json');
    }
}

function exportResultsCSV() {
    console.log('📊 Экспорт CSV:', {
        currentPage: state.currentPage,
        hasBatchResults: !!state.batchResults,
        hasHistoryData: !!state.historyDataFull,
        hasCurrentData: !!state.currentData
    });
    
    // Определяем контекст - откуда экспортируем
    const currentPage = state.currentPage;
    
    if (currentPage === 'batch' && state.batchResults && state.batchResults.length > 0) {
        // Экспорт из пакетного анализа - ВСЕ результаты
        console.log('→ Экспорт пакетного анализа:', state.batchResults.length);
        exportBatchCSV(state.batchResults);
    } else if (currentPage === 'history' && state.historyDataFull && state.historyDataFull.length > 0) {
        // Экспорт из истории - ВСЕ записи (учитывая фильтры)
        console.log('→ Экспорт из истории');
        exportHistoryCSV();
    } else if (state.currentData) {
        // Экспорт текущего анализа - ОДИН файл
        console.log('→ Экспорт текущего анализа:', state.currentData.compass);
        exportSingleCSV(state.currentData);
    } else {
        console.warn('⚠️ Нет данных для экспорта. State:', state);
        showToast('⚠️ Нет данных для экспорта', 'warning');
    }
}

// Открыть модальное окно экспорта
function openDeviceTypeModal(exportType, data) {
    const modal = document.getElementById('deviceTypeModal');
    modal.style.display = 'flex';
    
    // Подсчет количества записей
    let count = 1;
    if (exportType === 'batch') {
        count = data.length;
    } else if (exportType === 'history') {
        const filtered = applyHistoryFilters(data);
        count = filtered.length;
    }
    
    document.getElementById('exportCount').textContent = count;
    
    // Загружаем последнюю директорию экспорта
    const savedDir = localStorage.getItem('lastExportDir');
    document.getElementById('exportDirInput').value = savedDir || '(рядом с программой)';
    
    // Обработчик кнопки выбора директории
    const selectDirBtn = document.getElementById('selectExportDirBtn');
    selectDirBtn.onclick = async () => {
        if (!isWailsMode()) {
            showToast('⚠️ Доступно только в Desktop режиме', 'warning');
            return;
        }
        
        try {
            const result = await window.go.desktop.App.SelectDirectory('Выберите директорию для экспорта');
            if (result) {
                document.getElementById('exportDirInput').value = result;
                localStorage.setItem('lastExportDir', result);
                showToast('📁 Директория выбрана', 'success');
            }
        } catch (error) {
            console.error('Ошибка выбора директории:', error);
            showToast(`❌ Ошибка: ${error.message || error}`, 'error');
        }
    };
    
    // Сохраняем exportType и data для использования
    modal.dataset.exportType = exportType;
    
    // Устанавливаем обработчик кнопки подтверждения
    const confirmBtn = document.getElementById('confirmExportBtn');
    confirmBtn.onclick = () => {
        const exportDir = document.getElementById('exportDirInput').value;
        const customDir = (exportDir && exportDir !== '(рядом с программой)') ? exportDir : null;
        
        closeDeviceTypeModal();
        
        // Выполняем экспорт (тип устройства берется из данных)
        if (exportType === 'single') {
            executeSingleExport(data, customDir);
        } else if (exportType === 'batch') {
            executeBatchExport(data, customDir);
        } else if (exportType === 'history') {
            executeHistoryExport(data, customDir);
        }
    };
}

// Закрыть модальное окно (глобальная функция для onclick)
window.closeDeviceTypeModal = function() {
    document.getElementById('deviceTypeModal').style.display = 'none';
};

// Экспорт одного анализа
function exportSingleCSV(data) {
    openDeviceTypeModal('single', data);
}

function executeSingleExport(data, customDir) {
    // Берем тип устройства из данных анализа
    const deviceType = data.deviceType || 'Неизвестно';
    
    let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4;Комментарии\n';
    
    const dss = data.compass || 'Unknown';
    const status = data.isValid ? 'Успешно' : 'Не прошло';
    const turnsCount = data.turns ? data.turns.length : 0;
    const angles = ['', '', '', ''];
    
    if (data.turns) {
        for (let i = 0; i < Math.min(4, data.turns.length); i++) {
            const t = data.turns[i];
            angles[i] = t.diff ? t.diff.toFixed(2) + '°' : '-';
        }
    }
    
    // Комментарий оператора
    const comment = data.resolvedByOperator ? (data.operatorComment || 'Изменено оператором') : '';
    
    csv += `${dss};${deviceType};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]};${comment}\n`;
    
    downloadCSV(csv, `Результаты калибровки "${deviceType}"`, dss, customDir);
    showToast('📥 Файл экспортирован', 'success');
}

// Экспорт пакетного анализа (все результаты)
function exportBatchCSV(results) {
    openDeviceTypeModal('batch', results);
}

function executeBatchExport(results, customDir) {
    // Берем тип устройства из первого результата (все должны иметь один тип)
    const deviceType = (results[0] && results[0].deviceType) || 'Неизвестно';
    
    let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4;Комментарии\n';
    
    results.forEach(result => {
        if (result.success) {
            const dss = result.compass || 'Unknown';
            const type = result.deviceType || 'Неизвестно';
            const status = result.isValid ? 'Успешно' : 'Не прошло';
            const turnsCount = result.turns ? result.turns.length : 0;
            const angles = ['', '', '', ''];
            
            if (result.turns) {
                for (let i = 0; i < Math.min(4, result.turns.length); i++) {
                    const t = result.turns[i];
                    angles[i] = t.diff ? t.diff.toFixed(2) + '°' : '-';
                }
            }
            
            // Комментарий оператора
            const comment = result.resolvedByOperator ? (result.operatorComment || 'Изменено оператором') : '';
            
            csv += `${dss};${type};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]};${comment}\n`;
        }
    });
    
    downloadCSV(csv, `Результаты калибровки "${deviceType}"`, 'batch', customDir);
    showToast(`📥 Экспортировано: ${results.length} записей`, 'success');
}

// Экспорт из истории
function exportHistoryCSV() {
    if (!state.historyDataFull) {
        showToast('⚠️ Нет данных для экспорта', 'warning');
        return;
    }
    
    openDeviceTypeModal('history', state.historyDataFull);
}

async function executeHistoryExport(historyData, customDir) {
    showLoading(true, 'Подготовка CSV...');
    
    try {
        // Применяем текущие фильтры
        const filteredData = applyHistoryFilters(historyData);
        
        // Определяем тип устройства для названия файла
        // Если все одного типа - используем его, если разные - "Смешанные"
        const deviceTypes = new Set(filteredData.map(item => item.deviceType || 'Неизвестно'));
        const deviceType = deviceTypes.size === 1 ? Array.from(deviceTypes)[0] : 'Смешанные';
        
        let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4;Комментарии\n';
        
        // ОПТИМИЗАЦИЯ: Загружаем ВСЕ записи ОДНИМ запросом
        const itemIDs = filteredData.map(item => item.id);
        const fullItems = await window.go.desktop.App.LoadHistoryItems(itemIDs);
        
        // Обрабатываем загруженные данные
        fullItems.forEach(fullHistory => {
            const fullData = JSON.parse(fullHistory.fullData);
            
            const dss = fullData.compass || fullHistory.compass || 'Unknown';
            const type = fullData.deviceType || fullHistory.deviceType || 'Неизвестно';
            const status = fullData.isValid ? 'Успешно' : 'Не прошло';
            const turnsCount = fullData.turns ? fullData.turns.length : 0;
            const angles = ['', '', '', ''];
            
            if (fullData.turns) {
                for (let i = 0; i < Math.min(4, fullData.turns.length); i++) {
                    const t = fullData.turns[i];
                    angles[i] = t.diff ? t.diff.toFixed(2) + '°' : '-';
                }
            }
            
            // Комментарий оператора
            const comment = fullData.resolvedByOperator ? (fullData.operatorComment || 'Изменено оператором') : '';
            
            csv += `${dss};${type};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]};${comment}\n`;
        });
        
        downloadCSV(csv, `Результаты калибровки "${deviceType}"`, 'history', customDir);
        showToast(`📥 Экспортировано: ${filteredData.length} записей`, 'success');
        
    } catch (error) {
        console.error('Ошибка экспорта истории:', error);
        showToast('❌ Ошибка экспорта', 'error');
    } finally {
        showLoading(false);
    }
}

// Вспомогательная функция загрузки CSV (сохранение в папку)
async function downloadCSV(csvContent, filePrefix, suffix, customDir = null) {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${filePrefix}_${timestamp}_${suffix}.csv`;
    
    if (isWailsMode()) {
        try {
            // Сохраняем через Go backend
            const savedPath = await window.go.desktop.App.SaveExportFile(csvContent, filename, 'csv', customDir || '');
            showToast(`📁 Сохранено: ${savedPath}`, 'success');
            console.log('✅ CSV сохранен:', savedPath);
        } catch (error) {
            console.error('Ошибка сохранения через backend:', error);
            // Fallback - обычное скачивание
            downloadFileDirectly(csvContent, filename, 'text/csv;charset=utf-8;');
        }
    } else {
        // В веб-режиме - обычное скачивание
        downloadFileDirectly(csvContent, filename, 'text/csv;charset=utf-8;');
    }
}

// Прямое скачивание файла (fallback)
function downloadFileDirectly(content, filename, mimeType) {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Chart zoom reset and range controls
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('resetChartZoom');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (state.chart) {
                state.chart.resetZoom();
                showToast('♻️ Зум сброшен', 'info');
            }
        });
    }
    
    // Применить диапазон индексов
    const applyRangeBtn = document.getElementById('applyChartRange');
    if (applyRangeBtn) {
        applyRangeBtn.addEventListener('click', () => {
            if (!state.currentChartData) {
                showToast('⚠️ Нет данных для отображения', 'warning');
                return;
            }
            
            const startIndex = parseInt(document.getElementById('chartStartIndex').value);
            const endIndex = parseInt(document.getElementById('chartEndIndex').value);
            
            if (isNaN(startIndex) || isNaN(endIndex)) {
                showToast('⚠️ Укажите корректные индексы', 'warning');
                return;
            }
            
            if (startIndex >= endIndex) {
                showToast('⚠️ Начальный индекс должен быть меньше конечного', 'warning');
                return;
            }
            
            if (startIndex < 0 || endIndex >= state.currentChartData.allAngles.length) {
                showToast(`⚠️ Индексы должны быть от 0 до ${state.currentChartData.allAngles.length - 1}`, 'warning');
                return;
            }
            
            displayPolarChart(state.currentChartData, startIndex, endIndex);
            showToast(`📊 Отображен диапазон: ${startIndex} - ${endIndex}`, 'success');
        });
    }
    
    // Сбросить диапазон (показать все)
    const resetRangeBtn = document.getElementById('resetChartRange');
    if (resetRangeBtn) {
        resetRangeBtn.addEventListener('click', () => {
            if (!state.currentChartData) {
                showToast('⚠️ Нет данных для отображения', 'warning');
                return;
            }
            
            displayPolarChart(state.currentChartData);
            showToast('♻️ Показаны все данные', 'info');
        });
    }
});

// Стили для badge.error
const style = document.createElement('style');
style.textContent = `.badge.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }`;
document.head.appendChild(style);

// ============================================================================
// ФИЛЬТРЫ ПАКЕТНОГО АНАЛИЗА
// ============================================================================

// Обработчики кнопок фильтров пакетного анализа
document.addEventListener('DOMContentLoaded', () => {
    const applyFiltersBtn = document.getElementById('applyBatchFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            if (state.batchResults) {
                displayBatchResults(state.batchResults, true);
                showToast('🔍 Фильтры применены', 'success');
            } else {
                showToast('⚠️ Нет данных для фильтрации', 'warning');
            }
        });
    }
    
    const resetFiltersBtn = document.getElementById('resetBatchFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            document.getElementById('batchSearchInput').value = '';
            document.getElementById('batchFilterStatus').value = 'all';
            document.getElementById('batchSort').value = 'name-asc';
            
            if (state.batchResults) {
                displayBatchResults(state.batchResults, false);
                showToast('♻️ Фильтры сброшены', 'info');
            }
        });
    }
});

// ============================================================================
// ИСТОРИЯ АНАЛИЗОВ
// ============================================================================

// Загрузка истории (ОПТИМИЗИРОВАНО - только метаданные)
async function loadHistory() {
    if (!isWailsMode()) {
        const tbody = document.getElementById('historyTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <span class="material-icons">info</span>
                        История доступна только в Desktop режиме
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    try {
        // Загружаем ТОЛЬКО метаданные (БЕЗ fullData) - экономия памяти!
        const history = await window.go.desktop.App.LoadHistoryMetadata();
        
        // Обновляем список типов устройств для фильтра
        updateDeviceTypeFilter(history);
        
        displayHistory(history || []);
        
        console.log(`✅ История загружена: ${history.length} записей (экономия памяти!)`);
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showToast('❌ Ошибка загрузки истории', 'error');
        
        const tbody = document.getElementById('historyTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <span class="material-icons">error</span>
                        Ошибка загрузки истории
                    </td>
                </tr>
            `;
        }
    }
}

// Обновить список типов устройств в фильтре
function updateDeviceTypeFilter(history) {
    const select = document.getElementById('historyFilterDeviceType');
    if (!select) return;
    
    // Получаем уникальные типы устройств
    const deviceTypes = [...new Set(history.map(item => item.deviceType || 'Неизвестно'))];
    deviceTypes.sort();
    
    // Обновляем опции
    select.innerHTML = '<option value="all">Все типы</option>';
    deviceTypes.forEach(type => {
        select.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

// Отображение истории (ОПТИМИЗИРОВАНО - без fullData)
function displayHistory(history, applyFilters = false) {
    const tbody = document.getElementById('historyTableBody');
    
    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <span class="material-icons">history</span>
                    История пуста
                </td>
            </tr>
        `;
        
        document.getElementById('historySuccess').textContent = '0';
        document.getElementById('historyFailed').textContent = '0';
        document.getElementById('historyTotal').textContent = '0';
        return;
    }
    
    let filteredHistory = [...history];
    
    // Применяем фильтры если нужно
    if (applyFilters) {
        filteredHistory = applyHistoryFilters(history);
    }
    
    // Сохраняем отфильтрованные данные для навигации
    state.historyFiltered = filteredHistory;
    
    // Статистика (по отфильтрованным данным)
    const successCount = filteredHistory.filter(h => h.isValid).length;
    const failedCount = filteredHistory.filter(h => !h.isValid).length;
    
    document.getElementById('historySuccess').textContent = successCount;
    document.getElementById('historyFailed').textContent = failedCount;
    document.getElementById('historyTotal').textContent = filteredHistory.length;
    
    // Таблица - сохраняем только метаданные (БЕЗ fullData!)
    tbody.innerHTML = filteredHistory.map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Определяем статус
        let badgeClass, badgeText;
        if (item.isValid) {
            badgeClass = 'success';
            badgeText = '✓ Валидно';
        } else {
            badgeClass = 'error';
            badgeText = '✗ Не прошло';
        }
        
        // Все строки кликабельны (TRIM для безопасности!)
        const cleanID = (item.id || '').trim();
        const dataAttrs = `data-item-id="${cleanID}" style="cursor: pointer;"`;
        
        return `
            <tr ${dataAttrs}>
                <td><strong>${index + 1}</strong></td>
                <td>${dateStr} ${timeStr}</td>
                <td><strong>${item.compass}</strong></td>
                <td>${item.deviceType || 'Неизвестно'}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>${item.turnsCount}/4</td>
                <td>
                    <button class="btn-icon" onclick="viewHistoryItem('${item.id}')" title="Просмотреть">
                        <span class="material-icons">visibility</span>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteHistoryItem('${item.id}')" title="Удалить запись">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Добавляем обработчики КЛИКА (ЛКМ) для ВСЕХ строк
    setTimeout(() => {
        const allRows = tbody.querySelectorAll('tr[data-item-id]');
        console.log(`🔧 Найдено строк: ${allRows.length}`);
        allRows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Игнорируем клик на кнопку просмотра
                if (e.target.closest('.btn-icon')) {
                    return;
                }
                
                const itemID = row.getAttribute('data-item-id');
                console.log('🔧 Клик на строке, ID:', itemID);
                if (!itemID) {
                    showToast('⚠️ Ошибка: ID записи не найден', 'error');
                    return;
                }
                openChangeStatusModal(itemID, 'Проверьте данные и подтвердите статус');
            });
        });
    }, 100);
    
    // Сохраняем только метаданные (БЕЗ fullData - экономия памяти!)
    state.historyData = history.map(item => ({
        id: item.id,
        compass: item.compass,
        deviceType: item.deviceType,
        timestamp: item.timestamp,
        isValid: item.isValid,
        turnsCount: item.turnsCount,
        anglesCount: item.anglesCount
        // fullData НЕ сохраняем! Загрузим при просмотре
    }));
    
    // Сохраняем полные данные для фильтрации
    state.historyDataFull = history;
    
    console.log(`📊 История загружена: ${history.length} записей, показано: ${filteredHistory.length} (БЕЗ fullData)`);
}

// Предзагрузка данных истории (скользящее окно)
async function preloadHistoryItems(currentIndex, itemIds) {
    if (!isWailsMode() || !window.go?.desktop?.App) {
        return;
    }
    
    const radius = state.preloadRadius;
    const startIndex = Math.max(0, currentIndex - radius);
    const endIndex = Math.min(itemIds.length, currentIndex + radius + 1);
    
    // Определяем какие ID нужно загрузить
    const idsToLoad = [];
    for (let i = startIndex; i < endIndex; i++) {
        const itemId = itemIds[i];
        if (itemId && !state.preloadedHistory.has(itemId)) {
            idsToLoad.push(itemId);
        }
    }
    
    if (idsToLoad.length === 0) {
        console.log(`📦 Предзагрузка: все данные уже в памяти (${state.preloadedHistory.size} записей)`);
        return;
    }
    
    console.log(`📦 Предзагрузка ${idsToLoad.length} записей (окно: ${startIndex}-${endIndex}, всего: ${itemIds.length})`);
    
    try {
        // Загружаем множество записей за один раз
        const items = await window.go.desktop.App.LoadHistoryItems(idsToLoad);
        
        // Парсим и сохраняем в память
        for (const item of items) {
            if (item.fullData) {
                try {
                    const fullData = typeof item.fullData === 'string' ? JSON.parse(item.fullData) : item.fullData;
                    fullData.historyItemID = item.id;
                    state.preloadedHistory.set(item.id, fullData);
                } catch (parseError) {
                    console.error(`⚠️ Ошибка парсинга данных для ${item.id}:`, parseError);
                }
            }
        }
        
        console.log(`✅ Предзагружено ${items.length} записей, всего в памяти: ${state.preloadedHistory.size}`);
        
        // Очищаем старые данные если превышен лимит (скользящее окно)
        if (state.preloadedHistory.size > state.preloadWindowSize) {
            const sortedIds = Array.from(state.preloadedHistory.keys());
            const currentIdIndex = sortedIds.indexOf(itemIds[currentIndex]);
            
            // Удаляем самые дальние записи
            const toRemove = sortedIds.length - state.preloadWindowSize;
            for (let i = 0; i < toRemove; i++) {
                // Удаляем самые дальние от текущей позиции
                let farthestId = null;
                let farthestDistance = -1;
                
                for (const id of state.preloadedHistory.keys()) {
                    const idIndex = itemIds.indexOf(id);
                    if (idIndex !== -1) {
                        const distance = Math.abs(idIndex - currentIndex);
                        if (distance > farthestDistance) {
                            farthestDistance = distance;
                            farthestId = id;
                        }
                    }
                }
                
                if (farthestId) {
                    state.preloadedHistory.delete(farthestId);
                    console.log(`🗑️ Удалена из памяти дальняя запись: ${farthestId}`);
                }
            }
            
            console.log(`🧹 Очистка памяти: ${state.preloadedHistory.size} записей осталось`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка предзагрузки:', error);
        // Не показываем ошибку пользователю, это фоновая операция
    }
}

// Просмотр элемента истории (ОПТИМИЗИРОВАНО - с предзагрузкой и скользящим окном)
window.viewHistoryItem = async function(itemId, skipNavUpdate = false) {
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    // Проверяем наличие Go API
    if (!window.go || !window.go.desktop || !window.go.desktop.App) {
        showToast('⚠️ Go API не доступен. Пожалуйста, перезапустите приложение.', 'error');
        return;
    }
    
    // Проверяем предзагруженные данные
    let fullData = state.preloadedHistory.get(itemId);
    
    if (fullData) {
        // Данные уже в памяти - используем их мгновенно
        console.log(`⚡ Запись ${itemId} загружена из памяти (быстро!)`);
        showLoading(false);
    } else {
        // Данных нет - загружаем с диска
        showLoading(true, 'Загрузка данных из истории...');
        try {
            console.log(`🔍 Загрузка записи с диска: ${itemId}`);
            const item = await window.go.desktop.App.LoadHistoryItem(itemId);
            
            if (!item) {
                throw new Error('Запись не найдена');
            }
            
            if (!item.fullData) {
                throw new Error('Данные записи повреждены');
            }
            
            // Парсим fullData с проверкой
            try {
                fullData = typeof item.fullData === 'string' ? JSON.parse(item.fullData) : item.fullData;
            } catch (parseError) {
                console.error('Ошибка парсинга fullData:', parseError);
                throw new Error('Не удалось прочитать данные анализа');
            }
            
            // Сохраняем в память для будущего использования
            fullData.historyItemID = itemId;
            state.preloadedHistory.set(itemId, fullData);
            console.log(`✅ Загружена запись для ${item.compass} и сохранена в память`);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из истории:', error);
            showToast(`Ошибка загрузки: ${error.message}`, 'error');
            showLoading(false);
            return;
        } finally {
            showLoading(false);
        }
    }
    
    // Настраиваем навигацию (только при первом открытии, не при переключении)
    if (!skipNavUpdate) {
        // Очищаем кэш при переключении с пакетного анализа на историю
        if (state.navigationSource === 'batch') {
            state.preloadedHistory.clear();
            console.log('🧹 Кэш истории очищен (переключение с пакетного анализа)');
        }
        
        const historySource = state.historyFiltered || state.historyDataFull || [];
        state.navigationSource = 'history';
        state.navigationList = historySource.map(h => h.id);
        state.navigationIndex = state.navigationList.indexOf(itemId);
        console.log(`🧭 Навигация: история, позиция ${state.navigationIndex + 1}/${state.navigationList.length} (отфильтровано: ${state.historyFiltered ? 'да' : 'нет'})`);
        
        // Запускаем предзагрузку в фоне (не блокируем отображение)
        preloadHistoryItems(state.navigationIndex, state.navigationList).catch(err => {
            console.error('⚠️ Ошибка фоновой предзагрузки:', err);
        });
    }
    
    // Отображаем результаты
    displayResults(fullData);
    updateNavigationUI();
    switchPage('analyze');
    
    if (!skipNavUpdate) {
        showToast('📋 Данные загружены из истории', 'success');
    }
}
// Удаление записи из истории
window.deleteHistoryItem = async function(itemId) {
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }

    if (!itemId) {
        showToast('⚠️ Ошибка: ID записи не найден', 'error');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить эту запись из истории?\nЭто действие нельзя отменить.')) {
        return;
    }

    showLoading(true, 'Удаление записи...');

    try {
        // Вызываем бэкенд-метод DeleteHistoryItem
        await window.go.desktop.App.DeleteHistoryItem(itemId);
        
        // Удаляем из предзагруженных данных
        state.preloadedHistory.delete(itemId);
        
        // Обновляем навигационные списки, если они содержат удалённый ID
        if (state.navigationSource === 'history' && state.navigationList.includes(itemId)) {
            const index = state.navigationList.indexOf(itemId);
            if (index === state.navigationIndex) {
                // Если удаляется текущая запись, переходим на предыдущую или следующую
                if (state.navigationList.length > 1) {
                    const newIndex = index > 0 ? index - 1 : 0;
                    const newItemId = state.navigationList[newIndex];
                    state.navigationList.splice(index, 1);
                    state.navigationIndex = newIndex;
                    // Перезагружаем историю, чтобы обновить таблицу
                    await loadHistory();
                    // Если есть другой элемент для просмотра, загружаем его
                    if (newItemId) {
                        await viewHistoryItem(newItemId, true);
                    }
                } else {
                    // Больше записей нет
                    state.navigationSource = null;
                    state.navigationList = [];
                    state.navigationIndex = -1;
                    await loadHistory();
                    switchPage('history');
                }
            } else {
                // Удаляем из списка и обновляем историю
                state.navigationList.splice(index, 1);
                await loadHistory();
            }
        } else {
            // Просто перезагружаем историю для обновления таблицы
            await loadHistory();
        }

        showToast('🗑️ Запись удалена', 'success');
    } catch (error) {
        console.error('Ошибка удаления записи:', error);
        showToast(`❌ Ошибка удаления: ${error.message || error}`, 'error');
    } finally {
        showLoading(false);
    }
};

// Функция фильтрации и сортировки истории
function applyHistoryFilters(history) {
    let filtered = [...history];
    
    // Поиск по номеру компаса
    const searchQuery = document.getElementById('historySearchInput').value.trim().toLowerCase();
    if (searchQuery) {
        filtered = filtered.filter(item => 
            item.compass.toLowerCase().includes(searchQuery)
        );
        
        // ПРИОРИТЕТ: Точное совпадение первым!
        filtered.sort((a, b) => {
            const aLower = a.compass.toLowerCase();
            const bLower = b.compass.toLowerCase();
            const aExact = aLower === searchQuery;
            const bExact = bLower === searchQuery;
            
            // Точное совпадение всегда первое
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Начинается с поискового запроса - выше
            const aStarts = aLower.startsWith(searchQuery);
            const bStarts = bLower.startsWith(searchQuery);
            
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            // Остальные - обычная сортировка
            return compareCompassNames(a.compass, b.compass);
        });
    }
    
    // Фильтр по статусу
    const statusFilter = document.getElementById('historyFilterStatus').value;
    if (statusFilter === 'success') {
        filtered = filtered.filter(item => item.isValid);
    } else if (statusFilter === 'failed') {
        filtered = filtered.filter(item => !item.isValid);
    }
    
    // Фильтр по типу устройства
    const deviceTypeFilter = document.getElementById('historyFilterDeviceType').value;
    if (deviceTypeFilter && deviceTypeFilter !== 'all') {
        filtered = filtered.filter(item => (item.deviceType || 'Неизвестно') === deviceTypeFilter);
    }
    
    // Фильтр по датам
    const dateFrom = document.getElementById('historyFilterDateFrom').value;
    const dateTo = document.getElementById('historyFilterDateTo').value;
    
    if (dateFrom) {
        const fromTimestamp = new Date(dateFrom).getTime();
        filtered = filtered.filter(item => item.timestamp >= fromTimestamp);
    }
    
    if (dateTo) {
        const toTimestamp = new Date(dateTo).setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => item.timestamp <= toTimestamp);
    }
    
    // Сортировка (если не было поиска)
    if (!searchQuery) {
        const sortBy = document.getElementById('historySort').value;
        
        switch (sortBy) {
            case 'date-desc':
                filtered.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'date-asc':
                filtered.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case 'name-asc':
                filtered.sort((a, b) => compareCompassNames(a.compass, b.compass));
                break;
            case 'name-desc':
                filtered.sort((a, b) => compareCompassNames(b.compass, a.compass));
                break;
            case 'device-asc':
                filtered.sort((a, b) => (a.deviceType || 'Неизвестно').localeCompare(b.deviceType || 'Неизвестно', 'ru'));
                break;
            case 'device-desc':
                filtered.sort((a, b) => (b.deviceType || 'Неизвестно').localeCompare(a.deviceType || 'Неизвестно', 'ru'));
                break;
        }
    }
    
    return filtered;
}

// Умная сортировка номеров компасов (числовая)
function compareCompassNames(a, b) {
    // Извлекаем числа из строк
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    
    // Если числа разные - сортируем по числу
    if (numA !== numB) {
        return numA - numB;
    }
    
    // Если числа одинаковые - сортируем по полной строке
    return a.localeCompare(b, 'ru');
}

// Очистка истории
async function clearHistory() {
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите очистить всю историю?\nЭто действие нельзя отменить.')) {
        return;
    }
    
    try {
        await window.go.desktop.App.ClearHistory();
        await loadHistory();
        showToast('🗑️ История очищена', 'success');
    } catch (error) {
        console.error('Ошибка очистки истории:', error);
        showToast('❌ Ошибка очистки истории', 'error');
    }
}

// Обработчики кнопок истории
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showToast('🔄 Обновление истории...', 'info');
            await loadHistory();
        });
    }
    
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
    }
    
    // Применить фильтры
    const applyFiltersBtn = document.getElementById('applyHistoryFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            if (state.historyDataFull) {
                displayHistory(state.historyDataFull, true);
                showToast('🔍 Фильтры применены', 'success');
            } else {
                showToast('⚠️ Нет данных для фильтрации', 'warning');
            }
        });
    }
    
    // Сбросить фильтры
    const resetFiltersBtn = document.getElementById('resetHistoryFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Очищаем все поля фильтров
            document.getElementById('historySearchInput').value = '';
            document.getElementById('historyFilterStatus').value = 'all';
            document.getElementById('historyFilterDeviceType').value = 'all';
            document.getElementById('historyFilterDateFrom').value = '';
            document.getElementById('historyFilterDateTo').value = '';
            document.getElementById('historySort').value = 'date-desc';
            
            // Показываем все данные без фильтров
            if (state.historyDataFull) {
                displayHistory(state.historyDataFull, false);
                showToast('♻️ Фильтры сброшены', 'info');
            }
        });
    }
    
    // Загружаем историю при переключении на страницу
    const historyNav = document.querySelector('[data-page="history"]');
    if (historyNav) {
        historyNav.addEventListener('click', () => {
            setTimeout(() => {
                // Если история уже загружена - просто обновляем отображение с текущими фильтрами
                if (state.historyDataFull && state.historyDataFull.length > 0) {
                    displayHistory(state.historyDataFull, true);  // Применяем текущие фильтры
                } else {
                    loadHistory();  // Загружаем заново
                }
            }, 100);
        });
    }
});

// ============================================================================
// РЕДАКТОР ФАЙЛОВ
// ============================================================================

// Загрузка сохраненных настроек редактора
function loadEditorSettings() {
    const saved = localStorage.getItem('editorSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings.lastDirectory) {
                document.getElementById('editorDirInput').value = settings.lastDirectory;
            }
            if (settings.textToRemove) {
                document.getElementById('editorTextInput').value = settings.textToRemove;
            }
            if (settings.recursive !== undefined) {
                document.getElementById('editorRecursive').checked = settings.recursive;
            }
        } catch (e) {
            console.error('Ошибка загрузки настроек редактора:', e);
        }
    }
}

// Сохранение настроек редактора
function saveEditorSettings() {
    const settings = {
        lastDirectory: document.getElementById('editorDirInput').value,
        textToRemove: document.getElementById('editorTextInput').value,
        recursive: document.getElementById('editorRecursive').checked
    };
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

// Инициализация редактора
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем настройки
    loadEditorSettings();
    
    // Кнопка выбора директории
    const selectEditorBtn = document.getElementById('selectEditorDirBtn');
    if (selectEditorBtn) {
        selectEditorBtn.addEventListener('click', async () => {
            if (!isWailsMode()) {
                showToast('⚠️ Доступно только в Desktop режиме', 'warning');
                return;
            }
            
            try {
                // Используем Go метод через Wails binding
                const result = await window.go.desktop.App.SelectDirectory('Выберите директорию для обработки файлов');
                
                if (result) {
                    document.getElementById('editorDirInput').value = result;
                    saveEditorSettings();
                    showToast('📁 Директория выбрана', 'success');
                }
            } catch (error) {
                console.error('Ошибка выбора директории:', error);
                showToast(`❌ Ошибка: ${error.message || error}`, 'error');
            }
        });
    }
    
    // Кнопка предпросмотра
    const previewBtn = document.getElementById('previewRenameBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => previewRename());
    }
    
    // Кнопка выполнения
    const executeBtn = document.getElementById('executeRenameBtn');
    if (executeBtn) {
        executeBtn.addEventListener('click', () => executeRename());
    }
    
    // Сохранение при изменении
    ['editorDirInput', 'editorTextInput', 'editorRecursive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', saveEditorSettings);
        }
    });
});

// Предпросмотр переименования
async function previewRename() {
    const directory = document.getElementById('editorDirInput').value.trim();
    const textToRemove = document.getElementById('editorTextInput').value.trim();
    const recursive = document.getElementById('editorRecursive').checked;
    
    if (!directory) {
        showToast('⚠️ Укажите директорию', 'warning');
        return;
    }
    
    if (!textToRemove) {
        showToast('⚠️ Укажите текст для удаления', 'warning');
        return;
    }
    
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    showLoading(true, 'Формирование предпросмотра...');
    
    try {
        const stats = await window.go.desktop.App.PreviewRename(directory, textToRemove, recursive);
        displayRenameResults(stats, true);
        
        if (stats.total === 0) {
            showToast('ℹ️ Файлы с указанным текстом не найдены', 'info');
        } else {
            showToast(`📋 Найдено файлов: ${stats.total}`, 'info');
        }
    } catch (error) {
        console.error('Ошибка предпросмотра:', error);
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Выполнение переименования
async function executeRename() {
    const directory = document.getElementById('editorDirInput').value.trim();
    const textToRemove = document.getElementById('editorTextInput').value.trim();
    const recursive = document.getElementById('editorRecursive').checked;
    
    if (!directory) {
        showToast('⚠️ Укажите директорию', 'warning');
        return;
    }
    
    if (!textToRemove) {
        showToast('⚠️ Укажите текст для удаления', 'warning');
        return;
    }
    
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    // Подтверждение
    const count = await window.go.desktop.App.GetFilesCount(directory, textToRemove, recursive);
    if (count === 0) {
        showToast('ℹ️ Файлы с указанным текстом не найдены', 'info');
        return;
    }
    
    if (!confirm(`Будет переименовано ${count} файлов.\nПродолжить?`)) {
        return;
    }
    
    showLoading(true, 'Переименование файлов...');
    
    try {
        const stats = await window.go.desktop.App.RemoveTextFromFilenames(directory, textToRemove, recursive);
        displayRenameResults(stats, false);
        
        if (stats.success > 0) {
            showToast(`✅ Успешно переименовано: ${stats.success} файлов`, 'success');
        }
        if (stats.failed > 0) {
            showToast(`⚠️ Ошибок: ${stats.failed}`, 'warning');
        }
    } catch (error) {
        console.error('Ошибка переименования:', error);
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Отображение результатов
function displayRenameResults(stats, isPreview) {
    const resultsDiv = document.getElementById('renameResults');
    resultsDiv.style.display = 'block';
    
    // Статистика
    document.getElementById('renameSuccess').textContent = stats.success;
    document.getElementById('renameFailed').textContent = stats.failed;
    document.getElementById('renameTotal').textContent = stats.total;
    
    // Таблица
    const tbody = document.getElementById('renameResultsBody');
    
    if (!stats.results || stats.results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <span class="material-icons">search_off</span>
                    Файлы не найдены
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = stats.results.map((result, index) => {
        const statusBadge = result.success 
            ? '<span class="badge success">✓ Успешно</span>'
            : `<span class="badge error">✗ ${result.error || 'Ошибка'}</span>`;
        
        const rowStyle = result.success ? '' : 'background: rgba(239, 68, 68, 0.1);';
        
        return `
            <tr style="${rowStyle}">
                <td><strong>${index + 1}</strong></td>
                <td><code>${result.oldName}</code></td>
                <td><code>${result.newName}</code></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
    
    // Прокрутка к результатам
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================================
// ИЗМЕНЕНИЕ СТАТУСА ВРУЧНУЮ
// ============================================================================

// Глобальная переменная для хранения текущего ID анализа для изменения
let currentChangeStatusItemID = null;

// Открыть модальное окно изменения статуса
window.openChangeStatusModal = function(itemID, reason) {
    console.log('🔧 openChangeStatusModal вызвана, itemID:', itemID, 'reason:', reason);
    
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    if (!itemID) {
        console.error('❌ Ошибка: itemID не передан!');
        showToast('⚠️ Ошибка: ID записи не найден', 'error');
        return;
    }
    
    currentChangeStatusItemID = itemID;
    console.log('✅ Установлен currentChangeStatusItemID:', currentChangeStatusItemID);
    
    const modal = document.getElementById('changeStatusModal');
    const reasonEl = document.getElementById('changeStatusReason');
    
    if (reason) {
        reasonEl.textContent = reason;
    } else {
        reasonEl.textContent = 'Обнаружены отклонения в последовательности поворотов.';
    }
    
    modal.style.display = 'flex';
    
    // Обработчики кнопок
    document.getElementById('confirmSuccessBtn').onclick = () => {
        confirmStatusChange('success');
    };
    
    document.getElementById('confirmFailedBtn').onclick = () => {
        confirmStatusChange('failed');
    };
};

// Закрыть модальное окно изменения статуса
window.closeChangeStatusModal = function() {
    document.getElementById('changeStatusModal').style.display = 'none';
    currentChangeStatusItemID = null;
};

// Подтверждение изменения статуса
async function confirmStatusChange(newStatus) {
    if (!currentChangeStatusItemID) {
        showToast('⚠️ Ошибка: ID анализа не найден', 'error');
        return;
    }
    
    // ⚠️ КРИТИЧНО: Сохраняем ID ПЕРЕД закрытием модального окна!
    const itemIDToUpdate = currentChangeStatusItemID;
    console.log('🔧 confirmStatusChange: сохраняем ID для обновления:', itemIDToUpdate);
    
    closeChangeStatusModal(); // Это обнуляет currentChangeStatusItemID!
    showLoading(true, 'Обновление статуса...');
    
    try {
        // Вызываем backend функцию для обновления статуса с СОХРАНЕННЫМ ID
        console.log('🔧 Вызываем UpdateAnalysisStatus с ID:', itemIDToUpdate, 'статус:', newStatus);
        await window.go.desktop.App.UpdateAnalysisStatus(itemIDToUpdate, newStatus);
        
        const statusText = newStatus === 'success' ? 'Успешно' : 'Не прошло';
        showToast(`✅ Статус обновлен: ${statusText}`, 'success');
        
        // Перезагружаем историю если мы на странице истории
        if (state.currentPage === 'history') {
            await loadHistory();
        }
        
        // Если это текущий просматриваемый анализ, обновляем отображение и кэш
        if (state.currentData && state.currentData.compass) {
            const item = await window.go.desktop.App.LoadHistoryItem(itemIDToUpdate);
            if (item && item.fullData) {
                const fullData = JSON.parse(item.fullData);
                fullData.historyItemID = itemIDToUpdate;
                // Обновляем кэш предзагруженных данных
                state.preloadedHistory.set(itemIDToUpdate, fullData);
                displayResults(fullData);
            }
        }
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        showToast(`❌ Ошибка: ${error.message || error}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Добавить обработчик правого клика на строки с warning
function setupContextMenuForWarnings() {
    // Обработчик будет добавлен динамически при отображении результатов
    // См. функцию displayResults и displayTurnsTable
}

// ============================================================================
// ЛОГИ ОТЛАДКИ
// ============================================================================

// Загрузка логов
async function loadLogs() {
    if (!isWailsMode()) {
        document.getElementById('logsViewer').textContent = 'Логи доступны только в Desktop режиме';
        return;
    }
    
    try {
        const logs = await window.go.desktop.App.GetLogs();
        displayLogs(logs);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        document.getElementById('logsViewer').textContent = `Ошибка загрузки логов: ${error.message}`;
    }
}

// Отображение логов
function displayLogs(logs) {
    const viewer = document.getElementById('logsViewer');
    
    if (!logs || logs.length === 0) {
        viewer.textContent = 'Нет логов';
        return;
    }
    
    // Цветовая схема для уровней
    const colors = {
        'INFO': '#3b82f6',
        'SUCCESS': '#10b981',
        'WARN': '#f59e0b',
        'ERROR': '#ef4444',
        'DEBUG': '#8b5cf6'
    };
    
    viewer.innerHTML = logs.map(log => {
        const color = colors[log.level] || '#94a3b8';
        return `<span style="color: ${color};">[${log.timestamp}] [${log.level}]</span> ${log.message}`;
    }).join('\n');
    
    // Прокрутка вниз к последним логам
    viewer.scrollTop = viewer.scrollHeight;
}

// Обработчики кнопок логов
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshLogsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadLogs();
            showToast('🔄 Логи обновлены', 'success');
        });
    }
    
    const clearBtn = document.getElementById('clearLogsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!isWailsMode()) {
                showToast('⚠️ Доступно только в Desktop режиме', 'warning');
                return;
            }
            
            if (confirm('Очистить все логи?')) {
                try {
                    await window.go.desktop.App.ClearLogs();
                    await loadLogs();
                    showToast('🗑️ Логи очищены', 'success');
                } catch (error) {
                    showToast('❌ Ошибка очистки логов', 'error');
                }
            }
        });
    }
    
    // Автообновление логов каждые 2 секунды если страница активна
    setInterval(() => {
        if (state.currentPage === 'logs' && isWailsMode()) {
            loadLogs();
        }
    }, 2000);
    
    // === НАВИГАЦИЯ ПО РЕЗУЛЬТАТАМ ===
    
    // Обработчики кнопок навигации
    document.getElementById('prevAnalysisBtn').addEventListener('click', () => navigateAnalysis(-1));
    document.getElementById('nextAnalysisBtn').addEventListener('click', () => navigateAnalysis(1));
});

// === ФУНКЦИИ НАВИГАЦИИ ПО РЕЗУЛЬТАТАМ ===

// Обновление UI навигации
function updateNavigationUI() {
    const navButtons = document.getElementById('navigationButtons');
    const prevBtn = document.getElementById('prevAnalysisBtn');
    const nextBtn = document.getElementById('nextAnalysisBtn');
    const navPosition = document.getElementById('navPosition');
    
    if (!state.navigationSource || state.navigationList.length === 0) {
        navButtons.style.display = 'none';
        return;
    }
    
    // Показываем кнопки только если есть > 1 элемента
    if (state.navigationList.length > 1) {
        navButtons.style.display = 'flex';
        
        // Обновляем позицию
        navPosition.textContent = `${state.navigationIndex + 1} / ${state.navigationList.length}`;
        
        // Управляем доступностью кнопок
        prevBtn.disabled = state.navigationIndex <= 0;
        nextBtn.disabled = state.navigationIndex >= state.navigationList.length - 1;
    } else {
        navButtons.style.display = 'none';
    }
}

// Навигация по анализам (direction: -1 для предыдущего, +1 для следующего)
async function navigateAnalysis(direction) {
    const newIndex = state.navigationIndex + direction;
    
    if (newIndex < 0 || newIndex >= state.navigationList.length) {
        return; // Выход за пределы
    }
    
    state.navigationIndex = newIndex;
    
    if (state.navigationSource === 'history') {
        // Навигация по истории
        const itemId = state.navigationList[newIndex];
        
        // Проверяем наличие в памяти перед загрузкой
        const cachedData = state.preloadedHistory.get(itemId);
        
        if (cachedData) {
            // Данные в памяти - показываем мгновенно
            console.log(`⚡ Навигация: данные уже в памяти (позиция ${newIndex + 1})`);
            cachedData.historyItemID = itemId;
            displayResults(cachedData);
            updateNavigationUI();
            switchPage('analyze');
        } else {
            // Данных нет - загружаем (viewHistoryItem использует предзагрузку)
            await viewHistoryItem(itemId, true); // true = не обновлять navigation state
        }
        
        // Подгружаем новые данные в фоне (скользящее окно)
        preloadHistoryItems(newIndex, state.navigationList).catch(err => {
            console.error('⚠️ Ошибка фоновой предзагрузки при навигации:', err);
        });
        
    } else if (state.navigationSource === 'batch') {
        // Навигация по пакетному анализу (данные уже в памяти в state.batchResults)
        const batchIndex = state.navigationList[newIndex];
        viewBatchResult(batchIndex, true); // true = не обновлять navigation state
    }
    
    updateNavigationUI();
}

