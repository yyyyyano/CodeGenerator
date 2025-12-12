document.addEventListener('DOMContentLoaded', function() {
    let currentEditingId = null;
    
    const createProjectBtn = document.getElementById('createProjectBtn');
    const createProjectEmptyBtn = document.getElementById('createProjectEmptyBtn');
    const modal = document.getElementById('projectModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubmitBtn = document.getElementById('modalSubmitBtn');
    const modalClose = document.getElementById('modalClose');
    const cancelModal = document.getElementById('cancelModal');
    const projectForm = document.getElementById('projectForm');
    const projectIdInput = document.getElementById('projectId');
    
    const viewImageModal = document.getElementById('viewImageModal');
    const closeImageModal = document.getElementById('closeImageModal');
    const projectImage = document.getElementById('projectImage');
    const imageModalTitle = document.getElementById('imageModalTitle');
    const imageInfo = document.getElementById('imageInfo');
    
    function openProjectModal(projectData = null) {
        if (projectData) {
            modalTitle.textContent = 'Редактировать проект';
            modalSubmitBtn.textContent = 'Сохранить изменения';
            projectIdInput.value = projectData.id;
            document.getElementById('projectName').value = projectData.name;
            document.getElementById('projectDescription').value = projectData.description;
            document.getElementById('projectLanguage').value = projectData.language;
            document.getElementById('projectFramework').value = projectData.framework;
            document.getElementById('projectStatus').value = projectData.status;
        } else {
            modalTitle.textContent = 'Создать новый проект';
            modalSubmitBtn.textContent = 'Создать проект';
            projectIdInput.value = '';
            projectForm.reset();
        }
        
        modal.style.display = 'flex';
        document.getElementById('projectName').focus();
    }
    
    function closeProjectModal() {
        modal.style.display = 'none';
        currentEditingId = null;
        projectForm.reset();
    }
    
    function openImageModalSimple(projectCard) {
        const projectName = projectCard.querySelector('.project-title').textContent;
        const projectDescription = projectCard.querySelector('.project-description').textContent;
        const projectLanguage = projectCard.querySelector('.project-tag.language').textContent;
        const projectFramework = projectCard.querySelector('.project-tag.framework').textContent;
        const statusElement = projectCard.querySelector('.project-tag.status, .project-tag.status-draft');
        const projectStatus = statusElement.textContent;
        const projectLines = projectCard.querySelectorAll('.stat-item-value')[0].textContent;
        const projectFiles = projectCard.querySelectorAll('.stat-item-value')[1].textContent;
        
        imageModalTitle.textContent = projectName;
        
        projectImage.src = window.location.origin + "/static/picture.jpeg";
        projectImage.alt = `Изображение проекта: ${projectName}`;
        
        imageInfo.innerHTML = `
            <h3>Информация о проекте</h3>
            <p><span class="info-label">Название:</span> <span class="info-value">${projectName}</span></p>
            <p><span class="info-label">Описание:</span> <span class="info-value">${projectDescription}</span></p>
            <p><span class="info-label">Язык:</span> <span class="info-value">${projectLanguage}</span></p>
            <p><span class="info-label">Фреймворк:</span> <span class="info-value">${projectFramework}</span></p>
            <p><span class="info-label">Статус:</span> <span class="info-value">${projectStatus}</span></p>
            <p><span class="info-label">Строк кода:</span> <span class="info-value">${projectLines}</span></p>
            <p><span class="info-label">Файлов:</span> <span class="info-value">${projectFiles}</span></p>
        `;
        
        viewImageModal.style.display = 'flex';
    }
    
    function closeImageModalFunc() {
        viewImageModal.style.display = 'none';
        projectImage.src = '';
        imageInfo.innerHTML = '';
    }
    
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', () => openProjectModal());
    }
    
    if (createProjectEmptyBtn) {
        createProjectEmptyBtn.addEventListener('click', () => openProjectModal());
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', closeProjectModal);
    }
    
    if (cancelModal) {
        cancelModal.addEventListener('click', closeProjectModal);
    }
    
    if (closeImageModal) {
        closeImageModal.addEventListener('click', closeImageModalFunc);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeProjectModal();
        }
        if (event.target === viewImageModal) {
            closeImageModalFunc();
        }
    });
    
    projectForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const projectId = projectIdInput.value;
        const projectData = {
            name: document.getElementById('projectName').value.trim(),
            description: document.getElementById('projectDescription').value.trim(),
            language: document.getElementById('projectLanguage').value,
            framework: document.getElementById('projectFramework').value,
            status: document.getElementById('projectStatus').value
        };
        
        try {
            let response;
            
            if (projectId) {
                response = await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(projectData)
                });
            } else {
                response = await fetch('/api/projects/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(projectData)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert(projectId ? 'Проект успешно обновлен!' : 'Проект успешно создан!');
                closeProjectModal();
                location.reload(); 
            } else {
                alert('Ошибка: ' + result.message);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при сохранении проекта');
        }
    });
    
    document.addEventListener('click', async function(event) {
        const projectCard = event.target.closest('.project-card');
        if (!projectCard) return;
        
        const projectId = projectCard.getAttribute('data-id');
        
        if (event.target.closest('.open-project')) {
            event.preventDefault();
            openImageModalSimple(projectCard);
        }
        
        if (event.target.closest('.edit-project')) {
            event.preventDefault();
            
            try {
                const response = await fetch(`/api/projects/${projectId}`);
                const result = await response.json();
                
                if (result.success) {
                    openProjectModal(result.project);
                } else {
                    alert('Ошибка: ' + result.message);
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при загрузке проекта');
            }
        }
        
        if (event.target.closest('.download-project')) {
            event.preventDefault();
            
            const projectTitle = projectCard.querySelector('.project-title').textContent;
            alert(`Скачивание проекта: ${projectTitle}\n(В реальном приложении здесь будет скачивание архива с проектом)`);
        }
        
        if (event.target.closest('.delete-project')) {
            event.preventDefault();
            
            const projectTitle = projectCard.querySelector('.project-title').textContent;
            
            if (confirm(`Вы уверены, что хотите удалить проект "${projectTitle}"?`)) {
                try {
                    const response = await fetch(`/api/projects/${projectId}`, {
                        method: 'DELETE'
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        projectCard.style.opacity = '0.5';
                        setTimeout(() => {
                            projectCard.remove();
                            
                            updateStatsAfterDeletion(projectCard.getAttribute('data-status'));
                            
                            const projectsGrid = document.getElementById('projectsGrid');
                            if (projectsGrid.children.length === 0) {
                                const emptyState = document.getElementById('emptyState');
                                if (emptyState) emptyState.style.display = 'block';
                            }
                        }, 300);
                    } else {
                        alert('Ошибка: ' + result.message);
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('Произошла ошибка при удалении проекта');
                }
            }
        }
    });
    
    function updateStatsAfterDeletion(status) {
        const totalProjects = document.getElementById('totalProjects');
        const draftProjects = document.getElementById('draftProjects');
        const completedProjects = document.getElementById('completedProjects');
        
        if (totalProjects.textContent) {
            totalProjects.textContent = parseInt(totalProjects.textContent) - 1;
        }
        
        if (status === 'draft' && draftProjects.textContent) {
            draftProjects.textContent = parseInt(draftProjects.textContent) - 1;
        } else if (status === 'completed' && completedProjects.textContent) {
            completedProjects.textContent = parseInt(completedProjects.textContent) - 1;
        }
    }
});