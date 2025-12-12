document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilters = document.querySelectorAll('#categoryFilters input[type="checkbox"]');
    const languageFilters = document.querySelectorAll('#languageFilters input[type="checkbox"]');
    const templateCards = document.querySelectorAll('.template-card');
    
    function handleAllCheckboxes(checkboxes, allCheckbox) {
        checkboxes.forEach(checkbox => {
            if (checkbox !== allCheckbox) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        allCheckbox.checked = false;
                        allCheckbox.parentElement.classList.remove('active');
                        this.parentElement.classList.add('active');
                    }
                });
            }
        });
        
        allCheckbox.addEventListener('change', function() {
            if (this.checked) {
                checkboxes.forEach(cb => {
                    if (cb !== allCheckbox) {
                        cb.checked = false;
                        cb.parentElement.classList.remove('active');
                    }
                });
                this.parentElement.classList.add('active');
            }
        });
    }
    
    const categoryAll = document.querySelector('#categoryFilters input[value="all"]');
    handleAllCheckboxes(Array.from(categoryFilters), categoryAll);
    
    const languageAll = document.querySelector('#languageFilters input[value="all"]');
    handleAllCheckboxes(Array.from(languageFilters), languageAll);
    
    function updateFilterStyles() {
        document.querySelectorAll('.filter-tag').forEach(tag => {
            const checkbox = tag.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                tag.classList.add('active');
            } else {
                tag.classList.remove('active');
            }
        });
    }
    
    function filterTemplates() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategories = Array.from(categoryFilters)
            .filter(cb => cb.checked && cb.value !== 'all')
            .map(cb => cb.value);
        const selectedLanguages = Array.from(languageFilters)
            .filter(cb => cb.checked && cb.value !== 'all')
            .map(cb => cb.value);
        
        const showAllCategories = selectedCategories.length === 0;
        const showAllLanguages = selectedLanguages.length === 0;
        
        let visibleCount = 0;
        
        templateCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.template-description').textContent.toLowerCase();
            const cardCategories = card.getAttribute('data-categories').split(' ');
            const cardLanguages = card.getAttribute('data-languages').split(' ');
            
            const matchesSearch = searchTerm === '' || 
                title.includes(searchTerm) || 
                description.includes(searchTerm);
            
            const matchesCategory = showAllCategories || 
                selectedCategories.some(cat => cardCategories.includes(cat));
            
            const matchesLanguage = showAllLanguages || 
                selectedLanguages.some(lang => cardLanguages.includes(lang));
            
            if (matchesSearch && matchesCategory && matchesLanguage) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        document.querySelector('.template-count').textContent = visibleCount;
    }
    
    searchInput.addEventListener('input', filterTemplates);
    categoryFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateFilterStyles();
            filterTemplates();
        });
    });
    languageFilters.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateFilterStyles();
            filterTemplates();
        });
    });
    
    document.querySelectorAll('.use-template').forEach(button => {
        button.addEventListener('click', function() {
            const templateCard = this.closest('.template-card');
            const templateName = this.getAttribute('data-name');
            const language = this.getAttribute('data-language');
            const framework = this.getAttribute('data-framework');
            const pattern = this.getAttribute('data-pattern');
            const description = this.getAttribute('data-description');
            const category = this.getAttribute('data-category');
            
            const usageCount = templateCard.querySelector('.download-count span');
            const currentCount = parseInt(usageCount.textContent.replace(/\D/g, ''));
            const newCount = currentCount + 1;
            usageCount.innerHTML = `<i class="fas fa-download"></i> ${newCount.toLocaleString()} использований`;
            
            const totalDownloads = document.getElementById('totalDownloads');
            const currentTotal = parseInt(totalDownloads.textContent.replace(/\D/g, ''));
            totalDownloads.textContent = (currentTotal + 1).toLocaleString();
            
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Переход...';
            this.disabled = true;
            
            const templateData = {
                name: templateName,
                language: language,
                framework: framework,
                pattern: pattern,
                category: category,
                description: description,
                initialPrompt: `Код должен использовать паттерн "${templateName}". ${description}`
            };
            
            sessionStorage.setItem('selectedTemplate', JSON.stringify(templateData));
            
            setTimeout(() => {
                window.location.href = '/generator?template=' + encodeURIComponent(pattern);
            }, 1000);
        });
    });
    
    updateFilterStyles();
    filterTemplates(); 
});