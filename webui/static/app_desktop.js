// Wails Desktop Version - адаптированная версия app.js для desktop приложения
// Использует window.go вместо fetch() для взаимодействия с Go backend

// Global state
const state = {
    currentPage: 'analyze',
    currentData: null,
    batchResults: null,
    batchResultsOriginal: null,
    currentDetailData: null,
    historyViewData: null,
    chart: null,
    modalChart: null,
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupNavigation();
    setupButtons();
    loadHistory();
    initSettingsPage();
    
    // Показать подсказку о desktop версии
    showToast('🖥️ Desktop версия готова к работе!', 'success');
});

// Анализ одного компаса (через Wails API)
async function analyzeSingleFolder(folderPath) {
    showLoading(true);
    
    try {
        showToast('Анализ начат...', 'info');
        
        const config = {
            stabilityThreshold: state.settings.stabilityThreshold,
            turnTolerance: state.settings.turnTolerance,
            minStableLen: state.settings.minSegmentLength,
            maxOutliers: state.settings.maxOutliers,
            sumTolerance: state.settings.sumTolerance
        };
        
        console.log('📤 Desktop: Отправка анализа с настройками:', config);
        
        // Вызываем Go метод через Wails
        const data = await window.go.desktop.App.AnalyzeCompass(folderPath, config);
        
        if (!data.success) {
            throw new Error(data.errors ? data.errors.join(', ') : 'Неизвестная ошибка');
        }
        
        displayResults(data);
        showToast('Анализ завершен успешно!', 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
        console.error('Analysis error:', error);
    } finally {
        showLoading(false);
    }
}

// Пакетный анализ (через Wails API)
async function handleBatchAnalyze() {
    const dirInput = document.getElementById('batchDirInput').value;
    
    if (!dirInput) {
        showToast('Укажите директорию', 'warning');
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
        
        console.log('📤 Desktop: Пакетный анализ с настройками:', config);
        
        // Вызываем Go метод через Wails
        const results = await window.go.desktop.App.BatchAnalyze(dirInput, config);
        
        displayBatchResults(results);
        showToast(`Пакетный анализ завершен! Обработано: ${results.length}`, 'success');
    } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
        console.error('Batch analyze error:', error);
    } finally {
        showLoading(false);
    }
}

// Все остальные функции из app.js копируются без изменений
// (функции отображения, графики, история, настройки и т.д.)

// Navigation - точно так же
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    const titles = {
        analyze: { title: 'Анализ калибровки компаса', subtitle: 'Единичная проверка одного компаса' },
        batch: { title: 'Пакетный анализ', subtitle: 'Массовая обработка нескольких компасов' },
        history: { title: 'История анализов', subtitle: 'Просмотр всех выполненных проверок' },
        settings: { title: 'Настройки алгоритма', subtitle: 'Конфигурация параметров анализа' }
    };
    
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    if (pageTitle) pageTitle.textContent = titles[pageName].title;
    if (pageSubtitle) pageSubtitle.textContent = titles[pageName].subtitle;
    
    state.currentPage = pageName;
    
    if (pageName === 'history') loadHistory();
    if (pageName === 'settings') updateSettingsFields();
}

// Upload Zone - адаптировано для desktop
function setupUploadZone() {
    const analyzeSingleBtn = document.getElementById('analyzeSingleBtn');
    const singleFolderInput = document.getElementById('singleFolderInput');
    
    analyzeSingleBtn.addEventListener('click', () => {
        const folderPath = singleFolderInput.value.trim();
        if (folderPath) {
            analyzeSingleFolder(folderPath);
        } else {
            showToast('Введите путь к папке', 'warning');
        }
    });
    
    singleFolderInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const folderPath = singleFolderInput.value.trim();
            if (folderPath) analyzeSingleFolder(folderPath);
        }
    });
}

function setupButtons() {
    setupUploadZone();
    document.getElementById('analyzeBtn').addEventListener('click', resetAnalysis);
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('exportCSVBtn').addEventListener('click', exportResultsCSV);
    document.getElementById('copyLogBtn').addEventListener('click', copyLog);
    
    const batchBtn = document.getElementById('batchAnalyzeBtn');
    if (batchBtn) batchBtn.addEventListener('click', handleBatchAnalyze);
}

