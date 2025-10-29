// Global state
const state = {
    currentPage: 'analyze',
    currentData: null,
    batchResults: null,
    batchResultsOriginal: null,
    currentDetailData: null,
    historyViewData: null,
    chart: null,
    settings: null
};

// Default settings
const DEFAULT_SETTINGS = {
    stabilityThreshold: 5.0,      // Порог стабильности (градусы)
    turnTolerance: 10.0,          // Допуск поворота (градусы)
    minSegmentLength: 3,          // Минимальная длина сегмента
    maxOutliers: 2                // Максимум выбросов (гистерезис)
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('compassSettings');
    if (saved) {
        try {
            state.settings = JSON.parse(saved);
            console.log('⚙️ Настройки загружены:', state.settings);
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
            state.settings = {...DEFAULT_SETTINGS};
        }
    } else {
        state.settings = {...DEFAULT_SETTINGS};
    }
    return state.settings;
}

// Save settings to localStorage
function saveSettings(settings) {
    state.settings = settings;
    localStorage.setItem('compassSettings', JSON.stringify(settings));
    console.log('💾 Настройки сохранены:', settings);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // Загрузить настройки
    loadSettings();
    
    setupNavigation();
    setupUploadZone();
    setupButtons();
    
    // Инициализация страницы истории при загрузке
    loadHistory();
    
    // Инициализация страницы настроек
    initSettingsPage();
}

// Navigation
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
    // Update nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`).classList.add('active');
    
    // Update header
    const titles = {
        analyze: {
            title: 'Анализ калибровки компаса',
            subtitle: 'Единичная проверка одного компаса'
        },
        batch: {
            title: 'Пакетный анализ',
            subtitle: 'Массовая обработка нескольких компасов с фильтрацией и сортировкой'
        },
        history: {
            title: 'История анализов',
            subtitle: 'Просмотр всех выполненных проверок с группировкой по дням'
        },
        settings: {
            title: 'Настройки алгоритма',
            subtitle: 'Конфигурация параметров анализа калибровки'
        }
    };
    
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (pageTitle) pageTitle.textContent = titles[pageName].title;
    if (pageSubtitle) pageSubtitle.textContent = titles[pageName].subtitle;
    
    state.currentPage = pageName;
    
    // Загрузить историю при переключении на страницу истории
    if (pageName === 'history') {
        loadHistory();
    }
    
    // Обновить настройки при переключении на страницу настроек
    if (pageName === 'settings') {
        updateSettingsFields();
    }
}

// Upload Zone
function setupUploadZone() {
    const analyzeSingleBtn = document.getElementById('analyzeSingleBtn');
    const singleFolderInput = document.getElementById('singleFolderInput');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const folderInput = document.getElementById('folderInput');
    
    // Обработчик кнопки анализа (ввод вручную)
    analyzeSingleBtn.addEventListener('click', () => {
        const folderPath = singleFolderInput.value.trim();
        if (folderPath) {
            analyzeSingleFolder(folderPath);
        } else {
            showToast('Введите путь к папке', 'warning');
        }
    });
    
    // Обработчик Enter в поле ввода
    singleFolderInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const folderPath = singleFolderInput.value.trim();
            if (folderPath) {
                analyzeSingleFolder(folderPath);
            }
        }
    });
    
    // Обработчик кнопки выбора папки
    selectFolderBtn.addEventListener('click', () => {
        folderInput.click();
    });
    
    // Обработчик выбора папки
    folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const firstFile = e.target.files[0];
            const folderName = firstFile.webkitRelativePath.split('/')[0];
            
            // Пытаемся угадать родительский путь из текущего значения
            let suggestedPath = 'H:\\Study\\Успешно';
            const currentValue = singleFolderInput.value.trim();
            if (currentValue) {
                // Берем родительский путь из текущего значения
                const lastSlash = Math.max(currentValue.lastIndexOf('\\'), currentValue.lastIndexOf('/'));
                if (lastSlash > 0) {
                    suggestedPath = currentValue.substring(0, lastSlash);
                }
            }
            
            // Браузер не может дать полный путь, поэтому спрашиваем у пользователя
            const parentPath = prompt(
                `📁 Выбрана папка: "${folderName}"\n\n` +
                `⚠️ Браузер не может определить полный путь.\n\n` +
                `Введите РОДИТЕЛЬСКИЙ путь (папку, где находится "${folderName}"):\n\n` +
                `Примеры:\n` +
                `  H:\\Study\\Успешно\n` +
                `  H:\\Study\\Брак\n` +
                `  C:\\Data\\Compasses\n\n` +
                `⚡ ВАЖНО: НЕ добавляйте имя папки в конец!`,
                suggestedPath
            );
            
            if (parentPath && parentPath.trim()) {
                // Убираем возможные слеши в конце
                let cleanPath = parentPath.trim().replace(/[\\\/]+$/, '');
                
                // Проверка: если пользователь случайно добавил имя папки в конец, убираем его
                if (cleanPath.endsWith(folderName)) {
                    cleanPath = cleanPath.substring(0, cleanPath.length - folderName.length).replace(/[\\\/]+$/, '');
                }
                
                // Формируем полный путь
                const fullPath = `${cleanPath}\\${folderName}`;
                
                console.log('🔍 Выбор папки:', {
                    folderName,
                    parentPath: cleanPath,
                    fullPath
                });
                
                // ЗАМЕНЯЕМ значение в поле ввода
                singleFolderInput.value = fullPath;
                analyzeSingleFolder(fullPath);
            } else {
                showToast('Анализ отменён - путь не указан', 'info');
            }
            
            // Сбросить input для повторного выбора
            folderInput.value = '';
        }
    });
}

async function analyzeSingleFolder(folderPath) {
    showLoading(true);
    
    try {
        showToast('Анализ начат...', 'info');
        
        // Отправляем реальный запрос на сервер
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ folderPath: folderPath })
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        
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


// Buttons
function setupButtons() {
    document.getElementById('analyzeBtn').addEventListener('click', () => {
        // Сбросить текущие результаты и показать зону загрузки
        resetAnalysis();
    });
    
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    document.getElementById('exportCSVBtn').addEventListener('click', exportResultsCSV);
    document.getElementById('copyLogBtn').addEventListener('click', copyLog);
    
    // Batch analyze
    const batchBtn = document.getElementById('batchAnalyzeBtn');
    if (batchBtn) {
        batchBtn.addEventListener('click', handleBatchAnalyze);
    }
}

