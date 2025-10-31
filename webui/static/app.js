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
    historyDataFull: null    // Полные данные для фильтрации
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
    
    const mode = isWailsMode() ? '🖥️ Desktop (Wails)' : '🌐 Web';
    showToast(`${mode} режим готов к работе!`, 'success');
});

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
        editor: { title: 'Редактор файлов', subtitle: 'Массовое переименование файлов в директории' }
    };
    
    if (titles[pageName]) {
        document.getElementById('page-title').textContent = titles[pageName].title;
        document.getElementById('page-subtitle').textContent = titles[pageName].subtitle;
    }
    
    state.currentPage = pageName;
    
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
    
    document.getElementById('analyzeBtn').addEventListener('click', resetAnalysis);
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('exportCSVBtn').addEventListener('click', exportResultsCSV);
    document.getElementById('copyLogBtn').addEventListener('click', copyLog);
    
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
        
        await window.go.desktop.App.AddToHistory(historyItem);
        console.log('💾 Результат сохранен в историю');
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
    
    document.getElementById('statValid').textContent = data.isValid ? '✓ Валидно' : '✗ Не прошло';
    document.getElementById('statValid').style.color = data.isValid ? 'var(--success)' : 'var(--error)';
    document.getElementById('statTurns').textContent = data.turns ? data.turns.length : 0;
    document.getElementById('statSegments').textContent = data.segments ? data.segments.length : 0;
    document.getElementById('statAngles').textContent = data.allAngles ? data.allAngles.length : 0;
    
    displayTurnsTable(data.turns || []);
    displayPolarChart(data);
    
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
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><span class="material-icons">info</span>Повороты не обнаружены</td></tr>';
        return;
    }
    
    tbody.innerHTML = turns.map((turn, index) => {
        const tolerance = state.settings.turnTolerance;
        const minAngle = 90 - tolerance;
        const maxAngle = 90 + tolerance;
        const diff = turn.diff || 0;
        
        let badgeClass, iconName, statusText;
        if (diff >= minAngle && diff <= maxAngle) {
            badgeClass = 'success';
            iconName = 'check_circle';
            statusText = `В допуске`;
        } else if (diff >= minAngle - 5 && diff <= maxAngle + 5) {
            badgeClass = 'warning';
            iconName = 'warning';
            statusText = `Близко к границе`;
        } else {
            badgeClass = 'error';
            iconName = 'cancel';
            statusText = `БРАК!`;
        }
        
        const bgStyle = badgeClass === 'error' ? 'background: rgba(239, 68, 68, 0.1);' : '';
        
        return `
            <tr style="${bgStyle}">
                <td><strong>#${index + 1}</strong></td>
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
function displayBatchResults(results) {
    const container = document.getElementById('batchResults');
    container.style.display = 'block';
    
    state.batchResults = results;
    
    const successCount = results.filter(r => r.isValid).length;
    const failedCount = results.length - successCount;
    
    document.getElementById('batchSuccess').textContent = successCount;
    document.getElementById('batchFailed').textContent = failedCount;
    document.getElementById('batchTotal').textContent = results.length;
    
    const tbody = document.getElementById('batchResultsBody');
    tbody.innerHTML = results.map((result, index) => `
        <tr>
            <td><strong>${index + 1}</strong></td>
            <td><strong>${result.compass}</strong></td>
            <td>${result.deviceType || 'Неизвестно'}</td>
            <td><span class="badge ${result.isValid ? 'success' : 'error'}">${result.isValid ? '✓ Успешно' : '✗ Ошибка'}</span></td>
            <td>${result.turns ? result.turns.length : 0}/4</td>
            <td>
                <button class="btn-icon" onclick="viewBatchResult(${index})" title="Детальный просмотр">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        </tr>
    `).join('');
}

// Просмотр результата из пакетного анализа (глобальная функция для onclick)
window.viewBatchResult = function(index) {
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
        
        // Отображаем результаты как обычный анализ
        displayResults(result);
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
    
    let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4\n';
    
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
    
    csv += `${dss};${deviceType};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
    
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
    
    let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4\n';
    
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
            
            csv += `${dss};${type};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
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
        
        let csv = '№ ДСС;Тип устройства;Результат калибровки;Количество поворотов;Поворот 1;Поворот 2;Поворот 3;Поворот 4\n';
        
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
            
            csv += `${dss};${type};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
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
    
    // Статистика (по отфильтрованным данным)
    const successCount = filteredHistory.filter(h => h.isValid).length;
    const failedCount = filteredHistory.length - successCount;
    
    document.getElementById('historySuccess').textContent = successCount;
    document.getElementById('historyFailed').textContent = failedCount;
    document.getElementById('historyTotal').textContent = filteredHistory.length;
    
    // Таблица - сохраняем только метаданные (БЕЗ fullData!)
    tbody.innerHTML = filteredHistory.map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${dateStr} ${timeStr}</td>
                <td><strong>${item.compass}</strong></td>
                <td>${item.deviceType || 'Неизвестно'}</td>
                <td><span class="badge ${item.isValid ? 'success' : 'error'}">${item.isValid ? '✓ Валидно' : '✗ Не прошло'}</span></td>
                <td>${item.turnsCount}/4</td>
                <td>
                    <button class="btn-icon" onclick="viewHistoryItem('${item.id}')" title="Просмотреть">
                        <span class="material-icons">visibility</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
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

// Просмотр элемента истории (ОПТИМИЗИРОВАНО - загрузка одной записи, глобальная для onclick)
window.viewHistoryItem = async function(itemId) {
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    // Показываем индикатор загрузки
    showLoading(true, 'Загрузка данных из истории...');
    
    try {
        console.log(`🔍 Загрузка записи: ${itemId}`);
        
        // Проверяем наличие Go API
        if (!window.go || !window.go.desktop || !window.go.desktop.App) {
            throw new Error('Go API не доступен. Пожалуйста, перезапустите приложение.');
        }
        
        // Загружаем ТОЛЬКО одну запись (вместо всей истории!)
        const item = await window.go.desktop.App.LoadHistoryItem(itemId);
        
        if (!item) {
            throw new Error('Запись не найдена');
        }
        
        if (!item.fullData) {
            throw new Error('Данные записи повреждены');
        }
        
        // Парсим fullData с проверкой
        let fullData;
        try {
            fullData = typeof item.fullData === 'string' ? JSON.parse(item.fullData) : item.fullData;
        } catch (parseError) {
            console.error('Ошибка парсинга fullData:', parseError);
            throw new Error('Не удалось прочитать данные анализа');
        }
        
        console.log(`✅ Загружена запись для ${item.compass}`, fullData);
        
        // Отображаем результаты
        displayResults(fullData);
        switchPage('analyze');
        showToast('📋 Данные загружены из истории', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки из истории:', error);
        showToast(`Ошибка загрузки: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

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