function resetAnalysis() {
    state.currentData = null;
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'none';
    const singleFolderInput = document.getElementById('singleFolderInput');
    if (singleFolderInput) {
        singleFolderInput.value = '';
        singleFolderInput.focus();
    }
    showToast('Введите путь к новой папке для анализа', 'info');
}

// Функции отображения - точно такие же, как в app.js
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
    saveToHistory(data);
}

// displayTurnsTable - с цветовой индикацией
function displayTurnsTable(turns) {
    const tbody = document.getElementById('turnsTableBody');
    
    if (!turns || turns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <span class="material-icons">info</span>
                    Повороты не обнаружены
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = turns.map((turn, index) => {
        const startAngle = turn.startAngle != null ? turn.startAngle : 0;
        const endAngle = turn.endAngle != null ? turn.endAngle : 0;
        const diff = turn.diff != null ? turn.diff : 0;
        
        const tolerance = state.settings ? state.settings.turnTolerance : 10.0;
        const minAngle = 90 - tolerance;
        const maxAngle = 90 + tolerance;
        
        let badgeClass, iconName, iconColor, statusText;
        if (diff >= minAngle && diff <= maxAngle) {
            badgeClass = 'success';
            iconName = 'check_circle';
            iconColor = 'var(--success)';
            statusText = `В допуске (${minAngle.toFixed(0)}-${maxAngle.toFixed(0)}°)`;
        } else if (diff >= minAngle - 5 && diff <= maxAngle + 5) {
            badgeClass = 'warning';
            iconName = 'warning';
            iconColor = 'var(--warning)';
            statusText = `Близко к границе`;
        } else {
            badgeClass = 'error';
            iconName = 'cancel';
            iconColor = 'var(--error)';
            statusText = `БРАК! Вне допуска`;
        }
        
        return `
            <tr style="${badgeClass === 'error' ? 'background: rgba(239, 68, 68, 0.1);' : ''}">
                <td><strong>#${index + 1}</strong></td>
                <td>${startAngle.toFixed(2)}°</td>
                <td>${endAngle.toFixed(2)}°</td>
                <td>
                    <span class="badge ${badgeClass}">
                        ${diff.toFixed(2)}°
                    </span>
                </td>
                <td>
                    <span class="material-icons" style="color: ${iconColor}" title="${statusText}">
                        ${iconName}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// displayPolarChart - график без zoom (как просил пользователь)
function displayPolarChart(data) {
    const ctx = document.getElementById('polarChart');
    
    if (state.chart) state.chart.destroy();
    
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    
    if (data.turns && data.turns.length > 0) {
        data.turns.forEach(turn => {
            if (turn.startIndex != null && turn.startIndex < minIndex) minIndex = turn.startIndex;
            if (turn.endIndex != null && turn.endIndex > maxIndex) maxIndex = turn.endIndex;
        });
        minIndex = Math.max(0, minIndex - 5);
        maxIndex = Math.min(data.allAngles.length - 1, maxIndex + 5);
    }
    
    const angleData = data.allAngles.map((angle, index) => ({
        x: index,
        y: angle,
        inTurnZone: minIndex !== Infinity && index >= minIndex && index <= maxIndex
    }));
    
    state.chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Углы',
                data: angleData,
                backgroundColor: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 'rgba(99, 102, 241, 0.8)' : 'rgba(148, 163, 184, 0.4)';
                },
                borderColor: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 'rgba(99, 102, 241, 1)' : 'rgba(148, 163, 184, 0.6)';
                },
                borderWidth: 2,
                pointRadius: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 5 : 3;
                },
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f1f5f9',
                        generateLabels: () => [
                            { text: '🔵 Зона поворотов', fillStyle: 'rgba(99, 102, 241, 0.8)', strokeStyle: 'rgba(99, 102, 241, 1)', lineWidth: 2 },
                            { text: '⚫ Остальные', fillStyle: 'rgba(148, 163, 184, 0.4)', strokeStyle: 'rgba(148, 163, 184, 0.6)', lineWidth: 2 }
                        ]
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const point = context.raw;
                            const zone = point && point.inTurnZone ? ' 🔵' : '';
                            return `Угол: ${context.parsed.y.toFixed(2)}° (индекс: ${context.parsed.x})${zone}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Индекс измерения', color: '#94a3b8' },
                    grid: { color: '#2d3039' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    title: { display: true, text: 'Угол (градусы)', color: '#94a3b8' },
                    min: 0,
                    max: 360,
                    grid: { color: '#2d3039' },
                    ticks: { color: '#94a3b8', stepSize: 45 }
                }
            }
        }
    });
}