function resetAnalysis() {
    state.currentData = null;
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'none';
    
    // Очистить поле ввода
    const singleFolderInput = document.getElementById('singleFolderInput');
    if (singleFolderInput) {
        singleFolderInput.value = '';
        singleFolderInput.focus();
    }
    
    showToast('Введите путь к новой папке для анализа', 'info');
}

async function handleBatchAnalyze() {
    const dirInput = document.getElementById('batchDirInput').value;
    
    if (!dirInput) {
        showToast('Укажите директорию', 'warning');
        return;
    }
    
    // Используем потоковую обработку
    await handleBatchAnalyzeStream(dirInput);
}

async function handleBatchAnalyzeStream(dataDir) {
    showLoading(true, 'Подготовка к анализу...');
    
    const results = [];
    let currentProgress = 0;
    let totalFiles = 0;
    
    try {
        const response = await fetch('/api/batch-analyze-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dataDir })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Обрабатываем полные сообщения SSE
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Сохраняем неполное сообщение
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    try {
                        const message = JSON.parse(jsonStr);
                        
                        if (message.type === 'progress') {
                            currentProgress = message.current;
                            totalFiles = message.total;
                            showLoading(true, `Анализ: ${message.compass} (${currentProgress}/${totalFiles})`);
                        } else if (message.type === 'result') {
                            results.push(message.result);
                        } else if (message.type === 'complete') {
                            console.log('✅ Пакетный анализ завершен');
                        }
                    } catch (e) {
                        console.error('Ошибка парсинга JSON:', e, jsonStr);
                    }
                }
            }
        }
        
        // Показываем результаты
        displayBatchResults(results);
        showToast(`Пакетный анализ завершен! Обработано: ${totalFiles}`, 'success');
        
    } catch (error) {
        console.error('Batch analyze error:', error);
        showToast(`Ошибка: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function displayBatchResults(results) {
    const container = document.getElementById('batchResults');
    
    container.style.display = 'block';
    
    // Сохраняем оригинальные результаты
    state.batchResults = results;
    state.batchResultsOriginal = [...results];
    
    // Сохраняем пакетную обработку в историю
    saveBatchToHistory(results);
    
    console.log('Batch results saved:', results.length, 'items');
    console.log('First result sample:', results[0]);
    
    const successCount = results.filter(r => r.isValid).length;
    const failedCount = results.length - successCount;
    
    document.getElementById('batchSuccess').textContent = successCount;
    document.getElementById('batchFailed').textContent = failedCount;
    document.getElementById('batchTotal').textContent = results.length;
    
    // Применяем фильтры (по умолчанию показываем всё)
    applyBatchFilters();
}

function renderBatchTable(results) {
    const tbody = document.getElementById('batchResultsBody');
    
    if (!results || results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="material-icons">search_off</span>
                    Нет результатов для отображения
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = results.map((result, index) => {
        // Найти оригинальный индекс для viewBatchDetail
        const originalIndex = state.batchResultsOriginal.indexOf(result);
        
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
            <td><strong>${result.compass}</strong></td>
            <td>
                <span class="badge ${result.isValid ? 'success' : 'error'}">
                        ${result.isValid ? '✓ Успешно' : '✗ Ошибка'}
                </span>
            </td>
                <td>${result.turns ? result.turns.length : 0}/4</td>
                <td>${result.allAngles ? result.allAngles.length : '-'}</td>
            <td>
                    <button class="btn-icon" onclick="viewBatchDetail(${originalIndex})" title="Посмотреть детали">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

window.applyBatchFilters = function() {
    const statusFilter = document.getElementById('batchStatusFilter').value;
    const sortFilter = document.getElementById('batchSortFilter').value;
    
    if (!state.batchResultsOriginal) {
        console.error('No batch results to filter');
        return;
    }
    
    let filtered = [...state.batchResultsOriginal];
    
    // Фильтр по статусу
    if (statusFilter === 'success') {
        filtered = filtered.filter(r => r.isValid);
    } else if (statusFilter === 'failed') {
        filtered = filtered.filter(r => !r.isValid);
    }
    
    // Сортировка
    switch(sortFilter) {
        case 'name-asc':
            filtered.sort((a, b) => (a.compass || '').localeCompare(b.compass || ''));
            break;
        case 'name-desc':
            filtered.sort((a, b) => (b.compass || '').localeCompare(a.compass || ''));
            break;
        case 'status-success':
            filtered.sort((a, b) => (b.isValid ? 1 : 0) - (a.isValid ? 1 : 0));
            break;
        case 'status-failed':
            filtered.sort((a, b) => (a.isValid ? 1 : 0) - (b.isValid ? 1 : 0));
            break;
        case 'turns-desc':
            filtered.sort((a, b) => {
                const aTurns = a.turns ? a.turns.length : 0;
                const bTurns = b.turns ? b.turns.length : 0;
                return bTurns - aTurns;
            });
            break;
        case 'turns-asc':
            filtered.sort((a, b) => {
                const aTurns = a.turns ? a.turns.length : 0;
                const bTurns = b.turns ? b.turns.length : 0;
                return aTurns - bTurns;
            });
            break;
    }
    
    console.log(`📊 Фильтрация пакетных результатов: статус=${statusFilter}, сортировка=${sortFilter}, показано=${filtered.length}/${state.batchResultsOriginal.length}`);
    
    renderBatchTable(filtered);
}

window.resetBatchFilters = function() {
    document.getElementById('batchStatusFilter').value = 'all';
    document.getElementById('batchSortFilter').value = 'name-asc';
    applyBatchFilters();
    showToast('Фильтры сброшены', 'info');
}

window.exportBatchResults = function() {
    if (!state.batchResultsOriginal || state.batchResultsOriginal.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    // Создаем CSV
    const csv = generateCSVFromResults(state.batchResultsOriginal);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_analysis_${Date.now()}.csv`;
    link.click();
    
    showToast(`Экспортировано ${state.batchResultsOriginal.length} результатов в CSV`, 'success');
}

// Генерация CSV из результатов
function generateCSVFromResults(results) {
    // Заголовок CSV
    let csv = 'Номер компаса;Результат;Повороты;Угол 1;Угол 2;Угол 3;Угол 4\n';
    
    results.forEach(result => {
        const compass = result.compass || 'Unknown';
        
        // Определяем результат
        let status = 'Неуспешно';
        if (result.isValid && result.turns && result.turns.length >= 4) {
            status = 'Успешно';
        } else if (result.turns && result.turns.length >= 4) {
            status = 'Прошел'; // 4+ поворота, но не прошел другие критерии
        }
        
        const turnsCount = result.turns ? result.turns.length : 0;
        
        // Извлекаем 4 средних угла из поворотов (если есть)
        const angles = ['', '', '', ''];
        if (result.turns && result.turns.length > 0) {
            for (let i = 0; i < Math.min(4, result.turns.length); i++) {
                const turn = result.turns[i];
                // Средний угол между началом и концом поворота
                const avgAngle = turn.startAngle != null && turn.endAngle != null 
                    ? ((turn.startAngle + turn.endAngle) / 2).toFixed(2)
                    : '';
                angles[i] = avgAngle;
            }
        }
        
        // Добавляем строку
        csv += `${compass};${status};${turnsCount};${angles[0]};${angles[1]};${angles[2]};${angles[3]}\n`;
    });
    
    return csv;
}

// Results Display
function displayResults(data) {
    console.log('displayResults: Received data:', data);
    console.log('displayResults: data.turns:', data.turns);
    console.log('displayResults: data.allAngles length:', data.allAngles ? data.allAngles.length : 'undefined');
    
    state.currentData = data;
    
    // Show results section
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    // Update stats
    document.getElementById('statValid').textContent = data.isValid ? '✓ Валидно' : '✗ Не прошло';
    document.getElementById('statValid').style.color = data.isValid ? 'var(--success)' : 'var(--error)';
    document.getElementById('statTurns').textContent = data.turns ? data.turns.length : 0;
    document.getElementById('statSegments').textContent = data.segments ? data.segments.length : 0;
    document.getElementById('statAngles').textContent = data.allAngles ? data.allAngles.length : 0;
    
    // Update turns table
    displayTurnsTable(data.turns);
    
    // Display polar chart
    displayPolarChart(data);
    
    // Display log
    if (data.log) {
        document.getElementById('logViewer').textContent = data.log;
    }
    
    document.getElementById('turnsBadge').textContent = data.turns.length;
    
    // Сохранить в историю
    saveToHistory(data);
}

// History Management
function saveToHistory(data) {
    try {
        const historyItem = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            compass: data.compass || 'Неизвестный',
            isValid: data.isValid,
            turnsCount: data.turns ? data.turns.length : 0,
            anglesCount: data.allAngles ? data.allAngles.length : 0,
            // Сохраняем полные данные для детального просмотра
            fullData: data
        };
        
        let history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
        history.unshift(historyItem); // Добавить в начало
        
        // Ограничить историю 200 элементами
        if (history.length > 200) {
            history = history.slice(0, 200);
        }
        
        // Пробуем сохранить
        localStorage.setItem('compassHistory', JSON.stringify(history));
        console.log('💾 Сохранено в историю:', historyItem.compass);
        
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // localStorage переполнен!
            const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
            const historySize = new Blob([JSON.stringify(history)]).size;
            const historySizeMB = (historySize / (1024 * 1024)).toFixed(2);
            
            console.error('❌ История переполнена:', historySizeMB, 'МБ,', history.length, 'записей');
            
            // Показываем модальное окно с предупреждением
            showQuotaExceededModal(history.length, historySizeMB);
        } else {
            console.error('❌ Ошибка сохранения в историю:', e);
            showToast('Ошибка сохранения в историю', 'error');
        }
    }
}

