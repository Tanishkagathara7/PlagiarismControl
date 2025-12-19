import nbformat
import re
import os
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from difflib import SequenceMatcher
import hashlib
from collections import defaultdict


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


class FastPlagiarismDetector:
    """Optimized plagiarism detector for better performance"""
    
    def __init__(self, threshold: float = 0.5, normalize_vars: bool = True):
        self.threshold = threshold
        self.normalize_vars = normalize_vars
        # Pre-initialize vectorizer for reuse
        self.vectorizer = TfidfVectorizer(
            max_features=1000,  # Limit features for speed
            stop_words='english',
            ngram_range=(1, 2),  # Use unigrams and bigrams
            min_df=1,
            max_df=0.95
        )
        self.code_hashes = {}  # Cache for duplicate detection
    
    def calculate_similarity_batch(self, codes: List[str]) -> np.ndarray:
        """Calculate similarity matrix for all codes at once"""
        if len(codes) < 2:
            return np.array([[]])
        
        try:
            # Fit vectorizer on all codes at once
            tfidf_matrix = self.vectorizer.fit_transform(codes)
            # Calculate similarity matrix
            similarity_matrix = cosine_similarity(tfidf_matrix)
            return similarity_matrix
        except Exception as e:
            print(f"Error in batch similarity calculation: {e}")
            # Fallback to zeros
            n = len(codes)
            return np.zeros((n, n))
    
    def calculate_code_hash(self, code: str) -> str:
        """Calculate hash for duplicate detection"""
        return hashlib.md5(code.encode()).hexdigest()
    
    def find_matching_lines_fast(self, code1: str, code2: str, max_matches: int = 20) -> List[Dict]:
        """Optimized line matching with early termination"""
        lines1 = [line.strip() for line in code1.split('\n') if line.strip()]
        lines2 = [line.strip() for line in code2.split('\n') if line.strip()]
        
        matches = []
        
        # Use sets for faster lookup of exact matches
        line2_set = {line: idx for idx, line in enumerate(lines2)}
        
        for i, line1 in enumerate(lines1):
            # Check for exact matches first (fastest)
            if line1 in line2_set:
                matches.append({
                    'lineA': i + 1,
                    'lineB': line2_set[line1] + 1,
                    'code': line1,
                    'similarity': 100.0
                })
                if len(matches) >= max_matches:
                    break
                continue
            
            # Only check similarity for non-exact matches if we haven't hit the limit
            if len(matches) < max_matches:
                for j, line2 in enumerate(lines2):
                    if len(line1) > 10 and len(line2) > 10:  # Only compare substantial lines
                        ratio = SequenceMatcher(None, line1, line2).ratio()
                        if ratio > 0.85:  # Higher threshold for speed
                            matches.append({
                                'lineA': i + 1,
                                'lineB': j + 1,
                                'code': line1,
                                'similarity': round(ratio * 100, 1)
                            })
                            if len(matches) >= max_matches:
                                break
                if len(matches) >= max_matches:
                    break
        
        return matches
    
    def detect_plagiarism(self, files_data: List[Dict]) -> List[Dict]:
        """Optimized plagiarism detection"""
        if len(files_data) < 2:
            return []
        
        print(f"Processing {len(files_data)} files...")
        
        # Step 1: Process all files and extract codes
        processed_files = []
        codes = []
        
        for file_data in files_data:
            try:
                raw_code = NotebookParser.extract_code_from_notebook(file_data['file_path'])
                normalized_code = CodeNormalizer.normalize_code(raw_code, self.normalize_vars)
                
                # Skip empty files
                if not normalized_code.strip():
                    continue
                
                processed_files.append({
                    'student_name': file_data['student_name'],
                    'student_id': file_data['student_id'],
                    'file_id': file_data['file_id'],
                    'raw_code': raw_code,
                    'normalized_code': normalized_code,
                    'upload_order': file_data.get('upload_order', 0),
                    'code_hash': self.calculate_code_hash(normalized_code)
                })
                codes.append(normalized_code)
            except Exception as e:
                print(f"Error processing file {file_data.get('filename', 'unknown')}: {e}")
                continue
        
        if len(processed_files) < 2:
            return []
        
        print(f"Calculating similarity matrix for {len(codes)} files...")
        
        # Step 2: Calculate similarity matrix for all files at once
        similarity_matrix = self.calculate_similarity_batch(codes)
        
        # Step 3: Process results
        results = []
        
        for i in range(len(processed_files)):
            for j in range(i + 1, len(processed_files)):
                file_a = processed_files[i]
                file_b = processed_files[j]
                
                # Check for exact duplicates first
                if file_a['code_hash'] == file_b['code_hash']:
                    similarity = 1.0
                else:
                    similarity = similarity_matrix[i][j] if similarity_matrix.size > 0 else 0.0
                
                if similarity >= self.threshold:
                    # Only calculate matching lines for high similarity cases
                    matching_lines = []
                    if similarity > 0.7:  # Only for high similarity
                        matching_lines = self.find_matching_lines_fast(
                            file_a['normalized_code'],
                            file_b['normalized_code'],
                            max_matches=20  # Limit for performance
                        )
                    
                    results.append({
                        'studentA': file_a['student_name'],
                        'studentA_id': file_a['student_id'],
                        'fileA_id': file_a['file_id'],
                        'studentB': file_b['student_name'],
                        'studentB_id': file_b['student_id'],
                        'fileB_id': file_b['file_id'],
                        'similarity': round(similarity * 100, 2),
                        'matching_lines': matching_lines,
                        'total_matches': len(matching_lines)
                    })
        
        # Sort by similarity (highest first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        print(f"Found {len(results)} potential matches")
        return results


# Alias for backward compatibility
PlagiarismDetector = FastPlagiarismDetector


if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python plagiarism_detector.py <files_json>")
        sys.exit(1)
    
    files_json = sys.argv[1]
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    
    files_data = json.loads(files_json)
    
    detector = FastPlagiarismDetector(threshold=threshold)
    results = detector.detect_plagiarism(files_data)
    
    print(json.dumps(results))