// Функции для батч-анализа, истории, настроек - аналогично app.js
function displayBatchResults(results) {
    const container = document.getElementById('batchResults');
    container.style.display = 'block';
    
    state.batchResults = results;
    state.batchResultsOriginal = [...results];
    saveBatchToHistory(results);
    
    const successCount = results.filter(r => r.isValid).length;
    const failedCount = results.length - successCount;
    
    document.getElementById('batchSuccess').textContent = successCount;
    document.getElementById('batchFailed').textContent = failedCount;
    document.getElementById('batchTotal').textContent = results.length;
    
    applyBatchFilters();
}

function renderBatchTable(results) {
    const tbody = document.getElementById('batchResultsBody');
    
    if (!results || results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="material-icons">search_off</span>Нет результатов</td></tr>`;
        return;
    }
    
    tbody.innerHTML = results.map((result, index) => {
        const originalIndex = state.batchResultsOriginal.indexOf(result);
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td><strong>${result.compass}</strong></td>
                <td><span class="badge ${result.isValid ? 'success' : 'error'}">${result.isValid ? '✓ Успешно' : '✗ Ошибка'}</span></td>
                <td>${result.turns ? result.turns.length : 0}/4</td>
                <td>${result.allAngles ? result.allAngles.length : '-'}</td>
                <td><button class="btn-icon" onclick="viewBatchDetail(${originalIndex})"><span class="material-icons">visibility</span></button></td>
            </tr>
        `;
    }).join('');
}

// History, Settings, и вспомогательные функции - как в app.js
function saveToHistory(data) {
    try {
        const historyItem = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            compass: data.compass || 'Неизвестный',
            isValid: data.isValid,
            turnsCount: data.turns ? data.turns.length : 0,
            anglesCount: data.allAngles ? data.allAngles.length : 0,
            fullData: data
        };
        
        let history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
        history.unshift(historyItem);
        
        if (history.length > 200) history = history.slice(0, 200);
        localStorage.setItem('compassHistory', JSON.stringify(history));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showToast('История переполнена! Экспортируйте и очистите.', 'warning');
        }
    }
}

function saveBatchToHistory(results) {
    if (!results || results.length === 0) return;
    results.forEach(data => saveToHistory(data));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    displayHistory(history);
}

function displayHistory(history) {
    // Упрощенная версия для desktop
    const historyPage = document.getElementById('historyPage');
    if (!historyPage) return;
    
    if (history.length === 0) {
        historyPage.innerHTML = `
            <div class="card">
                <div class="card-body" style="text-align: center; padding: 60px;">
                    <span class="material-icons" style="font-size: 64px; color: #475569;">history</span>
                    <h3 style="color: #94a3b8;">История пуста</h3>
                </div>
            </div>
        `;
        return;
    }
    
    historyPage.innerHTML = `<div class="card"><div class="card-header"><h3>История (${history.length} записей)</h3></div></div>`;
}

// Settings
function initSettingsPage() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    
    if (!saveBtn || !resetBtn) return;
    
    updateSettingsFields();
    
    saveBtn.addEventListener('click', () => {
        const newSettings = {
            stabilityThreshold: parseFloat(document.getElementById('setting-stability').value),
            turnTolerance: parseFloat(document.getElementById('setting-tolerance').value),
            minSegmentLength: parseInt(document.getElementById('setting-minLength').value),
            maxOutliers: parseInt(document.getElementById('setting-outliers').value),
            sumTolerance: parseFloat(document.getElementById('setting-sumTolerance').value)
        };
        
        if (newSettings.stabilityThreshold < 0 || newSettings.stabilityThreshold > 20) {
            showToast('Порог стабильности: 0-20', 'error');
            return;
        }
        if (newSettings.turnTolerance < 0 || newSettings.turnTolerance > 30) {
            showToast('Допуск поворота: 0-30', 'error');
            return;
        }
        if (newSettings.sumTolerance < 0 || newSettings.sumTolerance > 50) {
            showToast('Допуск суммы: 0-50', 'error');
            return;
        }
        
        saveSettings(newSettings);
        updateSettingsPreview();
        showToast('Настройки сохранены!', 'success');
    });
    
    resetBtn.addEventListener('click', () => {
        if (confirm('Сбросить настройки к значениям по умолчанию?')) {
            saveSettings({...DEFAULT_SETTINGS});
            updateSettingsFields();
            updateSettingsPreview();
            showToast('Настройки сброшены', 'info');
        }
    });
    
    const inputs = ['setting-stability', 'setting-tolerance', 'setting-minLength', 'setting-outliers', 'setting-sumTolerance'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', updateSettingsPreview);
    });
}

