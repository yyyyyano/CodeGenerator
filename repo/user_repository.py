import sqlite3
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class UserRepository:
    def __init__(self, db_path: str = "data/users_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                full_name TEXT,
                role TEXT DEFAULT 'DEVELOPER',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expire_time TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        self.create_default_users()
    
    def create_default_users(self):
        default_users = [
            {
                "username": "user001",
                "password": "pswd001",
                "email": "user001@example.com",
                "full_name": "Пользователь 001",
                "role": "DEVELOPER"
            },
            {
                "username": "admin",
                "password": "admin123",
                "email": "admin@codegen.ai",
                "full_name": "Администратор системы",
                "role": "SYSTEM_ANALYST"
            },
            {
                "username": "student",
                "password": "student123",
                "email": "student@edu.com",
                "full_name": "Студент Тестовый",
                "role": "STUDENT"
            }
        ]
        
        for user_data in default_users:
            existing = self.get_user_by_username(user_data["username"])
            if not existing:
                self.create_user(
                    username=user_data["username"],
                    password=user_data["password"],
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    role=user_data["role"]
                )
    
    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        return self.hash_password(password) == password_hash
    
    def create_user(self, username: str, password: str, email: str = None, full_name: str = None, role: str = "DEVELOPER") -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            user_id = str(uuid.uuid4())
            password_hash = self.hash_password(password)
            
            cursor.execute('''
                INSERT INTO users (id, username, password_hash, email, full_name, role)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, username, password_hash, email, full_name, role))
            
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False  
        except Exception as e:
            print(f"Ошибка создания пользователя: {e}")
            return False
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, password_hash, email, full_name, role
            FROM users 
            WHERE username = ? AND is_active = 1
        ''', (username,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if user_data:
            user_id, username, password_hash, email, full_name, role = user_data
            if self.verify_password(password, password_hash):
                self.update_last_login(user_id)
                return {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "role": role
                }   
        return None
    
    # В классе UserRepository добавьте метод:

    def get_all_users(self):
        """Получение списка всех пользователей"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, full_name, role, created_at, is_active
            FROM users
            ORDER BY created_at DESC
        ''')
        
        users = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "full_name": user[3],
                "role": user[4],
                "created_at": user[5],
                "is_active": bool(user[6])
            }
            for user in users
        ]
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, full_name, role, created_at
            FROM users 
            WHERE username = ? AND is_active = 1
        ''', (username,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if user_data:
            return {
                "id": user_data[0],
                "username": user_data[1],
                "email": user_data[2],
                "full_name": user_data[3],
                "role": user_data[4],
                "created_at": user_data[5]
            }
        
        return None
    
    def update_last_login(self, user_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (user_id,))
        
        conn.commit()
        conn.close()
    
    def create_session(self, user_id: str, ip_address: str = None, user_agent: str = None, duration_hours: int = 8) -> str:
        session_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?)
        ''', (session_id, user_id, ip_address, user_agent))
        
        conn.commit()
        conn.close()
        return session_id
    
    def validate_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT us.session_id, us.user_id, us.login_time, 
                   u.username, u.email, u.full_name, u.role
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.session_id = ? 
            AND u.is_active = 1
            AND datetime(us.login_time, '+8 hours') > CURRENT_TIMESTAMP
        ''', (session_id,))
        
        session_data = cursor.fetchone()
        conn.close()
        
        if session_data:
            return {
                "session_id": session_data[0],
                "user_id": session_data[1],
                "login_time": session_data[2],
                "username": session_data[3],
                "email": session_data[4],
                "full_name": session_data[5],
                "role": session_data[6]
            }
        
        return None
    
    def delete_session(self, session_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM user_sessions WHERE session_id = ?', (session_id,))
        conn.commit()
        conn.close()

    def update_user(self, username: str, **kwargs) -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            allowed_fields = ['email', 'full_name']
            update_fields = []
            update_values = []
            
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                conn.close()
                return False
            
            update_values.append(username)
            
            query = f'''
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE username = ?
            '''
            
            cursor.execute(query, update_values)
            conn.commit()
            conn.close()
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Ошибка обновления пользователя: {e}")
            return False
        
    def update_user_role(self, username: str, role: str) -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE users 
                SET role = ?
                WHERE username = ?
            ''', (role, username))
            
            conn.commit()
            conn.close()
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Ошибка обновления роли: {e}")
            return False