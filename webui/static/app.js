// Compass Analyzer - Unified app.js (работает и в Wails, и в веб-режиме)

// Global state
const state = {
    currentPage: 'analyze',
    currentData: null,
    batchResults: null,
    chart: null,
    settings: null
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
        analyze: { title: 'Анализ калибровки компаса', subtitle: isWailsMode() ? 'Desktop приложение на Wails' : 'Веб-интерфейс' },
        batch: { title: 'Пакетный анализ', subtitle: 'Массовая обработка нескольких компасов' },
        history: { title: 'История анализов', subtitle: 'Просмотр выполненных проверок' },
        settings: { title: 'Настройки алгоритма', subtitle: 'Конфигурация параметров анализа' }
    };
    
    document.getElementById('page-title').textContent = titles[pageName].title;
    document.getElementById('page-subtitle').textContent = titles[pageName].subtitle;
    
    state.currentPage = pageName;
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
            analyzeSingleFolder(folderPath);
        } else {
            showToast('⚠️ Введите путь к папке или выберите через диалог', 'warning');
        }
    });
    
    document.getElementById('analyzeBtn').addEventListener('click', resetAnalysis);
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('exportCSVBtn').addEventListener('click', exportResultsCSV);
    document.getElementById('copyLogBtn').addEventListener('click', copyLog);
    
    const batchBtn = document.getElementById('batchAnalyzeBtn');
    if (batchBtn) batchBtn.addEventListener('click', handleBatchAnalyze);
}

// Функция выбора папки для точечного анализа
async function selectSingleFolder() {
    if (!isWailsMode()) {
        showToast('⚠️ Выбор папки доступен только в Desktop режиме', 'warning');
        return;
    }
    
    try {
        const result = await window.runtime.OpenDirectoryDialog({
            Title: 'Выберите папку с данными компаса',
            ShowHiddenFiles: false
        });
        
        if (result) {
            document.getElementById('singleFolderInput').value = result;
            showToast('📁 Папка выбрана', 'success');
        }
    } catch (error) {
        console.error('Ошибка выбора папки:', error);
        showToast('❌ Ошибка выбора папки', 'error');
    }
}

// Функция выбора директории для пакетного анализа
async function selectBatchDirectory() {
    if (!isWailsMode()) {
        showToast('⚠️ Выбор директории доступен только в Desktop режиме', 'warning');
        return;
    }
    
    try {
        const result = await window.runtime.OpenDirectoryDialog({
            Title: 'Выберите директорию с папками компасов',
            ShowHiddenFiles: false
        });
        
        if (result) {
            document.getElementById('batchDirInput').value = result;
            showToast('📁 Директория выбрана', 'success');
        }
    } catch (error) {
        console.error('Ошибка выбора директории:', error);
        showToast('❌ Ошибка выбора директории', 'error');
    }
}

function resetAnalysis() {
    state.currentData = null;
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('singleFolderInput').value = '';
}