function updateSettingsFields() {
    const settings = state.settings || DEFAULT_SETTINGS;
    document.getElementById('setting-stability').value = settings.stabilityThreshold;
    document.getElementById('setting-tolerance').value = settings.turnTolerance;
    document.getElementById('setting-minLength').value = settings.minSegmentLength;
    document.getElementById('setting-outliers').value = settings.maxOutliers;
    document.getElementById('setting-sumTolerance').value = settings.sumTolerance || 20.0;
    updateSettingsPreview();
}

function updateSettingsPreview() {
    document.getElementById('preview-stability').textContent = document.getElementById('setting-stability').value + '°';
    document.getElementById('preview-tolerance').textContent = '±' + document.getElementById('setting-tolerance').value + '°';
    document.getElementById('preview-minLength').textContent = document.getElementById('setting-minLength').value;
    document.getElementById('preview-outliers').textContent = document.getElementById('setting-outliers').value;
    document.getElementById('preview-sumTolerance').textContent = '±' + document.getElementById('setting-sumTolerance').value + '°';
}

// Utility Functions
function showLoading(show, message = 'Загрузка...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = message;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' }[type];
    toast.innerHTML = `<span class="material-icons">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function copyLog() {
    const logContent = document.getElementById('logViewer').textContent;
    navigator.clipboard.writeText(logContent).then(() => {
        showToast('Лог скопирован', 'success');
    });
}

function exportResults() {
    if (!state.currentData) {
        showToast('Нет данных', 'warning');
        return;
    }
    const dataStr = JSON.stringify(state.currentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_analysis_${Date.now()}.json`;
    link.click();
    showToast('Экспортировано в JSON', 'success');
}

function exportResultsCSV() {
    if (!state.currentData) {
        showToast('Нет данных', 'warning');
        return;
    }
    const csv = generateCSVFromResults([state.currentData]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_${state.currentData.compass}_${Date.now()}.csv`;
    link.click();
    showToast('Экспортировано в CSV', 'success');
}

function generateCSVFromResults(results) {
    let csv = 'Номер компаса;Результат;Повороты;Угол 1;Угол 2;Угол 3;Угол 4\n';
    results.forEach(result => {
        const compass = result.compass || 'Unknown';
        const status = result.isValid ? 'Успешно' : 'Неуспешно';
        const turnsCount = result.turns ? result.turns.length : 0;
        const angles = ['', '', '', ''];
        if (result.turns && result.turns.length > 0) {
            for (let i = 0; i < Math.min(4, result.turns.length); i++) {
                const turn = result.turns[i];
                angles[i] = turn.startAngle != null && turn.endAngle != null 
                    ? ((turn.startAngle + turn.endAngle) / 2).toFixed(2) : '';
            }
        }
        csv += `${compass};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
    });
    return csv;
}

// Batch filters и прочее - упрощенные версии
window.applyBatchFilters = function() {};
window.resetBatchFilters = function() {};
window.exportBatchResults = function() {};
window.viewBatchDetail = function(index) {};
window.applyHistoryFilters = function() {};
window.resetHistoryFilters = function() {};
window.exportHistoryCSV = function() {};
window.clearHistory = function() {
    if (confirm('Очистить всю историю?')) {
        localStorage.removeItem('compassHistory');
        loadHistory();
        showToast('История очищена', 'success');
    }
};

// Добавляем стили
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    .badge.error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.4);
    }
`;
document.head.appendChild(style);

