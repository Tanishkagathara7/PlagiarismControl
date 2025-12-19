import nbformat
import re
import os
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from difflib import SequenceMatcher


class CodeNormalizer:
    """Normalize code for comparison"""
    
    @staticmethod
    def remove_comments(code: str) -> str:
        """Remove Python comments"""
        code = re.sub(r'#.*?$', '', code, flags=re.MULTILINE)
        code = re.sub(r'""".*?"""', '', code, flags=re.DOTALL)
        code = re.sub(r"'''.*?'''", '', code, flags=re.DOTALL)
        return code
    
    @staticmethod
    def normalize_whitespace(code: str) -> str:
        """Normalize whitespace and indentation"""
        lines = code.split('\n')
        normalized_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped:
                normalized_lines.append(stripped)
        return '\n'.join(normalized_lines)
    
    @staticmethod
    def normalize_variable_names(code: str) -> str:
        """Normalize variable names to generic names"""
        tokens = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code)
        keywords = {'def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while', 
                    'return', 'try', 'except', 'finally', 'with', 'as', 'break', 'continue',
                    'pass', 'raise', 'assert', 'yield', 'lambda', 'True', 'False', 'None',
                    'and', 'or', 'not', 'in', 'is', 'print', 'range', 'len', 'str', 'int',
                    'float', 'list', 'dict', 'set', 'tuple', 'open', 'file'}
        
        var_mapping = {}
        var_counter = 0
        normalized_code = code
        
        for token in tokens:
            if token not in keywords and token not in var_mapping:
                var_mapping[token] = f'var{var_counter}'
                var_counter += 1
        
        for original, normalized in var_mapping.items():
            normalized_code = re.sub(r'\b' + original + r'\b', normalized, normalized_code)
        
        return normalized_code
    
    @staticmethod
    def normalize_code(code: str, normalize_vars: bool = True) -> str:
        """Apply all normalizations"""
        code = CodeNormalizer.remove_comments(code)
        code = CodeNormalizer.normalize_whitespace(code)
        if normalize_vars:
            code = CodeNormalizer.normalize_variable_names(code)
        return code


class NotebookParser:
    """Parse Jupyter notebooks and extract code"""
    
    @staticmethod
    def extract_code_from_notebook(file_path: str) -> str:
        """Extract only code cells from .ipynb file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                notebook = nbformat.read(f, as_version=4)
            
            code_cells = []
            for cell in notebook.cells:
                if cell.cell_type == 'code':
                    code_cells.append(cell.source)
            
            return '\n\n'.join(code_cells)
        except Exception as e:
            print(f"Error reading notebook {file_path}: {str(e)}")
            return ""


class PlagiarismDetector:
    """Detect code plagiarism between students"""
    
    def __init__(self, threshold: float = 0.5, normalize_vars: bool = True):
        self.threshold = threshold
        self.normalize_vars = normalize_vars
    
    def calculate_similarity(self, code1: str, code2: str) -> float:
        """Calculate similarity using TF-IDF and cosine similarity"""
        if not code1 or not code2:
            return 0.0
        
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([code1, code2])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(similarity)
        except:
            return 0.0
    
    def find_matching_lines(self, code1: str, code2: str) -> List[Dict]:
        """Find exact and near-matching lines between two code blocks"""
        lines1 = code1.split('\n')
        lines2 = code2.split('\n')
        
        matches = []
        
        for i, line1 in enumerate(lines1):
            if not line1.strip():
                continue
            
            for j, line2 in enumerate(lines2):
                if not line2.strip():
                    continue
                
                ratio = SequenceMatcher(None, line1, line2).ratio()
                
                if ratio > 0.8:
                    matches.append({
                        'lineA': i + 1,
                        'lineB': j + 1,
                        'code': line1.strip(),
                        'similarity': round(ratio * 100, 1)
                    })
        
        return matches
    
    def detect_plagiarism(self, files_data: List[Dict]) -> List[Dict]:
        """Detect plagiarism among multiple students"""
        results = []
        
        processed_files = []
        for file_data in files_data:
            raw_code = NotebookParser.extract_code_from_notebook(file_data['file_path'])
            normalized_code = CodeNormalizer.normalize_code(raw_code, self.normalize_vars)
            
            processed_files.append({
                'student_name': file_data['student_name'],
                'student_id': file_data['student_id'],
                'file_id': file_data['file_id'],
                'raw_code': raw_code,
                'normalized_code': normalized_code,
                'upload_order': file_data.get('upload_order', 0)
            })
        
        for i in range(len(processed_files)):
            for j in range(i + 1, len(processed_files)):
                file_a = processed_files[i]
                file_b = processed_files[j]
                
                similarity = self.calculate_similarity(
                    file_a['normalized_code'],
                    file_b['normalized_code']
                )
                
                if similarity >= self.threshold:
                    matching_lines = self.find_matching_lines(
                        file_a['normalized_code'],
                        file_b['normalized_code']
                    )
                    
                    results.append({
                        'studentA': file_a['student_name'],
                        'studentA_id': file_a['student_id'],
                        'fileA_id': file_a['file_id'],
                        'studentB': file_b['student_name'],
                        'studentB_id': file_b['student_id'],
                        'fileB_id': file_b['file_id'],
                        'similarity': round(similarity * 100, 2),
                        'matching_lines': matching_lines[:50],
                        'total_matches': len(matching_lines)
                    })
        
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results


if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python plagiarism_detector.py <files_json>")
        sys.exit(1)
    
    files_json = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    
    files_data = json.loads(files_json)
    
    detector = PlagiarismDetector(threshold=threshold)
    results = detector.detect_plagiarism(files_data)
    
    print(json.dumps(results))
