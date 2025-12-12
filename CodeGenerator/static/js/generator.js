const HISTORY_STORAGE_KEY = 'codegen_history';
const MAX_HISTORY_ITEMS = 10;

function loadHistoryFromStorage() {
    try {
        const stored = sessionStorage.getItem(HISTORY_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading history from storage:', e);
        return [];
    }
}

function saveHistoryToStorage(history) {
    try {
        sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving history to storage:', e);
    }
}

function clearHistoryFromStorage() {
    try {
        sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
        console.error('Error clearing history from storage:', e);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    renderHistory();

    function addTemplateUsageToHistory(templateData) {
        addToHistory(
            templateData.initialPrompt || templateData.description,
            '', 
            templateData.language,
            {
                template: templateData.name,
                category: templateData.category,
                framework: templateData.framework
            }
        );
    }

    const urlParams = new URLSearchParams(window.location.search);
    const templateParam = urlParams.get('template');
    
    let templateData = null;
    try {
        const storedTemplate = sessionStorage.getItem('selectedTemplate');
        if (storedTemplate) {
            templateData = JSON.parse(storedTemplate);
        }
    } catch (e) {
        console.log('No template data found');
    }
    
    if (templateData) {
        initializeWithTemplate(templateData);
    }
    
    const requirementTextarea = document.getElementById('requirement');
    const charCount = document.getElementById('charCount');
    
    requirementTextarea.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
    
    document.getElementById('clearHistoryBtn').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите очистить всю историю генераций?')) {
            clearHistoryFromStorage();
            renderHistory([]);
            showStatus('success', 'История очищена');
        }
    });

    const generatorForm = document.getElementById('generatorForm');
    const generateBtn = document.getElementById('generateBtn');
    
    generatorForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            requirement: document.getElementById('requirement').value,
            language: document.getElementById('language').value,
            framework: document.getElementById('framework').value,
            role: document.getElementById('role').value,
            addComments: document.getElementById('addComments').checked,
            optimizeCode: document.getElementById('optimizeCode').checked
        };
        
        if (!formData.requirement.trim()) {
            showStatus('error', 'Пожалуйста, введите описание задачи');
            return;
        }
        
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация...';
        generateBtn.disabled = true;
        showStatus('processing', 'Генерация кода...');
        
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();

            if (response.ok) {
                let generatedCode = '';
                let language = '';
                let generatedBy = '';
                
                if (result.code && typeof result.code === 'object') {
                    generatedCode = result.code.code || '';
                    language = result.code.language || '';
                    generatedBy = result.generated_by || result.code.generated_by || 'неизвестно';
                } else {
                    generatedCode = result.code || '';
                    language = result.language || '';
                    generatedBy = result.generated_by || 'неизвестно';
                }
                
                displayGeneratedCode(generatedCode, language);

                const role = result.role || formData.role || 'Разработчик';

                showStatus('success', `Код успешно сгенерирован для роли "${role}" пользователем ${generatedBy} (сохранено в историю)`);
                const historyInfo = {};
                if (templateData) {
                    historyInfo.template = templateData.name;
                    historyInfo.category = templateData.category;
                }
                addToHistory(formData.requirement, generatedCode, language, historyInfo);
            } else {
                showStatus('error', result.error || 'Ошибка генерации кода');
            }
        } catch (error) {
            console.error('Generation error:', error);
            showStatus('error', 'Ошибка соединения с сервером');
        } finally {
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> Сгенерировать код';
            generateBtn.disabled = false;
        }
    });
    
    document.getElementById('clearBtn').addEventListener('click', function() {
        document.getElementById('requirement').value = '';
        document.getElementById('charCount').textContent = '0';
        document.getElementById('codeOutput').innerHTML = '<code>// Здесь появится сгенерированный код</code>';
        showStatus('idle', 'Ожидание ввода данных...');
    });
    
    document.getElementById('copyBtn').addEventListener('click', function() {
        const code = document.getElementById('codeOutput').textContent;
        navigator.clipboard.writeText(code).then(() => {
            showStatus('success', 'Код скопирован в буфер обмена');
        }).catch(() => {
            showStatus('error', 'Не удалось скопировать код');
        });
    });
    
    document.getElementById('downloadBtn').addEventListener('click', function() {
        const code = document.getElementById('codeOutput').textContent;
        const language = document.getElementById('language').value.toLowerCase();
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated_code.${getFileExtension(language)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('formatBtn').addEventListener('click', function() {
        const codeElement = document.getElementById('codeOutput');
        const code = codeElement.textContent;
        const formatted = formatCode(code);
        codeElement.innerHTML = `<code>${formatted}</code>`;
        
        const codeBlock = codeElement.querySelector('code');
        if (codeBlock) {
            hljs.highlightElement(codeBlock);
        }
        
        showStatus('success', 'Код отформатирован');
    });

    document.getElementById('themeToggleBtn').addEventListener('click', function() {
        const currentTheme = document.querySelector('link[href*="highlight.js"]').href;
        const themes = [
            'github-dark',
            'github',
            'vs',
            'vs2015',
            'atom-one-dark',
            'atom-one-light',
            'monokai',
            'solarized-dark',
            'solarized-light'
        ];
        
        let currentIndex = 0;
        for (let i = 0; i < themes.length; i++) {
            if (currentTheme.includes(themes[i])) {
                currentIndex = i;
                break;
            }
        }
        
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        const themeLink = document.querySelector('link[href*="highlight.js"]');
        themeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${nextTheme}.min.css`;
        
        const codeElement = document.querySelector('#codeOutput code');
        if (codeElement) {
            hljs.highlightElement(codeElement);
        }
        
        showStatus('success', `Тема подсветки изменена на: ${nextTheme}`);
    });
    
    document.getElementById('closeTemplateBtn').addEventListener('click', function() {
        document.getElementById('templateInfoBanner').style.display = 'none';
        sessionStorage.removeItem('selectedTemplate');
        resetFormToDefaults();
    });
    
    document.getElementById('role').addEventListener('change', function() {
        const role = this.value;
        const optimizeCheckbox = document.getElementById('optimizeCode');
        
        if (role !== 'DEVELOPER') {
            optimizeCheckbox.checked = false;
            optimizeCheckbox.disabled = true;
        } else {
            optimizeCheckbox.disabled = false;
        }
    });
    
    function initializeWithTemplate(templateData) {
        const banner = document.getElementById('templateInfoBanner');
        const languageSelect = document.getElementById('language');
        const frameworkSelect = document.getElementById('framework');
        const requirementTextarea = document.getElementById('requirement');
        
        banner.style.display = 'block';
        document.getElementById('templateName').textContent = templateData.name;
        document.getElementById('templateDescription').textContent = templateData.description;
        
        const languageTag = document.getElementById('templateLanguageTag');
        const frameworkTag = document.getElementById('templateFrameworkTag');
        const categoryTag = document.getElementById('templateCategoryTag');
        
        languageTag.textContent = templateData.language;
        languageTag.className = 'template-tag language';
        
        if (templateData.framework) {
            frameworkTag.textContent = templateData.framework;
            frameworkTag.className = 'template-tag framework';
            frameworkTag.style.display = 'inline-block';
        } else {
            frameworkTag.style.display = 'none';
        }
        
        categoryTag.textContent = templateData.category;
        categoryTag.className = 'template-tag category';
        languageSelect.value = capitalizeFirstLetter(templateData.language);
        
        if (templateData.framework) {
            frameworkSelect.value = templateData.framework;
        } else {
            frameworkSelect.value = 'None';
        }
        
        requirementTextarea.value = templateData.initialPrompt;
        document.getElementById('charCount').textContent = requirementTextarea.value.length;
        
        updateCodePreviewInfo();
        filterAvailableOptions(templateData);
        addTemplateUsageToHistory(templateData);
        showStatus('info', `Шаблон "${templateData.name}" загружен. Теперь можно описать конкретную задачу`);
    }
    
    function filterAvailableOptions(templateData) {
        const languageSelect = document.getElementById('language');
        const frameworkSelect = document.getElementById('framework');
        
        const templateOptions = {
            'rest-api-controller': {
                languages: ['TypeScript', 'JavaScript', 'Python', 'Java'],
                frameworks: ['NestJS', 'Express', 'Django', 'Flask', 'Spring']
            },
            'jwt-authentication': {
                languages: ['JavaScript', 'Python', 'Java'],
                frameworks: ['Express', 'Django', 'Flask', 'Spring']
            },
            
            'form-validation': {
                languages: ['TypeScript', 'JavaScript'],
                frameworks: ['React', 'Vue.js']
            },
            'custom-hook': {
                languages: ['TypeScript', 'JavaScript'],
                frameworks: ['React']
            },
            'modal-component': {
                languages: ['TypeScript', 'JavaScript'],
                frameworks: ['React', 'Vue.js']
            },
            
            'observer-pattern': {
                languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C++'],
                frameworks: ['None']
            },
            'singleton-pattern': {
                languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'Go'],
                frameworks: ['None']
            },
            
            'logger-rotation': {
                languages: ['Python', 'Java'],
                frameworks: ['None']
            }
        };
        
        const options = templateOptions[templateData.pattern] || {
            languages: [templateData.language],
            frameworks: templateData.framework ? [templateData.framework, 'None'] : ['None']
        };
        
        Array.from(languageSelect.options).forEach(option => {
            if (option.value === languageSelect.value) {
                return; 
            }
            
            if (!options.languages.includes(option.value)) {
                option.style.display = 'none';
                option.disabled = true;
            } else {
                option.style.display = 'block';
                option.disabled = false;
            }
        });
        
        Array.from(frameworkSelect.options).forEach(option => {
            if (option.value === frameworkSelect.value) {
                return; 
            }
            
            if (!options.frameworks.includes(option.value)) {
                option.style.display = 'none';
                option.disabled = true;
            } else {
                option.style.display = 'block';
                option.disabled = false;
            }
        });
        
        languageSelect.title = `Доступные языки для шаблона: ${options.languages.join(', ')}`;
        frameworkSelect.title = `Доступные фреймворки: ${options.frameworks.join(', ')}`;
    }
    
    function resetFormToDefaults() {
        const languageSelect = document.getElementById('language');
        const frameworkSelect = document.getElementById('framework');
        const requirementTextarea = document.getElementById('requirement');
        
        languageSelect.value = 'Python';
        frameworkSelect.value = 'None';
        requirementTextarea.value = '';
        document.getElementById('charCount').textContent = '0';
        
        Array.from(languageSelect.options).forEach(option => {
            option.style.display = 'block';
            option.disabled = false;
        });
        
        Array.from(frameworkSelect.options).forEach(option => {
            option.style.display = 'block';
            option.disabled = false;
        });
        
        languageSelect.title = '';
        frameworkSelect.title = '';
        
        updateCodePreviewInfo();
        showStatus('idle', 'Ожидание ввода данных...');
    }
    
    function updateCodePreviewInfo() {
        const language = document.getElementById('language').value;
        const fileName = document.getElementById('fileName');
        const languageBadge = document.getElementById('languageBadge');
        
        const fileExtensions = {
            'Python': 'py',
            'JavaScript': 'js',
            'TypeScript': 'ts',
            'Java': 'java',
            'C++': 'cpp',
            'Go': 'go',
            'Rust': 'rs'
        };
        
        const extension = fileExtensions[language] || 'txt';
        fileName.textContent = `generated_code.${extension}`;
        languageBadge.textContent = language;
    }
    
    document.getElementById('language').addEventListener('change', updateCodePreviewInfo);
    document.getElementById('framework').addEventListener('change', updateCodePreviewInfo);
    
    function displayGeneratedCode(code, language) {
        const codeOutput = document.getElementById('codeOutput');
        const languageLower = language.toLowerCase();
        
        let hljsLanguage = languageLower;
        const languageMapping = {
            'python': 'python',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'java': 'java',
            'c++': 'cpp',
            'cpp': 'cpp',
            'go': 'go',
            'rust': 'rust',
            'html': 'html',
            'css': 'css',
            'sql': 'sql',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'bash': 'bash',
            'shell': 'bash'
        };
        
        if (languageMapping[languageLower]) {
            hljsLanguage = languageMapping[languageLower];
        } else {
            hljsLanguage = ''; 
        }
        
        codeOutput.innerHTML = '';
        const codeElement = document.createElement('code');
        codeElement.className = hljsLanguage ? `language-${hljsLanguage}` : '';
        codeElement.textContent = code;
        codeOutput.appendChild(codeElement);
        
        hljs.highlightElement(codeElement);
        updateCodePreviewInfo();
    }
    
    function showStatus(type, message) {
        const statusContainer = document.getElementById('statusContainer');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusDetails = document.getElementById('statusDetails');
        
        statusContainer.className = `status-container ${type}`;
        statusIndicator.className = `status-indicator ${type}`;
        statusIndicator.textContent = getStatusText(type);
        statusDetails.textContent = message;
        
        if (type === 'success') {
            setTimeout(() => {
                if (statusIndicator.textContent === getStatusText('success')) {
                    showStatus('idle', 'Ожидание новых действий...');
                }
            }, 5000);
        }
    }
    
    function getStatusText(type) {
        const statusTexts = {
            'idle': 'Готов',
            'processing': 'В процессе',
            'success': 'Успех',
            'error': 'Ошибка',
            'info': 'Информация'
        };
        return statusTexts[type] || 'Готов';
    }
    
    function addToHistory(requirement, code, language, additionalInfo = {}) {
        const historyItem = {
            id: Date.now(), 
            timestamp: new Date().toISOString(),
            requirement: requirement,
            code: code,
            language: language,
            ...additionalInfo
        };
        
        let history = loadHistoryFromStorage();
        history.unshift(historyItem);
        
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }
        
        saveHistoryToStorage(history);
        renderHistory(history);
        
        return historyItem.id;
    }

    function renderHistory(history = null) {
        const historyGrid = document.getElementById('historyGrid');
        
        if (!history) {
            history = loadHistoryFromStorage();
        }
        
        historyGrid.innerHTML = '';
        
        if (history.length === 0) {
            historyGrid.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>История генераций пуста</p>
                    <small>Сгенерированный код появится здесь</small>
                </div>
            `;
            return;
        }
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.id = item.id;
            
            const date = new Date(item.timestamp);
            const timeString = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const dateString = date.toLocaleDateString();
            
            const preview = item.code.substring(0, 100) + (item.code.length > 100 ? '...' : '');
            const requirementPreview = item.requirement.substring(0, 50) + (item.requirement.length > 50 ? '...' : '');
            
            let highlightedPreview = preview;
            try {
                const lang = item.language.toLowerCase();
                if (lang === 'python' || lang === 'javascript' || lang === 'typescript' || 
                    lang === 'java' || lang === 'cpp' || lang === 'go' || lang === 'rust') {
                    highlightedPreview = hljs.highlight(preview, { language: lang }).value;
                }
            } catch (e) {
            }
            
            historyItem.innerHTML = `
                <div class="history-header">
                    <span class="history-date">${dateString}</span>
                    <span class="history-time">${timeString}</span>
                    <span class="history-language">${item.language}</span>
                </div>
                <div class="history-preview">
                    <strong>Задача:</strong> ${requirementPreview}
                </div>
                <div class="history-code">
                    <pre><code>${highlightedPreview}</code></pre>
                </div>
                <div class="history-actions">
                    <button class="history-action-btn reload-btn" onclick="reloadHistoryItem('${item.id}')" 
                            title="Загрузить в редактор">
                        <i class="fas fa-redo"></i> Повторить
                    </button>
                    <button class="history-action-btn delete-btn" onclick="deleteHistoryItem('${item.id}')" 
                            title="Удалить из истории">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            historyGrid.appendChild(historyItem);
        });
    }
    
    window.reloadHistoryItem = function(itemId) {
        const history = loadHistoryFromStorage();
        const item = history.find(h => h.id == itemId);
        
        if (!item) {
            showStatus('error', 'Элемент истории не найден');
            return;
        }
        
        document.getElementById('requirement').value = item.requirement;
        document.getElementById('language').value = item.language;
        document.getElementById('charCount').textContent = item.requirement.length;
        
        displayGeneratedCode(item.code, item.language);
        showStatus('info', 'История загружена. Нажмите "Сгенерировать код" для повторной генерации.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteHistoryItem = function(itemId) {
        let history = loadHistoryFromStorage();
        const initialLength = history.length;
        
        history = history.filter(h => h.id != itemId);
        
        if (history.length < initialLength) {
            saveHistoryToStorage(history);
            renderHistory(history);
            showStatus('success', 'Элемент удален из истории');
        }
    };

    window.clearAllHistory = function() {
        if (confirm('Вы уверены, что хотите очистить всю историю генераций?')) {
            clearHistoryFromStorage();
            renderHistory([]);
            showStatus('success', 'История очищена');
        }
    };

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function getFileExtension(language) {
        const extensions = {
            'python': 'py',
            'javascript': 'js',
            'typescript': 'ts',
            'java': 'java',
            'c++': 'cpp',
            'go': 'go',
            'rust': 'rs'
        };
        return extensions[language.toLowerCase()] || 'txt';
    }
    
    function formatCode(code) {
        return code
            .split('\n')
            .map(line => line.trim() ? '    ' + line : '')
            .join('\n');
    }
    
    updateCodePreviewInfo();
    
    const userRole = '{{ role }}';
    const optimizeCheckbox = document.getElementById('optimizeCode');
    
    if (userRole !== 'DEVELOPER') {
        optimizeCheckbox.disabled = true;
        optimizeCheckbox.title = 'Оптимизация доступна только для роли Разработчик';
    }
});