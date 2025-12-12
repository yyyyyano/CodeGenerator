from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from core.controllers import GenerationOrchestrator
from core.repo.user_repository import UserRepository
from core.repo.projects_repository import ProjectsRepository
import random
import os, re
from datetime import timedelta 
import random

app = Flask(__name__)

if os.environ.get('FLASK_ENV') == 'development' or True:
    app.secret_key = os.urandom(24).hex()
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
    app.config['SESSION_COOKIE_NAME'] = 'dev_session_' + str(random.randint(1000, 9999))
else:
    app.secret_key = 'blablabla'

user_repository = UserRepository()
projects_repository = ProjectsRepository()

controller = GenerationOrchestrator(user_repository, projects_repository)


@app.route("/")
def index():
    user_data = controller.validate_session_user(session)
    if user_data:
        full_name = user_data.get('full_name', session['username'])
        username = session['username']
        role = user_data.get('role', 'USER')
        email = user_data.get('email', f'{username}@example.com')
        
        return render_template("index.html", 
                              full_name=full_name,
                              username=username,
                              role=role,
                              email=email)
    
    return redirect(url_for('login_page'))

@app.route("/force_logout")
def force_logout():
    if 'session_id' in session:
        user_repository.delete_session(session['session_id'])
    
    session.clear()
    print("Сессия принудительно очищена через /force_logout")
    return redirect(url_for('login_page'))

@app.route("/login")
def login_page():
    if controller.validate_session_user(session):
        return redirect(url_for('index'))
    return render_template("authorisation.html")

@app.route("/logout")
def logout():
    if 'session_id' in session:
        user_repository.delete_session(session['session_id'])
    
    session.clear()
    return redirect(url_for('login_page'))

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    result = controller.handle_login(data, request, session)
    return jsonify(result)

@app.route("/api/check_auth")
def check_auth():
    if 'session_id' in session:
        session_data = user_repository.validate_session(session['session_id'])
        if session_data:
            return jsonify({
                "authenticated": True,
                "user": session_data
            })
    
    return jsonify({"authenticated": False})


@app.route("/register")
def register_page():
    if controller.validate_session_user(session):
        return redirect(url_for('index'))
    return render_template("authorisation.html") 

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    
    required_fields = ['username', 'email', 'password', 'confirm_password', 'role']
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return jsonify({
                "success": False,
                "message": f"Поле '{field}' обязательно для заполнения"
            }), 400
    
    if data['password'] != data['confirm_password']:
        return jsonify({
            "success": False,
            "message": "Пароли не совпадают"
        }), 400
    
    
    username_regex = r'^[a-zA-Z0-9_.-]{3,20}$'
    if not re.match(username_regex, data['username']):
        return jsonify({
            "success": False,
            "message": "Имя пользователя должно содержать от 3 до 20 символов (латинские буквы, цифры, _ . -)"
        }), 400
    
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, data['email']):
        return jsonify({
            "success": False,
            "message": "Введите корректный email адрес"
        }), 400
    
    if len(data['password']) < 6:
        return jsonify({
            "success": False,
            "message": "Пароль должен содержать минимум 6 символов"
        }), 400
    
    existing_user = user_repository.get_user_by_username(data['username'])
    if existing_user:
        return jsonify({
            "success": False,
            "message": "Пользователь с таким именем уже существует"
        }), 400
    
    success = user_repository.create_user(
        username=data['username'],
        password=data['password'],
        email=data['email'],
        full_name=data.get('full_name'),
        role=data['role']
    )
    
    if success:
        user = user_repository.get_user_by_username(data['username'])
        if user:
            demo_projects = [
                {
                    'name': 'Первое приложение',
                    'description': 'Добро пожаловать в CodeGen AI! Это ваш первый проект.',
                    'language': 'Python',
                    'framework': 'None',
                    'status': 'completed'
                },
                {
                    'name': 'Демо API',
                    'description': 'Пример REST API для обучения',
                    'language': 'TypeScript',
                    'framework': 'Express.js',
                    'status': 'draft'
                }
            ]
            
            for project_data in demo_projects:
                project_id = projects_repository.create_project(
                    user_id=user['id'],
                    name=project_data['name'],
                    description=project_data['description'],
                    language=project_data['language'],
                    framework=project_data['framework'],
                    status=project_data['status']
                )
                
                lines_of_code = random.randint(100, 500)
                files_count = random.randint(2, 10)
                
                projects_repository.update_project(
                    project_id=project_id,
                    user_id=user['id'],
                    lines_of_code=lines_of_code,
                    files_count=files_count
                )
        
        return jsonify({
            "success": True,
            "message": "Регистрация успешна! Теперь вы можете войти в систему."
        })
    else:
        return jsonify({
            "success": False,
            "message": "Ошибка при создании пользователя"
        }), 500

