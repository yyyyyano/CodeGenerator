from openai import OpenAI
import re
import ast
import json
import os
from typing import Dict
from .models import StructuredModel, GeneratedCode, ValidationStatus

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODEL = "qwen2.5-coder:7b"

class IRequirementAnalysysService:
    def analyze(self,requirement): pass

class RequirementAnalysisService(IRequirementAnalysysService):
    def analyze(self, requirement) -> StructuredModel:
        prompt = (
            "Ты эксперт-аналитик. Разбери требование и верни ТОЛЬКО чистый JSON без пояснений:\n"
            "{\n"
            '  "functional_description": "...",\n'
            '  "target_language": "Python",\n'
            '  "entities": {"ИмяКласса": ["поле1", "поле2"]}\n'
            "}\n"
            "Если не уверен — оставь пустые поля."
        )
        user_prompt = f"Требование: {requirement.input_text}"

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=512
            )
            text = response.choices[0].message.content
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            data = json.loads(json_match.group()) if json_match else {}
        except Exception as e:
            print(f"[RequirementAnalysisService] Ошибка: {e}")
            data = {"functional_description": requirement.input_text, "target_language": "Python", "entities": {}}

        return StructuredModel(
            functional_description=data.get("functional_description", requirement.input_text),
            target_language=data.get("target_language", "Python"),
            entities=data.get("entities", {})
        )

class ICodeGenerationService:
    def generateCode(self, structured, with_comments)->GeneratedCode:
        pass

class CodeGenerationService(ICodeGenerationService):
    def generateCode(self, structured: StructuredModel, with_comments: bool = False) -> GeneratedCode:
        prompt = f"Напиши код на {structured.target_language}:\n{structured.functional_description}"
        if structured.entities:
            prompt += f"\nСущности: {structured.entities}"
        if with_comments:
            prompt += "\nДобавь подробные комментарии на русском языке."

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4096
            )
            code = response.choices[0].message.content
            code = re.sub(r"^```[a-zA-Z+]*\n|```$", "", code, flags=re.MULTILINE).strip()
        except Exception as e:
            print(f"[CodeGenerationService] Ошибка: {e}")
            code = f"// Ошибка генерации: {str(e)}"

        return GeneratedCode(
            name="Generated",
            language=structured.target_language,
            code_body=code,
            has_comments=with_comments
        )


class IValidationService:
    def validate(self, generated_code):
        pass

    def optimize(self, generatedcode) -> GeneratedCode:
        pass
    

class ValidationService:
    def validate(self, generated_code: GeneratedCode) -> ValidationStatus:
        if generated_code.language == "Python":
            try:
                ast.parse(generated_code.code_body)
                generated_code.validation_status = ValidationStatus.VALID
            except Exception:
                generated_code.validation_status = ValidationStatus.INVALID
        else:
            generated_code.validation_status = ValidationStatus.VALID
        return generated_code.validation_status

    def optimize(self, generated_code: GeneratedCode) -> GeneratedCode:
        prompt = f"Оптимизируй этот код для производительности и читаемости:\n{generated_code.code_body}"
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            optimized = response.choices[0].message.content
            optimized = re.sub(r"^```[a-zA-Z+]*\n|```$", "", optimized, flags=re.MULTILINE).strip()
            generated_code.code_body = optimized
            generated_code.validation_status = ValidationStatus.OPTIMIZED
        except Exception as e:
            print(f"[ValidationService] Оптимизация не удалась: {e}")
        return generated_code
