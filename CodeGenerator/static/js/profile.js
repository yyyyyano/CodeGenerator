document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (this.classList.contains('active')) {
                return; 
            }
            
            const role = this.getAttribute('data-role').toUpperCase();
            
            if (!confirm(`Вы уверены, что хотите сменить роль на "${getRoleName(role)}"?`)) {
                return;
            }
            
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            fetch('/api/update_role', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ role: role })
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('success', 'Роль успешно изменена!');
                        roleOptions.forEach(opt => opt.classList.remove('active'));
                        this.classList.add('active');
                        this.innerHTML = originalHTML;
                        
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    } else {
                        showNotification('error', data.message || 'Ошибка при изменении роли');
                        this.innerHTML = originalHTML;
                    }
                })
                .catch(error => {
                    showNotification('error', 'Ошибка сети при изменении роли');
                    this.innerHTML = originalHTML;
                    console.error('Error:', error);
                });
        });
    });
    
    const editButtons = document.querySelectorAll('.editable .edit-field-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const infoCard = this.closest('.info-card');
            const infoValue = infoCard.querySelector('.info-value');
            const field = infoCard.getAttribute('data-field');
            
            let currentValue = '';
            if (field === 'email') {
                currentValue = infoValue.querySelector('a').textContent.trim();
            } else {
                currentValue = infoValue.textContent.trim();
            }
            
            if (this.classList.contains('editing')) {
                const input = infoCard.querySelector('input');
                const newValue = input.value.trim();
                
                if (!newValue) {
                    showNotification('warning', 'Поле не может быть пустым');
                    return;
                }
                
                if (newValue === currentValue) {
                    cancelEdit(infoCard, infoValue, field, currentValue);
                    this.classList.remove('editing');
                    this.innerHTML = '<i class="fas fa-edit"></i>';
                    return;
                }
                
                if (field === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(newValue)) {
                        showNotification('warning', 'Введите корректный email адрес');
                        return;
                    }
                }
                
                if (field === 'full_name' && newValue.length < 2) {
                    showNotification('warning', 'Имя должно содержать минимум 2 символа');
                    return;
                }
                
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.disabled = true;
                
                fetch('/api/update_profile', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ 
                        field: field,
                        value: newValue 
                    })
                }).then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            if (field === 'email') {
                                infoValue.innerHTML = `<a href="mailto:${newValue}">${newValue}</a>`;
                            } else {
                                infoValue.textContent = newValue;
                            }
                            
                            showNotification('success', 'Данные успешно обновлены!');
                        } else {
                            showNotification('error', data.message || 'Ошибка при сохранении');
                            cancelEdit(infoCard, infoValue, field, currentValue);
                        }
                    })
                    .catch(error => {
                        showNotification('error', 'Ошибка сети при сохранении');
                        cancelEdit(infoCard, infoValue, field, currentValue);
                        console.error('Error:', error);
                    })
                    .finally(() => {
                        this.classList.remove('editing');
                        this.innerHTML = '<i class="fas fa-edit"></i>';
                        this.disabled = false;
                    });
                
            } else {
                enterEditMode(infoCard, infoValue, field, currentValue);
                this.innerHTML = '<i class="fas fa-check"></i>';
                this.classList.add('editing');
            }
        });
    });
    
    document.getElementById('saveChangesBtn').addEventListener('click', function() {
        const editingButtons = document.querySelectorAll('.edit-field-btn.editing');
        if (editingButtons.length > 0) {
            editingButtons.forEach(btn => btn.click());
            setTimeout(() => {
                showNotification('info', 'Все изменения сохранены');
            }, 500);
        } else {
            showNotification('info', 'Нет изменений для сохранения');
        }
    });
    
    document.getElementById('cancelChangesBtn').addEventListener('click', function() {
        const editingButtons = document.querySelectorAll('.edit-field-btn.editing');
        if (editingButtons.length > 0) {
            if (confirm('Отменить все несохраненные изменения?')) {
                location.reload();
            }
        } else {
            location.reload();
        }
    });
    
    document.getElementById('saveGenerationSettings')?.addEventListener('click', function() {
        const settings = {
            language: document.getElementById('preferredLanguage').value,
            framework: document.getElementById('preferredFramework').value,
            theme: document.getElementById('theme').value,
            codeStyle: document.getElementById('codeStyle').value,
            addComments: document.getElementById('addComments').checked,
            generateDocs: document.getElementById('generateDocs').checked,
            autoFormat: document.getElementById('autoFormat').checked,
            checkErrors: document.getElementById('checkErrors').checked
        };
        
        localStorage.setItem('generationSettings', JSON.stringify(settings));
        showNotification('success', 'Настройки генерации сохранены!');
    });
    
    document.getElementById('resetDefaultSettings')?.addEventListener('click', function() {
        if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
            document.getElementById('preferredLanguage').value = 'typescript';
            document.getElementById('preferredFramework').value = 'react';
            document.getElementById('theme').value = 'light';
            document.getElementById('codeStyle').value = 'standard';
            document.getElementById('addComments').checked = true;
            document.getElementById('generateDocs').checked = true;
            document.getElementById('autoFormat').checked = false;
            document.getElementById('checkErrors').checked = true;
            localStorage.removeItem('generationSettings');
            showNotification('success', 'Настройки сброшены к значениям по умолчанию!');
        }
    });
    
    const saveNotificationsBtn = document.querySelector('#notifications .btn-primary');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', function() {
            showNotification('success', 'Настройки уведомлений сохранены!');
        });
    }
    
    const savedSettings = localStorage.getItem('generationSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            document.getElementById('preferredLanguage').value = settings.language || 'typescript';
            document.getElementById('preferredFramework').value = settings.framework || 'react';
            document.getElementById('theme').value = settings.theme || 'light';
            document.getElementById('codeStyle').value = settings.codeStyle || 'standard';
            document.getElementById('addComments').checked = settings.addComments !== false;
            document.getElementById('generateDocs').checked = settings.generateDocs !== false;
            document.getElementById('autoFormat').checked = settings.autoFormat || false;
            document.getElementById('checkErrors').checked = settings.checkErrors !== false;
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.removeAttribute('onclick');
        
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            let tabId = this.getAttribute('data-tab');
            if (!tabId) {
                const text = this.textContent.trim().toLowerCase();
                if (text.includes('основная') || text.includes('main')) {
                    tabId = 'main-info';
                } else if (text.includes('уведомлен') || text.includes('notification')) {
                    tabId = 'notifications';
                } else if (text.includes('генерац') || text.includes('code') || text.includes('generation')) {
                    tabId = 'code-generation';
                }
            }
            
            if (tabId) {
                openTab(tabId);
            }
        });
    });
    
    if (tabButtons.length > 0 && tabPanes.length > 0) {
        const activePane = document.querySelector('.tab-pane.active');
        if (!activePane) {
            tabButtons[0].click();
        }
    }
}