// Показать модальное окно о переполнении хранилища
function showQuotaExceededModal(recordsCount, sizeMB) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: var(--error); color: white;">
                <h3>⚠️ История переполнена!</h3>
            </div>
            <div class="modal-body">
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">
                    <strong>📊 Текущее состояние:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>Записей в истории: <strong>${recordsCount}</strong></li>
                        <li>Размер данных: <strong>~${sizeMB} МБ</strong></li>
                        <li>Лимит браузера: <strong>~5-10 МБ</strong></li>
                    </ul>
                </div>
                
                <p><strong>❌ Новые результаты НЕ МОГУТ быть сохранены</strong></p>
                
                <p style="margin-top: 1rem;">Рекомендуемые действия:</p>
                <ol style="padding-left: 1.5rem;">
                    <li><strong>Экспортируйте важные данные:</strong>
                        <ul style="margin-top: 0.5rem;">
                            <li>Перейдите во вкладку "История"</li>
                            <li>Примените нужные фильтры</li>
                            <li>Нажмите "Экспорт CSV" для сохранения</li>
                        </ul>
                    </li>
                    <li style="margin-top: 0.5rem;"><strong>Очистите историю:</strong>
                        <ul style="margin-top: 0.5rem;">
                            <li>Нажмите "Очистить историю" во вкладке "История"</li>
                            <li>Или используйте кнопку ниже для быстрой очистки</li>
                        </ul>
                    </li>
                </ol>
                
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 1rem; margin-top: 1rem;">
                    <strong>💡 Совет:</strong> Регулярно экспортируйте историю в CSV и очищайте старые записи
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeQuotaModal()">
                    Отмена
                </button>
                <button class="btn btn-primary" onclick="goToHistoryFromQuota()">
                    Перейти к Истории
                </button>
                <button class="btn btn-error" onclick="clearHistoryFromQuota()">
                    🗑️ Очистить сейчас
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Глобальные функции для кнопок модального окна
window.closeQuotaModal = function() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

window.goToHistoryFromQuota = function() {
    closeQuotaModal();
    switchPage('history');
}

window.clearHistoryFromQuota = function() {
    if (confirm('Удалить ВСЮ историю? Это действие необратимо!')) {
        localStorage.removeItem('compassHistory');
        closeQuotaModal();
        showToast('История очищена! Теперь можно сохранять новые результаты.', 'success');
        // Обновить историю если открыта
        if (state.currentPage === 'history') {
            loadHistory();
        }
    }
}

// Сохранить пакетную обработку в историю
function saveBatchToHistory(results) {
    if (!results || results.length === 0) return;
    
    results.forEach(data => {
        saveToHistory(data);
    });
    
    console.log(`💾 Сохранено в историю ${results.length} результатов пакетной обработки`);
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    displayHistory(history);
}

