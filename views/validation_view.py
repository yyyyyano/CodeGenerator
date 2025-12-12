from flask import *
from .base_view import IUserInterface

class ValidationResultView(IUserInterface):
    def __init__(self):
        self.errors = []
        self.optimizations = []
    
    def display_errors(self, errors):
        self.errors = errors
    
    def display_optimizations(self, optimizations):
        self.optimizations = optimizations
    
    def get_data(self):
        return {
            'errors': self.errors,
            'optimizations': self.optimizations
        }
    
    def render_json(self):
        return jsonify(self.get_data())