@app.route("/api/get_stats")
def api_get_stats():
    try:
        total_users = len(user_repository.get_all_users())
        total_projects = projects_repository.get_total_projects_count()
        
        today_generations = random.randint(300, 400)
        
        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_projects": total_projects,
                "today_generations": today_generations
            }
        })
    except Exception as e:
        print(f"Ошибка получения статистики: {e}")
        return jsonify({
            "success": False,
            "stats": {
                "total_users": 1247,
                "total_projects": 45210,
                "today_generations": 324
            }
        })



@app.route("/api/get_hint")
def get_hint():
    return jsonify({
        "hint": "Тестовые учетные данные",
        "username": "user001",
        "password": "pswd001"
    })

@app.route("/api/feature_not_implemented")
def feature_not_implemented():
    return jsonify({
        "success": False,
        "message": "Данный функционал в данный момент недоступен"
    })

@app.route("/generator")
def generator():
    user_data = controller.validate_session_user(session)
    if user_data:
        full_name = user_data.get('full_name', session['username'])
        username = session['username']
        role = user_data.get('role', 'USER')
        email = user_data.get('email', f'{username}@example.com')
        
        requirement_view_data = controller.get_requirement_view().get_data()
        
        return render_template("generator.html", 
                              full_name=full_name,
                              username=username,
                              role=role,
                              email=email,
                              **requirement_view_data)
    return redirect(url_for('login_page'))

@app.route("/profile")
def profile():
    user_data = controller.validate_session_user(session)
    if user_data:
        full_name = user_data.get('full_name', session['username'])
        username = session['username']
        role = user_data.get('role', 'USER')
        email = user_data.get('email', f'{username}@example.com')
        
        stats = projects_repository.get_user_stats(session['user_id'])
        
        return render_template("profile.html", 
                              full_name=full_name,
                              username=username,
                              role=role,
                              email=email,
                              stats=stats)  
    return redirect(url_for('login_page'))

@app.route("/api/update_profile", methods=["POST"])
def api_update_profile():
    data = request.get_json()
    result = controller.handle_update_profile(session, data)
    
    if "success" in result and not result["success"] and "message" in result:
        if "Требуется авторизация" in result["message"]:
            return jsonify(result), 401
        elif "Не все поля" in result["message"] or "Недопустимое поле" in result["message"]:
            return jsonify(result), 400
    
    return jsonify(result)

@app.route("/api/update_role", methods=["POST"])
def api_update_role():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Требуется авторизация"}), 401
    
    data = request.get_json()
    role = data.get('role', '').upper()
    
    allowed_roles = ['DEVELOPER', 'SYSTEM_ANALYST', 'STUDENT']
    if role not in allowed_roles:
        return jsonify({"success": False, "message": "Недопустимая роль"}), 400
    
    username = session['username']
    success = user_repository.update_user_role(username, role)
    
    if success:
        session['role'] = role
        
        return jsonify({
            "success": True,
            "message": "Роль успешно изменена"
        })
    else:
        return jsonify({
            "success": False,
            "message": "Ошибка при изменении роли"
        }), 500

@app.route("/projects")
def projects():
    user_data = controller.validate_session_user(session)
    if user_data:
        user_projects = projects_repository.get_user_projects(session['user_id'])
        
        stats = projects_repository.get_user_stats(session['user_id'])
        
        full_name = user_data.get('full_name', session['username'])
        username = session['username']
        role = user_data.get('role', 'USER')
        email = user_data.get('email', f'{username}@example.com')
        
        return render_template("projects.html", 
                              full_name=full_name,
                              username=username,
                              role=role,
                              email=email,
                              projects=user_projects,
                              stats=stats)
    return redirect(url_for('login_page'))