function openTab(tabName) {
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
    });
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activePane = document.getElementById(tabName);
    if (activePane) {
        activePane.classList.add('active');
        activePane.style.display = 'block';
        
        tabButtons.forEach(btn => {
            const btnTabId = btn.getAttribute('data-tab') || 
                            (btn.textContent.toLowerCase().includes('основная') ? 'main-info' :
                                btn.textContent.toLowerCase().includes('уведомлен') ? 'notifications' :
                                btn.textContent.toLowerCase().includes('генерац') ? 'code-generation' : '');
            
            if (btnTabId === tabName) {
                btn.classList.add('active');
            }
        });
    }
}

function enterEditMode(infoCard, infoValue, field, currentValue) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'edit-input';
    
    infoValue.textContent = '';
    infoValue.appendChild(input);
    
    input.focus();
    input.select();
    
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            infoCard.querySelector('.edit-field-btn').click();
        }
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cancelEdit(infoCard, infoValue, field, currentValue);
            const btn = infoCard.querySelector('.edit-field-btn');
            btn.classList.remove('editing');
            btn.innerHTML = '<i class="fas fa-edit"></i>';
        }
    });
}

function cancelEdit(infoCard, infoValue, field, value) {
    const input = infoCard.querySelector('input');
    if (input) input.remove();
    
    if (field === 'email') {
        infoValue.innerHTML = `<a href="mailto:${value}">${value}</a>`;
    } else {
        infoValue.textContent = value;
    }
}

function getRoleName(roleCode) {
    const roleNames = {
        'DEVELOPER': 'Разработчик',
        'SYSTEM_ANALYST': 'Системный аналитик', 
        'STUDENT': 'Студент'
    };
    return roleNames[roleCode] || roleCode;
}

function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

(function() {
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .notification-success {
            background: #10b981;
        }
        
        .notification-error {
            background: #ef4444;
        }
        
        .notification-warning {
            background: #f59e0b;
        }
        
        .notification-info {
            background: #3b82f6;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-content i {
            font-size: 1.2rem;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
})();

if (result.success) {
    alert('Проект успешно создан!');
    closeProjectModal();
    updateProfileProjectCount();
    location.reload(); 
}

function updateProfileProjectCount() {
    const currentCount = localStorage.getItem('user_projects_count') || 0;
    localStorage.setItem('user_projects_count', parseInt(currentCount) + 1);
    
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('projects_channel');
        channel.postMessage({
            type: 'project_count_updated',
            newCount: parseInt(currentCount) + 1
        });
    }
}