// Analyze single folder (универсальная функция)
async function analyzeSingleFolder(folderPath) {
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
            data = await window.go.desktop.App.AnalyzeCompass(folderPath, config);
        } else {
            // Web API
            console.log('🌐 Web API: /api/analyze');
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folderPath, config: config })
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
async function handleBatchAnalyze() {
    const dirInput = document.getElementById('batchDirInput').value.trim();
    
    if (!dirInput) {
        showToast('⚠️ Укажите директорию', 'warning');
        return;
    }
    
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
            results = await window.go.desktop.App.BatchAnalyze(dirInput, config);
        } else {
            // Web API (fallback to non-streaming для простоты)
            console.log('🌐 Web API: /api/batch-analyze');
            const response = await fetch('/api/batch-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: dirInput, config: config })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            results = await response.json();
        }
        
        displayBatchResults(results);
        
        // Сохраняем все результаты в историю (только в Wails режиме)
        if (isWailsMode() && results && results.length > 0) {
            await saveBatchToHistory(results, dirInput);
        }
        
        showToast(`✅ Обработано: ${results.length}`, 'success');
    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Функция сохранения пакетных результатов в историю
async function saveBatchToHistory(results, baseDir) {
    try {
        let savedCount = 0;
        for (const result of results) {
            if (result.success) {
                const folderPath = baseDir + '\\' + result.compass;
                await saveToHistory(result, folderPath);
                savedCount++;
            }
        }
        console.log(`💾 Сохранено в историю: ${savedCount} из ${results.length}`);
    } catch (error) {
        console.error('Ошибка сохранения пакета в историю:', error);
    }
}

// Display results
function displayResults(data) {
    state.currentData = data;
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    document.getElementById('statValid').textContent = data.isValid ? '✓ Валидно' : '✗ Не прошло';
    document.getElementById('statValid').style.color = data.isValid ? 'var(--success)' : 'var(--error)';
    document.getElementById('statTurns').textContent = data.turns ? data.turns.length : 0;
    document.getElementById('statSegments').textContent = data.segments ? data.segments.length : 0;
    document.getElementById('statAngles').textContent = data.allAngles ? data.allAngles.length : 0;
    
    displayTurnsTable(data.turns);
    displayPolarChart(data);
    
    if (data.log) {
        document.getElementById('logViewer').textContent = data.log;
    }
    
    document.getElementById('turnsBadge').textContent = data.turns.length;
}

// Display turns table
function displayTurnsTable(turns) {
    const tbody = document.getElementById('turnsTableBody');
    
    if (!turns || turns.length === 0) {
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
function displayPolarChart(data) {
    const ctx = document.getElementById('polarChart');
    
    if (state.chart) state.chart.destroy();
    
    // Основные данные (все углы)
    const angleData = data.allAngles.map((angle, index) => ({
        x: index,
        y: angle
    }));
    
    // Создаем датасеты для подсветки поворотов
    const datasets = [{
        label: 'Все углы',
        data: angleData,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        pointRadius: 3,
        pointHoverRadius: 5
    }];
    
    // Добавляем датасеты для каждого поворота (подсветка)
    if (data.turns && data.turns.length > 0) {
        const colors = [
            'rgba(239, 68, 68, 0.8)',   // Красный
            'rgba(34, 197, 94, 0.8)',   // Зеленый
            'rgba(251, 191, 36, 0.8)',  // Желтый
            'rgba(147, 51, 234, 0.8)'   // Фиолетовый
        ];
        
        data.turns.forEach((turn, index) => {
            const turnData = [];
            for (let i = turn.startIndex; i <= turn.endIndex && i < data.allAngles.length; i++) {
                turnData.push({
                    x: i,
                    y: data.allAngles[i]
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
            <td><span class="badge ${result.isValid ? 'success' : 'error'}">${result.isValid ? '✓ Успешно' : '✗ Ошибка'}</span></td>
            <td>${result.turns ? result.turns.length : 0}/4</td>
            <td>${result.allAngles ? result.allAngles.length : '-'}</td>
        </tr>
    `).join('');
}

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

function exportResults() {
    if (!state.currentData) {
        showToast('⚠️ Нет данных', 'warning');
        return;
    }
    const dataStr = JSON.stringify(state.currentData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_analysis_${Date.now()}.json`;
    link.click();
    showToast('📥 Экспортировано в JSON', 'success');
}

function exportResultsCSV() {
    if (!state.currentData) {
        showToast('⚠️ Нет данных', 'warning');
        return;
    }
    let csv = 'Компас;Результат;Повороты;Угол 1;Угол 2;Угол 3;Угол 4\n';
    const compass = state.currentData.compass || 'Unknown';
    const status = state.currentData.isValid ? 'Успешно' : 'Неуспешно';
    const turnsCount = state.currentData.turns ? state.currentData.turns.length : 0;
    const angles = ['', '', '', ''];
    if (state.currentData.turns) {
        for (let i = 0; i < Math.min(4, state.currentData.turns.length); i++) {
            const t = state.currentData.turns[i];
            angles[i] = ((t.startAngle + t.endAngle) / 2).toFixed(2);
        }
    }
    csv += `${compass};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_${compass}_${Date.now()}.csv`;
    link.click();
    showToast('📥 Экспортировано в CSV', 'success');
}

// Chart zoom reset
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

// Отображение истории (ОПТИМИЗИРОВАНО - без fullData)
function displayHistory(history) {
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
    
    // Статистика
    const successCount = history.filter(h => h.isValid).length;
    const failedCount = history.length - successCount;
    
    document.getElementById('historySuccess').textContent = successCount;
    document.getElementById('historyFailed').textContent = failedCount;
    document.getElementById('historyTotal').textContent = history.length;
    
    // Таблица - сохраняем только метаданные (БЕЗ fullData!)
    tbody.innerHTML = history.map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${dateStr} ${timeStr}</td>
                <td><strong>${item.compass}</strong></td>
                <td><span class="badge ${item.isValid ? 'success' : 'error'}">${item.isValid ? '✓ Валидно' : '✗ Не прошло'}</span></td>
                <td>${item.turnsCount}/4</td>
                <td>${item.anglesCount || '-'}</td>
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
        timestamp: item.timestamp,
        isValid: item.isValid,
        turnsCount: item.turnsCount,
        anglesCount: item.anglesCount
        // fullData НЕ сохраняем! Загрузим при просмотре
    }));
    
    console.log(`📊 История загружена: ${history.length} записей (БЕЗ fullData)`);
}

// Просмотр элемента истории (ОПТИМИЗИРОВАНО - загрузка одной записи)
async function viewHistoryItem(itemId) {
    if (!isWailsMode()) {
        showToast('⚠️ Доступно только в Desktop режиме', 'warning');
        return;
    }
    
    // Показываем индикатор загрузки
    showLoading(true, 'Загрузка данных из истории...');
    
    try {
        console.log(`🔍 Загрузка записи: ${itemId}`);
        
        // Загружаем ТОЛЬКО одну запись (вместо всей истории!)
        const item = await window.go.desktop.App.LoadHistoryItem(itemId);
        
        if (!item || !item.fullData) {
            throw new Error('Запись не найдена или повреждена');
        }
        
        // Парсим fullData
        const fullData = JSON.parse(item.fullData);
        
        console.log(`✅ Загружена запись для ${item.compass}`);
        
        // Отображаем результаты
        displayResults(fullData);
        switchPage('analyze');
        showToast('📋 Данные загружены из истории', 'success');
        
    } catch (error) {
        console.error('Ошибка загрузки из истории:', error);
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
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
    
    // Загружаем историю при переключении на страницу
    const historyNav = document.querySelector('[data-page="history"]');
    if (historyNav) {
        historyNav.addEventListener('click', () => {
            setTimeout(() => loadHistory(), 100);
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
                const result = await window.runtime.OpenDirectoryDialog({
                    Title: 'Выберите директорию для обработки',
                    ShowHiddenFiles: false
                });
                
                if (result) {
                    document.getElementById('editorDirInput').value = result;
                    saveEditorSettings();
                    showToast('📁 Директория выбрана', 'success');
                }
            } catch (error) {
                console.error('Ошибка выбора директории:', error);
                showToast('❌ Ошибка выбора директории', 'error');
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

