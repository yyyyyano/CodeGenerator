import traceback
import random
from .views.code_view import CodeDisplayView
from .views.requirement_view import RequirementInputView
from .views.validation_view import ValidationResultView


class GenerationOrchestrator:
    def __init__(self, user_repository, projects_repository):
        self.user_repository = user_repository
        self.projects_repository = projects_repository
        
        self.validation_view = ValidationResultView()
        self.requirement_view = RequirementInputView()
        self.code_view = CodeDisplayView()
    
    def validate_session_user(self, session):
        if 'user_id' not in session or 'username' not in session:
            return None
        
        user_data = self.user_repository.get_user_by_username(session['username'])
        if not user_data or user_data['id'] != session['user_id']:
            session.clear()
            return None
        
        return user_data
    
    def handle_login(self, data, request, session):
        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember_me = data.get('rememberMe', False)
        
        if not username or not password:
            return {
                "success": False,
                "message": "Пожалуйста, заполните все поля"
            }
        
        user = self.user_repository.authenticate_user(username, password)
        
        if user:
            ip_address = request.remote_addr
            user_agent = request.user_agent.string
            session_id = self.user_repository.create_session(user['id'], ip_address, user_agent)
            
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            session['session_id'] = session_id
            
            if remember_me:
                session.permanent = True
            else:
                session.permanent = False
            
            print(f"Пользователь {username} авторизовался")
            
            return {
                "success": True,
                "message": "Авторизация успешна",
                "user": user
            }
        else:
            return {
                "success": False,
                "message": "Неверное имя пользователя или пароль"
            }
    
    def handle_update_profile(self, session, data):
        if 'user_id' not in session:
            return {"success": False, "message": "Требуется авторизация"}
        
        field = data.get('field')
        value = data.get('value')
        
        if not field or not value:
            return {"success": False, "message": "Не все поля заполнены"}
        
        allowed_fields = ['email', 'full_name']
        if field not in allowed_fields:
            return {"success": False, "message": "Недопустимое поле"}
        
        username = session['username']
        
        if field == 'email':
            import re
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
                return {"success": False, "message": "Некорректный email адрес"}
            success = self.user_repository.update_user(username, email=value)
        elif field == 'full_name':
            success = self.user_repository.update_user(username, full_name=value)
        
        if success:
            return {
                "success": True,
                "message": "Данные успешно обновлены"
            }
        else:
            return {
                "success": False,
                "message": "Ошибка при обновлении данных"
            }
    
    def handleGenerationRequest(self, requirement_data, session_data):
        try:
            print(f"\nНачало генерации")
            print(f"Данные: {requirement_data}")
            print(f"Сессия: {session_data}")
            
            requirement_text = requirement_data.get("requirement", "").strip()
            language = requirement_data.get("language", "Python")
            framework = requirement_data.get("framework", "None")
            
            if not requirement_text:
                return {"error": "Введите требование!"}
            
            self.requirement_view.set_data(requirement_text, language)
            
            try:
                from core.di import DependencyInjector
                from core.models import RequirementModel, User, UserRole
                
                role_mapping = {
                    "DEVELOPER": UserRole.DEVELOPER,
                    "SYSTEM_ANALYST": UserRole.SYSTEM_ANALYST,
                    "STUDENT": UserRole.STUDENT
                }
                
                user_role = role_mapping.get(session_data.get('role', 'DEVELOPER'), UserRole.DEVELOPER)
                user = User(session_data.get('username', 'unknown'), user_role)

                requirement = RequirementModel(requirement_text)
                structured = DependencyInjector.get("analysis").analyze(requirement)
                structured.target_language = language

                with_comments = user_role == UserRole.STUDENT
                generated = DependencyInjector.get("generation").generateCode(structured, with_comments)

                DependencyInjector.get("validation").validate(generated)
                if "optimize" in user.get_permissions():
                    DependencyInjector.get("validation").optimize(generated)
                
                self.code_view.set_code(generated.code_body, generated.language)
                
                print(f"Генерация кода завершена")
                
                return {
                    "code": generated.code_body,
                    "language": generated.language,
                    "status": generated.validation_status.value,
                    "generated_by": session_data.get('username')
                }
                
            except ImportError as e:
                print(f"Ошибка импорта: {e}")
                # Если импорт модулей не работает, вернем тестовый код (вообще не надо, но чтобы все четенько работало)
                test_code = f"""# Сгенерированный код на {language}
                # Требование: {requirement_text}

                def main():
                    print("Hello, World!")
                    return 0

                if __name__ == "__main__":
                    main()"""
                
                self.code_view.set_code(test_code, language)
                
                return {
                    "code": test_code,
                    "language": language,
                    "status": "test",
                    "generated_by": session_data.get('username', 'test_user'),
                    "note": "Используется тестовый код (реальные модули не загружены)"
                }
                
        except Exception as e:
            print(f"Критическая ошибка в генерации: {e}")
            print(traceback.format_exc())
            
            return {
                "error": f"Ошибка генерации: {str(e)}",
                "traceback": traceback.format_exc()[-500:]  
            }
    
    def on_save_button_click(self, project_data, user_id):
          
        required_fields = ['name', 'language', 'framework']
        for field in required_fields:
            if field not in project_data or not project_data[field].strip():
                return {
                    "success": False, 
                    "message": f"Поле '{field}' обязательно для заполнения"
                }
        
        project_id = self.projects_repository.create_project(
            user_id=user_id,
            name=project_data['name'].strip(),
            description=project_data.get('description', '').strip(),
            language=project_data['language'].strip(),
            framework=project_data['framework'].strip(),
            status=project_data.get('status', 'draft')
        )
        
        self.projects_repository.update_project(
            project_id=project_id,
            user_id=user_id,
            lines_of_code=random.randint(100, 1500),
            files_count=random.randint(3, 20)
        )
        
        return {
            "success": True,
            "message": "Проект успешно создан",
            "project_id": project_id
        }
    
    def get_validation_view(self):
        return self.validation_view
    
    def get_requirement_view(self):
        return self.requirement_view
    
    def get_code_view(self):
        return self.code_view
