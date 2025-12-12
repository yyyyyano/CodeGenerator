import sqlite3
from datetime import datetime
from typing import List, Optional
import os

class ProjectsRepository:
    def __init__(self, db_path: str = "data/app_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    language TEXT NOT NULL,
                    framework TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'draft',
                    lines_of_code INTEGER DEFAULT 0,
                    files_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_id ON projects(user_id)')   
            conn.commit()
    
    def create_project(self, user_id: int, name: str, description: str, 
                       language: str, framework: str, status: str = "draft") -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO projects (user_id, name, description, language, framework, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, name, description, language, framework, status))
            
            conn.commit()
            return cursor.lastrowid
    
    def get_user_projects(self, user_id: int) -> List[dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM projects 
                WHERE user_id = ? 
                ORDER BY updated_at DESC
            ''', (user_id,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_project_by_id(self, project_id: int, user_id: int) -> Optional[dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM projects 
                WHERE id = ? AND user_id = ?
            ''', (project_id, user_id))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_project(self, project_id: int, user_id: int, **kwargs) -> bool:
        if not kwargs:
            return False
        
        fields = []
        values = []
        
        for field, value in kwargs.items():
            fields.append(f"{field} = ?")
            values.append(value)
        
        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.extend([project_id, user_id])
        
        sql = f'''
            UPDATE projects 
            SET {', '.join(fields)}
            WHERE id = ? AND user_id = ?
        '''
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(sql, tuple(values))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def delete_project(self, project_id: int, user_id: int) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM projects 
                WHERE id = ? AND user_id = ?
            ''', (project_id, user_id))
            
            conn.commit()
            return cursor.rowcount > 0
    
    def get_user_stats(self, user_id: int) -> dict:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM projects WHERE user_id = ?', (user_id,))
            total_projects = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM projects WHERE user_id = ? AND status = ?', 
                         (user_id, 'completed'))
            completed_projects = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM projects WHERE user_id = ? AND status = ?', 
                         (user_id, 'draft'))
            draft_projects = cursor.fetchone()[0]
            
            cursor.execute('SELECT SUM(lines_of_code) FROM projects WHERE user_id = ?', (user_id,))
            total_lines = cursor.fetchone()[0] or 0
            
            return {
                'total_projects': total_projects,
                'completed_projects': completed_projects,
                'draft_projects': draft_projects,
                'total_lines': total_lines
            }
        
    def get_user_project_count(self, user_id: int) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT COUNT(*) FROM projects 
                WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            return result[0] if result else 0