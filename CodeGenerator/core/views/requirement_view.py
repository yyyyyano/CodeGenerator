from .base_view import IUserInterface

class RequirementInputView(IUserInterface):
    def __init__(self):
        self.current_requirement = ""
        self.language = "Python"
    
    def get_requirement_text(self):
        return self.current_requirement
    
    def get_uploaded_file(self):
        return ""
    
    def set_data(self, text, language):
        self.current_requirement = text
        self.language = language
    
    def get_data(self):
        return {
            'requirement_text': self.current_requirement,
            'language': self.language
        }
