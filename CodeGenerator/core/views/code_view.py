from flask import *
from .base_view import IUserInterface
 
class CodeDisplayView(IUserInterface):
    def __init__(self):
        self.current_code = ""
        self.current_language = "Python"
    
    def set_code(self, text, language):
        self.current_code = text
        self.current_language = language
    
    def highlight_syntax(self): #функции реализуются в джесе, тк там проще подрубать, а тут везде оставила заглушки
        pass
    
    def get_data(self):
        return {
            'code': self.current_code,
            'language': self.current_language
        }
    
    def render_json(self):
        return jsonify(self.get_data())
