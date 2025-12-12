from .services import RequirementAnalysisService, CodeGenerationService, ValidationService

class DependencyInjector:
    _services = {}
    
    @classmethod
    def register(cls, name: str, service):
        cls._services[name] = service
    
    @classmethod
    def get(cls, name: str):
        return cls._services.get(name)
    
    @classmethod
    def init(cls):
        """Инициализация всех сервисов"""
        cls.register("analysis", RequirementAnalysisService())
        cls.register("generation", CodeGenerationService())
        cls.register("validation", ValidationService())

DependencyInjector.init()