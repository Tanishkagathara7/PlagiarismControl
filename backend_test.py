import requests
import sys
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

class PlagiarismAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_files = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers={k: v for k, v in headers.items() if k != 'Content-Type'})
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_sample_notebook(self, student_name, student_id, code_content):
        """Create a sample .ipynb file for testing"""
        notebook_content = {
            "cells": [
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": code_content.split('\n')
                }
            ],
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "name": "python",
                    "version": "3.8.0"
                }
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.ipynb', delete=False)
        json.dump(notebook_content, temp_file, indent=2)
        temp_file.close()
        
        return temp_file.name

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_register_admin(self, username, password):
        """Test admin registration"""
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data={"username": username, "password": password}
        )
        return success

    def test_login_admin(self, username, password):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_upload_file(self, student_name, student_id, code_content):
        """Test file upload"""
        notebook_path = self.create_sample_notebook(student_name, student_id, code_content)
        
        try:
            with open(notebook_path, 'rb') as f:
                files = {'file': (f'{student_name}.ipynb', f, 'application/x-ipynb+json')}
                data = {
                    'student_name': student_name,
                    'student_id': student_id
                }
                
                success, response = self.run_test(
                    f"Upload File - {student_name}",
                    "POST",
                    "upload",
                    200,
                    data=data,
                    files=files
                )
                
                if success and 'file_id' in response:
                    self.uploaded_files.append(response['file_id'])
                    return response['file_id']
                    
        finally:
            os.unlink(notebook_path)
        
        return None

    def test_get_files(self):
        """Test getting uploaded files"""
        success, response = self.run_test(
            "Get Files",
            "GET",
            "files",
            200
        )
        if success:
            print(f"✅ Found {len(response)} uploaded files")
        return success, response

    def test_analyze_plagiarism(self, threshold=0.5):
        """Test plagiarism analysis"""
        success, response = self.run_test(
            "Analyze Plagiarism",
            "POST",
            "analyze",
            200,
            data={"threshold": threshold}
        )
        if success:
            print(f"✅ Analysis completed with {response.get('total_matches', 0)} matches")
        return success, response

    def test_get_latest_results(self):
        """Test getting latest analysis results"""
        success, response = self.run_test(
            "Get Latest Results",
            "GET",
            "results/latest",
            200
        )
        return success, response

    def test_compare_files(self, file_a_id, file_b_id):
        """Test file comparison"""
        success, response = self.run_test(
            "Compare Files",
            "POST",
            "compare",
            200,
            data={"fileA_id": file_a_id, "fileB_id": file_b_id}
        )
        return success, response

    def test_delete_file(self, file_id):
        """Test file deletion"""
        success, response = self.run_test(
            "Delete File",
            "DELETE",
            f"files/{file_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Plagiarism Detection API Tests")
    print("=" * 50)
    
    tester = PlagiarismAPITester()
    test_username = f"test_admin_{datetime.now().strftime('%H%M%S')}"
    test_password = "TestPass123!"

    # Test 1: Root endpoint
    if not tester.test_root_endpoint():
        print("❌ Root endpoint failed, stopping tests")
        return 1

    # Test 2: Admin registration
    if not tester.test_register_admin(test_username, test_password):
        print("❌ Admin registration failed, stopping tests")
        return 1

    # Test 3: Admin login
    if not tester.test_login_admin(test_username, test_password):
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test 4: Upload sample files with similar code
    similar_code = """
import pandas as pd
import numpy as np

def calculate_mean(data):
    return sum(data) / len(data)

def process_data(df):
    df['mean'] = df.apply(calculate_mean, axis=1)
    return df

data = [1, 2, 3, 4, 5]
result = calculate_mean(data)
print(f"Mean: {result}")
"""

    slightly_different_code = """
import pandas as pd
import numpy as np

def calc_average(numbers):
    return sum(numbers) / len(numbers)

def process_dataframe(dataframe):
    dataframe['average'] = dataframe.apply(calc_average, axis=1)
    return dataframe

values = [1, 2, 3, 4, 5]
avg = calc_average(values)
print(f"Average: {avg}")
"""

    different_code = """
import matplotlib.pyplot as plt
import seaborn as sns

def create_plot(x, y):
    plt.figure(figsize=(10, 6))
    plt.plot(x, y)
    plt.title("Sample Plot")
    plt.show()

x_values = range(10)
y_values = [i**2 for i in x_values]
create_plot(x_values, y_values)
"""

    # Upload test files
    file1_id = tester.test_upload_file("John Doe", "STU001", similar_code)
    file2_id = tester.test_upload_file("Jane Smith", "STU002", slightly_different_code)
    file3_id = tester.test_upload_file("Bob Johnson", "STU003", different_code)

    if not all([file1_id, file2_id, file3_id]):
        print("❌ File upload failed, stopping tests")
        return 1

    # Test 5: Get uploaded files
    success, files_data = tester.test_get_files()
    if not success:
        print("❌ Get files failed")
        return 1

    # Test 6: Run plagiarism analysis
    success, analysis_result = tester.test_analyze_plagiarism(0.3)  # Lower threshold to catch similarities
    if not success:
        print("❌ Plagiarism analysis failed")
        return 1

    # Test 7: Get latest results
    success, latest_results = tester.test_get_latest_results()
    if not success:
        print("❌ Get latest results failed")
        return 1

    # Test 8: Compare files
    if file1_id and file2_id:
        success, comparison = tester.test_compare_files(file1_id, file2_id)
        if not success:
            print("❌ File comparison failed")

    # Test 9: Delete a file
    if file3_id:
        success = tester.test_delete_file(file3_id)
        if not success:
            print("❌ File deletion failed")

    # Test 10: Verify file was deleted
    success, files_after_delete = tester.test_get_files()
    if success:
        if len(files_after_delete) == len(files_data) - 1:
            print("✅ File deletion verified")
            tester.tests_passed += 1
        else:
            print("❌ File deletion verification failed")
        tester.tests_run += 1

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())