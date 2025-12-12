from ..models import GeneratedCode
from ..models import RequirementModel
import string

class IUserInterface:
    def displayCode(code: GeneratedCode):
        pass

    def show_error(message: string):
        pass

    def showValidationResult():
        pass

    def getUserInput()->RequirementModel:
        pass