@app.route("/templates")
def templates():
    user_data = controller.validate_session_user(session)
    if user_data:
        full_name = user_data.get('full_name', session['username'])
        username = session['username']
        role = user_data.get('role', 'USER')
        email = user_data.get('email', f'{username}@example.com')
        
        return render_template("templates.html", 
                              full_name=full_name,
                              username=username,
                              role=role,
                              email=email)
    return redirect(url_for('login_page'))

@app.route("/api/projects/create", methods=["POST"])
def api_create_project():
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Требуется авторизация"}), 401
    
    data = request.get_json()
    result = controller.on_save_button_click(data, session['user_id'])
    
    if "success" in result and not result["success"]:
        return jsonify(result), 400
    
    return jsonify(result)

@app.route("/api/projects/<int:project_id>", methods=["GET", "PUT", "DELETE"])
def api_project(project_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Требуется авторизация"}), 401
    
    user_id = session['user_id']
    
    if request.method == 'GET':
        project = projects_repository.get_project_by_id(project_id, user_id)
        if not project:
            return jsonify({"success": False, "message": "Проект не найден"}), 404
        
        return jsonify({"success": True, "project": project})
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        allowed_fields = ['name', 'description', 'language', 'framework', 'status']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field].strip() if isinstance(data[field], str) else data[field]
        
        if not update_data:
            return jsonify({"success": False, "message": "Нет данных для обновления"}), 400
        
        success = projects_repository.update_project(project_id, user_id, **update_data)
        
        if success:
            return jsonify({"success": True, "message": "Проект успешно обновлен"})
        else:
            return jsonify({"success": False, "message": "Проект не найден или нет прав"}), 404
    
    elif request.method == 'DELETE':
        success = projects_repository.delete_project(project_id, user_id)
        
        if success:
            return jsonify({"success": True, "message": "Проект успешно удален"})
        else:
            return jsonify({"success": False, "message": "Проект не найден или нет прав"}), 404

@app.route("/api/projects/<int:project_id>/open")
def api_open_project(project_id):
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Требуется авторизация"}), 401
    
    project = projects_repository.get_project_by_id(project_id, session['user_id'])
    if not project:
        return jsonify({"success": False, "message": "Проект не найден"}), 404
    
 
    return jsonify({
        "success": True,
        "message": "Проект открыт",
        "image_url": url_for('static', filename='picture.jpeg'),
        "project": project
    })

@app.route("/generate", methods=["POST"])
def generate():
    print(f"Сессия: {dict(session)}")
    
    if 'user_id' not in session:
        print("ОШИБКА: Пользователь не авторизован")
        return jsonify({"error": "Требуется авторизация"}), 401
    
    try:
        data = request.get_json()
        print(f"Данные запроса: {data}")
        
        result = controller.handleGenerationRequest(data, dict(session))
        print(f"Результат контроллера: {result}")
        
        if 'error' in result:
            print(f"!!!!! ОШИБКА В КОНТРОЛЛЕРЕ: {result['error']}")
            return jsonify(result), 400
        
        code_view_data = controller.get_code_view().get_data()
        validation_view_data = controller.get_validation_view().get_data()
        requirement_view_data = controller.get_requirement_view().get_data()
        
        response = {
            'success': True,
            'code': code_view_data,
            'validation': validation_view_data,
            'requirement': requirement_view_data,
            'message': 'Код успешно сгенерирован'
        }
        
        print(f"Ответ генератора: {response}")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"!!!!! КРИТИЧЕСКАЯ ОШИБКА В МАРШРУТЕ /generate: {e}")
        import traceback
        error_trace = traceback.format_exc()
        print(error_trace)
        
        return jsonify({
            "error": f"Внутренняя ошибка сервера: {str(e)}",
            "traceback": error_trace[-1000:] 
        }), 500

@app.route("/api/get_validation_results")
def api_get_validation_results():
    validation_view = controller.get_validation_view()
    return validation_view.render_json()

@app.route("/api/get_code_display")
def api_get_code_display():
    code_view = controller.get_code_view()
    return code_view.render_json()

if __name__ == "__main__":
    print("⚡ CodeGen AI запущен → http://127.0.0.1:5000")
    print("\nТестовые учетные данные:")
    print("  • Имя пользователя: user001")
    print("  • Пароль: pswd001")
    
    app.run(host="0.0.0.0", port=5000, debug=True)