function displayHistory(history) {
    const historyPage = document.getElementById('historyPage');
    
    if (!historyPage) return;
    
    if (history.length === 0) {
        historyPage.innerHTML = `
            <div class="card">
                <div class="card-body" style="text-align: center; padding: 60px 20px;">
                    <span class="material-icons" style="font-size: 64px; color: #475569; margin-bottom: 20px;">history</span>
                    <h3 style="color: #94a3b8; margin-bottom: 10px;">История пуста</h3>
                    <p style="color: #64748b;">Результаты анализов будут отображаться здесь</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Группируем по датам
    const groupedByDate = {};
    history.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString('ru-RU');
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });
    
    // Сортируем даты (новые вверху)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'));
    });
    
    // Определяем уникальные даты для фильтра
    const uniqueDates = [...new Set(history.map(item => 
        new Date(item.timestamp).toLocaleDateString('ru-RU')
    ))].sort((a, b) => {
        return new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'));
    });
    
    const today = new Date().toLocaleDateString('ru-RU');
    
    historyPage.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>История анализов</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">
                        Всего записей: ${history.length} | Группировка по дням
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="exportHistoryCSV()">
                        <span class="material-icons">table_chart</span>
                        Экспорт CSV
                    </button>
                    <button class="btn btn-secondary" onclick="clearHistory()">
                        <span class="material-icons">delete</span>
                        Очистить
                    </button>
                </div>
            </div>
            
            <!-- Панель фильтров -->
            <div class="filter-panel">
                <div class="filter-group">
                    <label>
                        <span class="material-icons" style="font-size: 18px;">filter_list</span>
                        Статус:
                    </label>
                    <select id="historyStatusFilter" class="form-control" onchange="applyHistoryFilters()">
                        <option value="all">Все результаты</option>
                        <option value="success">✓ Только успешные</option>
                        <option value="failed">✗ Только с ошибками</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>
                        <span class="material-icons" style="font-size: 18px;">calendar_today</span>
                        Дата:
                    </label>
                    <select id="historyDateFilter" class="form-control" onchange="applyHistoryFilters()">
                        <option value="all">Весь период</option>
                        <option value="${today}" selected>Сегодня (${today})</option>
                        ${uniqueDates.filter(d => d !== today).map(date => 
                            `<option value="${date}">${date}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="filter-group">
                    <button class="btn btn-outline" onclick="resetHistoryFilters()">
                        <span class="material-icons">refresh</span>
                        Сбросить
                    </button>
                </div>
            </div>
            
            <div class="card-body" id="historyContent">
                ${sortedDates.map((date, dateIndex) => {
                    const items = groupedByDate[date];
                    const successCount = items.filter(i => i.isValid).length;
                    const failCount = items.length - successCount;
                    
                    return `
                        <div class="history-date-group">
                            <div class="history-date-header" onclick="toggleHistoryGroup('group-${dateIndex}')">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span class="material-icons">calendar_today</span>
                                    <div>
                                        <h4 style="margin: 0; color: var(--text-primary);">${date}</h4>
                                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                                            ${items.length} анализов: 
                                            <span style="color: var(--success);">✓ ${successCount}</span> | 
                                            <span style="color: var(--error);">✗ ${failCount}</span>
                                        </p>
                                    </div>
                                </div>
                                <span class="material-icons expand-icon">expand_more</span>
                            </div>
                            <div class="history-date-content" id="group-${dateIndex}" style="display: none;">
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Время</th>
                                                <th>Компас</th>
                                                <th>Статус</th>
                                                <th>Повороты</th>
                                                <th>Измерений</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${items.map(item => `
                                                <tr>
                                                    <td>${new Date(item.timestamp).toLocaleTimeString('ru-RU')}</td>
                                                    <td><strong>${item.compass}</strong></td>
                                                    <td>
                                                        <span class="badge ${item.isValid ? 'success' : 'error'}">
                                                            ${item.isValid ? '✓ Успешно' : '✗ Ошибка'}
                                                        </span>
                                                    </td>
                                                    <td>${item.turnsCount}/4</td>
                                                    <td>${item.anglesCount}</td>
                                                    <td>
                                                        <button class="btn-icon" onclick="viewHistoryDetail('${item.id}')" title="Посмотреть детали">
                                                            <span class="material-icons">visibility</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Применяем фильтры сразу после отрисовки
    setTimeout(() => applyHistoryFilters(), 100);
}

window.applyHistoryFilters = function() {
    const statusFilter = document.getElementById('historyStatusFilter').value;
    const dateFilter = document.getElementById('historyDateFilter').value;
    
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    
    // Фильтруем по статусу
    let filtered = history;
    if (statusFilter === 'success') {
        filtered = filtered.filter(item => item.isValid);
    } else if (statusFilter === 'failed') {
        filtered = filtered.filter(item => !item.isValid);
    }
    
    // Фильтруем по дате
    if (dateFilter !== 'all') {
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.timestamp).toLocaleDateString('ru-RU');
            return itemDate === dateFilter;
        });
    }
    
    console.log(`📊 Фильтрация: статус=${statusFilter}, дата=${dateFilter}, результатов=${filtered.length}`);
    
    // Обновляем отображение
    renderFilteredHistory(filtered);
}

window.resetHistoryFilters = function() {
    document.getElementById('historyStatusFilter').value = 'all';
    document.getElementById('historyDateFilter').value = new Date().toLocaleDateString('ru-RU');
    applyHistoryFilters();
    showToast('Фильтры сброшены', 'info');
}

function renderFilteredHistory(filteredHistory) {
    const contentDiv = document.getElementById('historyContent');
    
    if (!contentDiv) {
        console.error('historyContent not found');
        return;
    }
    
    if (filteredHistory.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <span class="material-icons" style="font-size: 48px; color: #475569; margin-bottom: 15px;">search_off</span>
                <h4 style="color: #94a3b8;">Нет результатов</h4>
                <p style="color: #64748b;">Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    // Группируем отфильтрованные данные по датам
    const groupedByDate = {};
    filteredHistory.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString('ru-RU');
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });
    
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'));
    });
    
    contentDiv.innerHTML = sortedDates.map((date, dateIndex) => {
        const items = groupedByDate[date];
        const successCount = items.filter(i => i.isValid).length;
        const failCount = items.length - successCount;
        
        return `
            <div class="history-date-group">
                <div class="history-date-header" onclick="toggleHistoryGroup('group-${dateIndex}')">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="material-icons">calendar_today</span>
                        <div>
                            <h4 style="margin: 0; color: var(--text-primary);">${date}</h4>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                                ${items.length} анализов: 
                                <span style="color: var(--success);">✓ ${successCount}</span> | 
                                <span style="color: var(--error);">✗ ${failCount}</span>
                            </p>
                        </div>
                    </div>
                    <span class="material-icons expand-icon">expand_more</span>
                </div>
                <div class="history-date-content" id="group-${dateIndex}" style="display: none;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Время</th>
                                    <th>Компас</th>
                                    <th>Статус</th>
                                    <th>Повороты</th>
                                    <th>Измерений</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${new Date(item.timestamp).toLocaleTimeString('ru-RU')}</td>
                                        <td><strong>${item.compass}</strong></td>
                                        <td>
                                            <span class="badge ${item.isValid ? 'success' : 'error'}">
                                                ${item.isValid ? '✓ Успешно' : '✗ Ошибка'}
                                            </span>
                                        </td>
                                        <td>${item.turnsCount}/4</td>
                                        <td>${item.anglesCount}</td>
                                        <td>
                                            <button class="btn-icon" onclick="viewHistoryDetail('${item.id}')" title="Посмотреть детали">
                                                <span class="material-icons">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Автоматически развернуть первую группу
    if (sortedDates.length > 0) {
        setTimeout(() => toggleHistoryGroup('group-0'), 100);
    }
}

window.applyHistoryFilters = function() {
    const statusFilter = document.getElementById('historyStatusFilter').value;
    const dateFilter = document.getElementById('historyDateFilter').value;
    
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    
    // Фильтруем по статусу
    let filtered = history;
    if (statusFilter === 'success') {
        filtered = filtered.filter(item => item.isValid);
    } else if (statusFilter === 'failed') {
        filtered = filtered.filter(item => !item.isValid);
    }
    
    // Фильтруем по дате
    if (dateFilter !== 'all') {
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.timestamp).toLocaleDateString('ru-RU');
            return itemDate === dateFilter;
        });
    }
    
    console.log(`📊 Фильтрация: статус=${statusFilter}, дата=${dateFilter}, результатов=${filtered.length}`);
    
    // Обновляем отображение
    renderFilteredHistory(filtered);
}

window.resetHistoryFilters = function() {
    document.getElementById('historyStatusFilter').value = 'all';
    document.getElementById('historyDateFilter').value = new Date().toLocaleDateString('ru-RU');
    applyHistoryFilters();
    showToast('Фильтры сброшены', 'info');
}

function renderFilteredHistory(filteredHistory) {
    const contentDiv = document.getElementById('historyContent');
    
    if (!contentDiv) {
        console.error('historyContent not found');
        return;
    }
    
    if (filteredHistory.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <span class="material-icons" style="font-size: 48px; color: #475569; margin-bottom: 15px;">search_off</span>
                <h4 style="color: #94a3b8;">Нет результатов</h4>
                <p style="color: #64748b;">Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    // Группируем отфильтрованные данные по датам
    const groupedByDate = {};
    filteredHistory.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString('ru-RU');
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });
    
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return new Date(b.split('.').reverse().join('-')) - new Date(a.split('.').reverse().join('-'));
    });
    
    contentDiv.innerHTML = sortedDates.map((date, dateIndex) => {
        const items = groupedByDate[date];
        const successCount = items.filter(i => i.isValid).length;
        const failCount = items.length - successCount;
        
        return `
            <div class="history-date-group">
                <div class="history-date-header" onclick="toggleHistoryGroup('filtered-group-${dateIndex}')">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="material-icons">calendar_today</span>
                        <div>
                            <h4 style="margin: 0; color: var(--text-primary);">${date}</h4>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                                ${items.length} анализов: 
                                <span style="color: var(--success);">✓ ${successCount}</span> | 
                                <span style="color: var(--error);">✗ ${failCount}</span>
                            </p>
                        </div>
                    </div>
                    <span class="material-icons expand-icon">expand_more</span>
                </div>
                <div class="history-date-content" id="filtered-group-${dateIndex}" style="display: none;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Время</th>
                                    <th>Компас</th>
                                    <th>Статус</th>
                                    <th>Повороты</th>
                                    <th>Измерений</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${new Date(item.timestamp).toLocaleTimeString('ru-RU')}</td>
                                        <td><strong>${item.compass}</strong></td>
                                        <td>
                                            <span class="badge ${item.isValid ? 'success' : 'error'}">
                                                ${item.isValid ? '✓ Успешно' : '✗ Ошибка'}
                                            </span>
                                        </td>
                                        <td>${item.turnsCount}/4</td>
                                        <td>${item.anglesCount}</td>
                                        <td>
                                            <button class="btn-icon" onclick="viewHistoryDetail('${item.id}')" title="Посмотреть детали">
                                                <span class="material-icons">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Автоматически развернуть первую группу
    if (sortedDates.length > 0) {
        setTimeout(() => toggleHistoryGroup('filtered-group-0'), 100);
    }
}

window.toggleHistoryGroup = function(groupId) {
    const content = document.getElementById(groupId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.expand-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
}

window.viewHistoryDetail = function(itemId) {
    console.log('viewHistoryDetail called with id:', itemId);
    
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    const item = history.find(h => h.id === itemId);
    
    if (!item || !item.fullData) {
        showToast('Данные не найдены или устарели', 'error');
        console.error('Item not found:', itemId);
        return;
    }
    
    console.log('History item data:', item.fullData);
    
    // Используем ту же функцию, что и для пакетного просмотра
    // Создаем временный массив для индекса
    state.historyViewData = item.fullData;
    viewBatchDetailFromData(item.fullData);
}

window.exportHistoryCSV = function() {
    const history = JSON.parse(localStorage.getItem('compassHistory') || '[]');
    
    if (history.length === 0) {
        showToast('История пуста', 'warning');
        return;
    }
    
    // Получаем текущие фильтры
    const statusFilter = document.getElementById('historyStatusFilter');
    const dateFilter = document.getElementById('historyDateFilter');
    
    let filtered = history;
    
    // Применяем фильтры если они есть
    if (statusFilter && statusFilter.value !== 'all') {
        if (statusFilter.value === 'success') {
            filtered = filtered.filter(item => item.isValid);
        } else if (statusFilter.value === 'failed') {
            filtered = filtered.filter(item => !item.isValid);
        }
    }
    
    if (dateFilter && dateFilter.value !== 'all') {
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.timestamp).toLocaleDateString('ru-RU');
            return itemDate === dateFilter.value;
        });
    }
    
    // Преобразуем историю в формат для CSV (используя fullData)
    const resultsForCSV = filtered.map(item => item.fullData).filter(data => data != null);
    
    if (resultsForCSV.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    const csv = generateCSVFromResults(resultsForCSV);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `history_export_${Date.now()}.csv`;
    link.click();
    
    showToast(`Экспортировано ${resultsForCSV.length} записей в CSV`, 'success');
}

