from enum import Enum
from typing import List, Dict
import uuid
from datetime import datetime
from typing import Optional

class UserRole(Enum):
    DEVELOPER = "Developer"
    SYSTEM_ANALYST = "System Analyst"
    STUDENT = "Student"

class InputType(Enum):
    NATURAL_LANGUAGE = "Natural Language"
    FORMAL_SPECIFICATION = "Formal Specification"
    DIAGRAM = "Diagram"

class ValidationStatus(Enum):
    PENDING = "Pending"
    VALID = "Valid"
    INVALID = "Invalid"
    OPTIMIZED = "Optimized"

class User:
    def __init__(self, username: str, role: UserRole):
        self.id = uuid.uuid4()
        self.username = username
        self.role = role

    def get_permissions(self) -> List[str]:
        perms = {
            UserRole.DEVELOPER: ["generate", "edit", "validate", "optimize"],
            UserRole.SYSTEM_ANALYST: ["analyze", "prototype", "validate"],
            UserRole.STUDENT: ["generate_with_comments", "learn"]
        }
        return perms.get(self.role, [])


class RequirementModel:
    def __init__(self, input_text: str, input_type: InputType = InputType.NATURAL_LANGUAGE):
        self.id = uuid.uuid4()
        self.input_text = input_text
        self.input_type = input_type
        self.status = ValidationStatus.PENDING

class StructuredModel:
    def __init__(self, functional_description: str, target_language: str, entities: Dict[str, List[str]]):
        self.functional_description = functional_description
        self.target_language = target_language
        self.entities = entities

class GeneratedCode:
    def __init__(self, code_body: str, name: str,language: str, has_comments: bool = False):
        self.id = uuid.uuid4()
        self.name = name
        self.code_body = code_body
        self.language = language
        self.has_comments = has_comments
        self.validation_status = ValidationStatus.PENDING


class Project:
    def __init__(self, id: int, user_id: int, name: str, description: str, 
                 language: str, framework: str, status: str, 
                 lines_of_code: int = 0, files_count: int = 0,
                 created_at: Optional[datetime] = None, 
                 updated_at: Optional[datetime] = None):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.description = description
        self.language = language
        self.framework = framework
        self.status = status  
        self.lines_of_code = lines_of_code
        self.files_count = files_count
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
