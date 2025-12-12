document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('authForm');
    const registerForm = document.getElementById('registerForm');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const showPasswordCheckbox = document.getElementById('showPassword');
    const systemMessage = document.getElementById('systemMessage');
    const messageText = document.getElementById('messageText');
    const messageClose = document.querySelector('.message-close');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const registerLink = document.getElementById('registerLink');
    const googleButton = document.getElementById('googleButton');
    const microsoftButton = document.getElementById('microsoftButton');
    const twoFALink = document.getElementById('twoFALink');
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const termsLink = document.getElementById('termsLink');
    
    initAuthSystem();
    
    function initAuthSystem() {
        showPasswordCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
        
        messageClose.addEventListener('click', function() {
            systemMessage.style.display = 'none';
        });
        
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('/api/get_hint')
                .then(response => response.json())
                .then(data => {
                    showMessage(`Тестовые учетные данные: ${data.username} / ${data.password}`, 'info');
                })
                .catch(error => {
                    showMessage('Не удалось получить подсказку', 'error');
                });
        });
        
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginCard.style.display = 'none';
            registerCard.style.display = 'block';
            initPasswordStrengthCheck();
        });
        
        showLoginBtn.addEventListener('click', function() {
            registerCard.style.display = 'none';
            loginCard.style.display = 'block';
        });
        
        googleButton.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('/api/feature_not_implemented')
                .then(response => response.json())
                .then(data => {
                    showMessage(data.message, 'warning');
                });
        });
        
        microsoftButton.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('/api/feature_not_implemented')
                .then(response => response.json())
                .then(data => {
                    showMessage(data.message, 'warning');
                });
        });
        
        if (twoFALink) {
            twoFALink.addEventListener('click', function(e) {
                e.preventDefault();
                fetch('/api/feature_not_implemented')
                    .then(response => response.json())
                    .then(data => {
                        showMessage(data.message, 'warning');
                    });
            });
        }
        
        if (termsLink) {
            termsLink.addEventListener('click', function(e) {
                e.preventDefault();
                showMessage('Страница с условиями использования находится в разработке', 'info');
            });
        }
        
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
        
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegistration();
        });
        
        checkExistingSession();
        updateSystemMetrics();
        setInterval(updateSystemMetrics, 10000);
    }
    
    function initPasswordStrengthCheck() {
        const regPasswordInput = document.getElementById('regPassword');
        const passwordStrength = document.getElementById('passwordStrength');
        
        if (regPasswordInput && passwordStrength) {
            const strengthBar = passwordStrength.querySelector('.strength-bar');
            const strengthText = passwordStrength.querySelector('.strength-text');
            
            regPasswordInput.addEventListener('input', function() {
                const password = this.value;
                let strength = 0;
                let text = 'Слабый';
                let color = '#ef4444';
                
                if (password.length >= 6) strength += 25;
                if (/[A-Z]/.test(password)) strength += 25;
                if (/[0-9]/.test(password)) strength += 25;
                if (/[^A-Za-z0-9]/.test(password)) strength += 25;
                
                if (strength >= 75) {
                    text = 'Сильный';
                    color = '#10b981';
                } else if (strength >= 50) {
                    text = 'Средний';
                    color = '#f59e0b';
                } else if (strength >= 25) {
                    text = 'Слабый';
                    color = '#ef4444';
                }
                
                if (strengthBar) strengthBar.style.width = strength + '%';
                if (strengthBar) strengthBar.style.backgroundColor = color;
                if (strengthText) strengthText.textContent = text;
                if (strengthText) strengthText.style.color = color;
            });
        }
    }
    
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const secureMode = document.getElementById('secureMode').checked;
        
        if (!username || !password) {
            showMessage('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }
        
        const buttonLoader = loginButton.querySelector('.button-loader');
        const buttonText = loginButton.querySelector('span');
        buttonLoader.style.display = 'block';
        buttonText.textContent = 'Авторизация...';
        loginButton.disabled = true;
        
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                rememberMe: rememberMe,
                secureMode: secureMode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(`Добро пожаловать, ${data.user.full_name || data.user.username}! Перенаправление...`, 'success');
                
                localStorage.setItem('userData', JSON.stringify(data.user));
                localStorage.setItem('lastLogin', new Date().toISOString());
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                
            } else {
                showMessage(data.message || 'Ошибка авторизации', 'error');
                resetLoginButton();
            }
        })
        .catch(error => {
            console.error('Ошибка авторизации:', error);
            showMessage('Ошибка подключения к серверу', 'error');
            
            resetLoginButton();
        });
        
        function resetLoginButton() {
            buttonLoader.style.display = 'none';
            buttonText.textContent = 'Войти в систему';
            loginButton.disabled = false;
        }
    }
    
    function handleRegistration() {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const fullName = document.getElementById('regFullName').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.getElementById('regRole').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const subscribeNews = document.getElementById('subscribeNews').checked;
        
        if (!username || !email || !password || !confirmPassword || !role) {
            showMessage('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }
        
        if (!agreeTerms) {
            showMessage('Необходимо согласиться с условиями использования', 'error');
            return;
        }
        
        const usernameRegex = /^[a-zA-Z0-9_.-]{3,20}$/;
        if (!usernameRegex.test(username)) {
            showMessage('Имя пользователя должно содержать от 3 до 20 символов (латинские буквы, цифры, _ . -)', 'error');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('Введите корректный email адрес', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Пароли не совпадают', 'error');
            return;
        }
        
        const buttonLoader = registerButton.querySelector('.button-loader');
        const buttonText = registerButton.querySelector('span');
        buttonLoader.style.display = 'block';
        buttonText.textContent = 'Регистрация...';
        registerButton.disabled = true;
        
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                full_name: fullName || null,
                password: password,
                confirm_password: confirmPassword,
                role: role,
                subscribe_news: subscribeNews
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message || 'Регистрация успешна! Теперь вы можете войти в систему.', 'success');
                
                setTimeout(() => {
                    registerCard.style.display = 'none';
                    loginCard.style.display = 'block';
                    
                    registerForm.reset();
                    usernameInput.value = username;
                    passwordInput.value = '';
                    resetRegisterButton();
                }, 3000);
                
            } else {
                showMessage(data.message || 'Ошибка регистрации', 'error');
                resetRegisterButton();
            }
        })
        .catch(error => {
            console.error('Ошибка регистрации:', error);
            showMessage('Ошибка подключения к серверу', 'error');
            
            resetRegisterButton();
        });
        
        function resetRegisterButton() {
            buttonLoader.style.display = 'none';
            buttonText.textContent = 'Создать аккаунт';
            registerButton.disabled = false;
        }
    }
    
    function checkExistingSession() {
        fetch('/api/check_auth')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    showMessage(`Обнаружена активная сессия для ${data.user.username}. Перенаправление...`, 'info');
                    
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Ошибка проверки сессии:', error);
            });
    }
    
    function updateSystemMetrics() {
        const metrics = document.querySelectorAll('.metric-value');
        
        if (metrics.length >= 3) {
            const activeSessions = Math.floor(Math.random() * 50) + 1200;
            const todayGenerations = Math.floor(Math.random() * 20) + 320;
            const responseTime = (Math.random() * 0.5 + 12).toFixed(1);
            
            metrics[0].textContent = activeSessions.toLocaleString();
            metrics[1].textContent = todayGenerations;
            metrics[2].textContent = `${responseTime}с`;
        }
    }
    
    function showMessage(text, type = 'info') {
        messageText.textContent = text;
        systemMessage.style.display = 'flex';
        
        const borderColors = {
            'info': '#2563eb',
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b'
        };
        
        systemMessage.style.borderLeftColor = borderColors[type] || borderColors.info;
        
        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                systemMessage.style.display = 'none';
            }, 5000);
        }
    }
});