window.clearHistory = function() {
    if (confirm('Вы уверены, что хотите очистить всю историю?')) {
        localStorage.removeItem('compassHistory');
        loadHistory();
        showToast('История очищена', 'success');
    }
}

// (Удалено - дубликат функции перенесен ниже)

function displayTurnsTable(turns) {
    const tbody = document.getElementById('turnsTableBody');
    
    console.log('displayTurnsTable: turns =', turns);
    
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
        // Безопасное получение значений с проверкой на undefined
        const startAngle = turn.startAngle != null ? turn.startAngle : 0;
        const endAngle = turn.endAngle != null ? turn.endAngle : 0;
        const diff = turn.diff != null ? turn.diff : 0;
        
        const isValid = Math.abs(diff - 90) <= 10;
        
        console.log(`Turn ${index + 1}:`, { startAngle, endAngle, diff, original: turn });
        
        return `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${startAngle.toFixed(2)}°</td>
                <td>${endAngle.toFixed(2)}°</td>
                <td>
                    <span class="badge ${isValid ? 'success' : 'warning'}">
                        ${diff.toFixed(2)}°
                    </span>
                </td>
                <td>
                    <span class="material-icons" style="color: ${isValid ? 'var(--success)' : 'var(--warning)'}">
                        ${isValid ? 'check_circle' : 'warning'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function displayPolarChart(data) {
    const ctx = document.getElementById('polarChart');
    
    if (state.chart) {
        state.chart.destroy();
    }
    
    // Определяем диапазон поворотов для выделения
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    
    if (data.turns && data.turns.length > 0) {
        data.turns.forEach(turn => {
            if (turn.startIndex != null && turn.startIndex < minIndex) {
                minIndex = turn.startIndex;
            }
            if (turn.endIndex != null && turn.endIndex > maxIndex) {
                maxIndex = turn.endIndex;
            }
        });
        
        // Добавляем запас: 5 замеров до и после
        minIndex = Math.max(0, minIndex - 5);
        maxIndex = Math.min(data.allAngles.length - 1, maxIndex + 5);
        
        console.log(`📍 Зона поворотов: индексы ${minIndex} - ${maxIndex}`);
    }
    
    // Prepare data for polar chart с цветовым кодированием
    const angleData = data.allAngles.map((angle, index) => {
        // Определяем цвет точки в зависимости от того, в зоне поворотов или нет
        const isInTurnZone = minIndex !== Infinity && index >= minIndex && index <= maxIndex;
        
        return {
        x: index,
            y: angle,
            // Сохраняем информацию для кастомного цвета
            inTurnZone: isInTurnZone
        };
    });
    
    state.chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Углы',
                data: angleData,
                backgroundColor: (context) => {
                    const point = context.raw;
                    // Яркий синий для зоны поворотов, приглушенный серый для остальных
                    return point && point.inTurnZone ? 
                        'rgba(99, 102, 241, 0.8)' :      // Яркий синий
                        'rgba(148, 163, 184, 0.4)';      // Серый приглушенный
                },
                borderColor: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 
                        'rgba(99, 102, 241, 1)' : 
                        'rgba(148, 163, 184, 0.6)';
                },
                borderWidth: 2,
                pointRadius: (context) => {
                    const point = context.raw;
                    // Точки в зоне поворотов чуть больше
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
                        generateLabels: (chart) => {
                            return [
                                {
                                    text: '🔵 Зона поворотов (±5 замеров)',
                                    fillStyle: 'rgba(99, 102, 241, 0.8)',
                                    strokeStyle: 'rgba(99, 102, 241, 1)',
                                    lineWidth: 2,
                                    hidden: false,
                                    index: 0
                                },
                                {
                                    text: '⚫ Остальные измерения',
                                    fillStyle: 'rgba(148, 163, 184, 0.4)',
                                    strokeStyle: 'rgba(148, 163, 184, 0.6)',
                                    lineWidth: 2,
                                    hidden: false,
                                    index: 1
                                }
                            ];
                        }
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
                    title: {
                        display: true,
                        text: 'Индекс измерения',
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#2d3039'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Угол (градусы)',
                        color: '#94a3b8'
                    },
                    min: 0,
                    max: 360,
                    grid: {
                        color: '#2d3039'
                    },
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 45
                    }
                }
            }
        }
    });
}

// Utility Functions
function showLoading(show, message = 'Загрузка...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
    
    // Обновляем текст, если есть сообщение
    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    }[type];
    
    toast.innerHTML = `
        <span class="material-icons">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function copyLog() {
    const logContent = document.getElementById('logViewer').textContent;
    navigator.clipboard.writeText(logContent).then(() => {
        showToast('Лог скопирован в буфер обмена', 'success');
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

function exportResults() {
    if (!state.currentData) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(state.currentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_analysis_${Date.now()}.json`;
    link.click();
    
    showToast('Результаты экспортированы в JSON', 'success');
}

function exportResultsCSV() {
    if (!state.currentData) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    // Создаем CSV из одного результата
    const csv = generateCSVFromResults([state.currentData]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compass_${state.currentData.compass}_${Date.now()}.csv`;
    link.click();
    
    showToast('Результат экспортирован в CSV', 'success');
}

// Mock data removed - now using real API

// Batch Detail Viewer
window.viewBatchDetail = function(index) {
    console.log('viewBatchDetail called with index:', index);
    console.log('state.batchResults:', state.batchResults);
    
    if (!state.batchResults || !state.batchResults[index]) {
        console.error('No data found for index:', index);
        showToast('Данные не найдены', 'error');
        return;
    }
    
    const data = state.batchResults[index];
    console.log('Detail data:', data);
    
    viewBatchDetailFromData(data);
}

// Универсальная функция создания HTML для модального окна
function createDetailModalHTML(data, index) {
    return `
        <div class="modal-content large">
            <div class="modal-header">
                <h2>
                    <span class="material-icons">explore</span>
                    Детальный анализ: ${data.compass}
                </h2>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <!-- Stats -->
                <div class="stats-grid" style="margin-bottom: 20px;">
                    <div class="stat-card">
                        <span class="material-icons stat-icon ${data.isValid ? 'success' : 'error'}">
                            ${data.isValid ? 'check_circle' : 'cancel'}
                        </span>
                        <div class="stat-content">
                            <h4>${data.isValid ? '✓ Валидно' : '✗ Не прошло'}</h4>
                            <p>Статус</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="material-icons stat-icon info">rotate_right</span>
                        <div class="stat-content">
                            <h4>${data.turns ? data.turns.length : 0}/4</h4>
                            <p>Найдено поворотов</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="material-icons stat-icon warning">lens_blur</span>
                        <div class="stat-content">
                            <h4>${data.segments ? data.segments.length : 0}</h4>
                            <p>Стабильных сегментов</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="material-icons stat-icon">dataset</span>
                        <div class="stat-content">
                            <h4>${data.allAngles ? data.allAngles.length : 0}</h4>
                            <p>Всего измерений</p>
                        </div>
                    </div>
                </div>
                
                <!-- Chart -->
                <div class="card" style="margin-bottom: 20px;">
                    <div class="card-header">
                        <h3>Визуализация углов</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="modalChart"></canvas>
                    </div>
                </div>
                
                <!-- Turns Table -->
                <div class="card" style="margin-bottom: 20px;">
                    <div class="card-header">
                        <h3>Последовательность поворотов</h3>
                        <span class="badge">${data.turns ? data.turns.length : 0}</span>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Начальный угол</th>
                                        <th>Конечный угол</th>
                                        <th>Изменение</th>
                                        <th>Статус</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.turns && data.turns.length > 0 ? 
                                        data.turns.map((turn, i) => {
                                            // Безопасное получение значений с проверкой на undefined
                                            const startAngle = turn.startAngle != null ? turn.startAngle : 0;
                                            const endAngle = turn.endAngle != null ? turn.endAngle : 0;
                                            const diff = turn.diff != null ? turn.diff : 0;
                                            const isValid = Math.abs(diff - 90) <= 10;
                                            
                                            return `
                                                <tr>
                                                    <td><strong>#${i + 1}</strong></td>
                                                    <td>${startAngle.toFixed(2)}°</td>
                                                    <td>${endAngle.toFixed(2)}°</td>
                                                    <td>
                                                        <span class="badge ${isValid ? 'success' : 'warning'}">
                                                            ${diff.toFixed(2)}°
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span class="material-icons" style="color: ${isValid ? 'var(--success)' : 'var(--warning)'}">
                                                            ${isValid ? 'check_circle' : 'warning'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('') :
                                        '<tr><td colspan="5" class="empty-state"><span class="material-icons">info</span>Повороты не обнаружены</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Log -->
                ${data.log ? `
                <div class="card">
                    <div class="card-header">
                        <h3>Детальный лог анализа</h3>
                        <button class="btn-icon" onclick="copyModalLog()" title="Копировать лог">
                            <span class="material-icons">content_copy</span>
                        </button>
                    </div>
                    <div class="card-body">
                        <pre class="log-viewer" id="modalLog">${data.log}</pre>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <span class="material-icons">close</span>
                    Закрыть
                </button>
                <button class="btn btn-primary" onclick="exportDetailedData()">
                    <span class="material-icons">download</span>
                    Экспортировать
                </button>
            </div>
        </div>
    `;
}

// Обновленная функция просмотра деталей из пакетного анализа
function viewBatchDetailFromData(data) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = createDetailModalHTML(data, -1);
    
    // Сохраняем текущие данные для экспорта
    state.currentDetailData = data;
    
    document.body.appendChild(modal);
    
    // Рисуем график после добавления в DOM
    setTimeout(() => {
        if (data.allAngles && data.allAngles.length > 0) {
            displayModalChart(data);
        }
    }, 100);
}

window.exportDetailedData = function() {
    const data = state.currentDetailData;
    if (!data) {
        showToast('Данные не найдены', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.compass}_analysis_${Date.now()}.json`;
    link.click();
    
    showToast('Результаты экспортированы', 'success');
}

function displayModalChart(data) {
    const ctx = document.getElementById('modalChart');
    if (!ctx) return;
    
    // Определяем диапазон поворотов для выделения
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    
    if (data.turns && data.turns.length > 0) {
        data.turns.forEach(turn => {
            if (turn.startIndex != null && turn.startIndex < minIndex) {
                minIndex = turn.startIndex;
            }
            if (turn.endIndex != null && turn.endIndex > maxIndex) {
                maxIndex = turn.endIndex;
            }
        });
        
        // Добавляем запас: 5 замеров до и после
        minIndex = Math.max(0, minIndex - 5);
        maxIndex = Math.min(data.allAngles.length - 1, maxIndex + 5);
    }
    
    const angleData = data.allAngles.map((angle, index) => {
        const isInTurnZone = minIndex !== Infinity && index >= minIndex && index <= maxIndex;
    return {
            x: index,
            y: angle,
            inTurnZone: isInTurnZone
        };
    });
    
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Углы',
                data: angleData,
                backgroundColor: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 
                        'rgba(99, 102, 241, 0.8)' : 
                        'rgba(148, 163, 184, 0.4)';
                },
                borderColor: (context) => {
                    const point = context.raw;
                    return point && point.inTurnZone ? 
                        'rgba(99, 102, 241, 1)' : 
                        'rgba(148, 163, 184, 0.6)';
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
                        generateLabels: (chart) => {
                            return [
                                {
                                    text: '🔵 Зона поворотов (±5 замеров)',
                                    fillStyle: 'rgba(99, 102, 241, 0.8)',
                                    strokeStyle: 'rgba(99, 102, 241, 1)',
                                    lineWidth: 2,
                                    hidden: false,
                                    index: 0
                                },
                                {
                                    text: '⚫ Остальные измерения',
                                    fillStyle: 'rgba(148, 163, 184, 0.4)',
                                    strokeStyle: 'rgba(148, 163, 184, 0.6)',
                                    lineWidth: 2,
                                    hidden: false,
                                    index: 1
                                }
                            ];
                        }
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
                    title: {
                        display: true,
                        text: 'Индекс измерения',
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#2d3039'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Угол (градусы)',
                        color: '#94a3b8'
                    },
                    min: 0,
                    max: 360,
                    grid: {
                        color: '#2d3039'
                    },
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 45
                    }
                }
            }
        }
    });
}

window.copyModalLog = function() {
    const logContent = document.getElementById('modalLog').textContent;
    navigator.clipboard.writeText(logContent).then(() => {
        showToast('Лог скопирован в буфер обмена', 'success');
    }).catch(() => {
        showToast('Ошибка копирования', 'error');
    });
}

window.exportBatchDetail = function(index) {
    if (!state.batchResults || !state.batchResults[index]) {
        showToast('Данные не найдены', 'error');
        return;
    }
    
    const data = state.batchResults[index];
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.compass}_analysis_${Date.now()}.json`;
    link.click();
    
    showToast('Результаты экспортированы', 'success');
}

// Settings Page
function initSettingsPage() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    
    if (!saveBtn || !resetBtn) return;
    
    // Загрузить текущие настройки в поля
    updateSettingsFields();
    
    // Обработчик сохранения
    saveBtn.addEventListener('click', () => {
        const newSettings = {
            stabilityThreshold: parseFloat(document.getElementById('setting-stability').value),
            turnTolerance: parseFloat(document.getElementById('setting-tolerance').value),
            minSegmentLength: parseInt(document.getElementById('setting-minLength').value),
            maxOutliers: parseInt(document.getElementById('setting-outliers').value)
        };
        
        // Валидация
        if (newSettings.stabilityThreshold < 0 || newSettings.stabilityThreshold > 20) {
            showToast('Порог стабильности должен быть от 0 до 20', 'error');
            return;
        }
        if (newSettings.turnTolerance < 0 || newSettings.turnTolerance > 30) {
            showToast('Допуск поворота должен быть от 0 до 30', 'error');
            return;
        }
        if (newSettings.minSegmentLength < 1 || newSettings.minSegmentLength > 10) {
            showToast('Минимальная длина сегмента должна быть от 1 до 10', 'error');
            return;
        }
        if (newSettings.maxOutliers < 0 || newSettings.maxOutliers > 10) {
            showToast('Максимум выбросов должен быть от 0 до 10', 'error');
            return;
        }
        
        saveSettings(newSettings);
        updateSettingsPreview();
        showToast('Настройки сохранены успешно!', 'success');
    });
    
    // Обработчик сброса
    resetBtn.addEventListener('click', () => {
        if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
            saveSettings({...DEFAULT_SETTINGS});
            updateSettingsFields();
            updateSettingsPreview();
            showToast('Настройки сброшены к значениям по умолчанию', 'info');
        }
    });
    
    // Обработчики изменения значений для живого preview
    const inputs = ['setting-stability', 'setting-tolerance', 'setting-minLength', 'setting-outliers'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateSettingsPreview);
        }
    });
}

function updateSettingsFields() {
    const settings = state.settings || DEFAULT_SETTINGS;
    
    document.getElementById('setting-stability').value = settings.stabilityThreshold;
    document.getElementById('setting-tolerance').value = settings.turnTolerance;
    document.getElementById('setting-minLength').value = settings.minSegmentLength;
    document.getElementById('setting-outliers').value = settings.maxOutliers;
    
    updateSettingsPreview();
}

function updateSettingsPreview() {
    document.getElementById('preview-stability').textContent = 
        document.getElementById('setting-stability').value + '°';
    document.getElementById('preview-tolerance').textContent = 
        '±' + document.getElementById('setting-tolerance').value + '°';
    document.getElementById('preview-minLength').textContent = 
        document.getElementById('setting-minLength').value;
    document.getElementById('preview-outliers').textContent = 
        document.getElementById('setting-outliers').value;
}

// Add CSS animation for slide out and modal styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
    }
    
    .modal.active {
        display: flex;
    }
    
    .modal-content {
        background: #1a1d26;
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease-out;
    }
    
    .modal-content.large {
        max-width: 1200px;
    }
    
    @keyframes modalSlideIn {
        from {
            transform: translateY(-50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        border-bottom: 1px solid #2d3039;
    }
    
    .modal-header h2 {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        color: #f1f5f9;
        font-size: 20px;
    }
    
    .modal-body {
        padding: 30px;
        overflow-y: auto;
        flex: 1;
    }
    
    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 20px 30px;
        border-top: 1px solid #2d3039;
    }
    
    /* Filter Panel */
    .filter-panel {
        display: flex;
        gap: 1.5rem;
        padding: 1.5rem;
        background: var(--bg-card);
        border-bottom: 1px solid var(--border);
        flex-wrap: wrap;
        align-items: flex-end;
    }
    
    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 200px;
    }
    
    .filter-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 14px;
    }
    
    .filter-group select.form-control {
        padding: 0.75rem 1rem;
    }
    
    /* History Accordion Styles */
    .history-date-group {
        margin-bottom: 1.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg-secondary);
        overflow: hidden;
    }
    
    .history-date-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        cursor: pointer;
        transition: var(--transition);
        user-select: none;
    }
    
    .history-date-header:hover {
        background: var(--bg-hover);
    }
    
    .history-date-header .expand-icon {
        transition: transform 0.3s ease;
        color: var(--text-secondary);
    }
    
    .history-date-content {
        border-top: 1px solid var(--border);
        animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 2000px;
        }
    }
    
    .history-date-content .table-container {
        margin: 0;
    }
    
    .history-date-content table {
        margin: 0;
    }
    
    /* Settings Page Styles */
    .settings-info-box {
        display: flex;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        margin-bottom: 2rem;
    }
    
    .settings-info-box .material-icons {
        color: var(--info);
        font-size: 24px;
    }
    
    .settings-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border);
    }
    
    .settings-preview {
        margin-top: 2rem;
        padding: 1.5rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
    }
    
    .settings-preview h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--text-primary);
    }
    
    .settings-preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    
    .preview-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--bg-card);
        border-radius: var(--radius-sm);
    }
    
    .preview-label {
        color: var(--text-secondary);
        font-size: 14px;
    }
    
    .preview-value {
        color: var(--primary);
        font-weight: 600;
        font-size: 16px;
    }
`;
document.head.appendChild(style);

