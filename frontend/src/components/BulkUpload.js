import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { 
  UploadIcon, 
  FileIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  TrashIcon,
  AlertCircleIcon 
} from 'lucide-react';

function BulkUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach(error => {
        if (error.code === 'file-invalid-type') {
          toast.error(`${file.name}: Only .ipynb files are allowed`);
        } else if (error.code === 'too-many-files') {
          toast.error('Maximum 300 files allowed');
        } else {
          toast.error(`${file.name}: ${error.message}`);
        }
      });
    });

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: 'pending' // pending, uploading, success, error
    }));

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      if (combined.length > 300) {
        toast.error('Maximum 300 files allowed. Extra files will be ignored.');
        return combined.slice(0, 300);
      }
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.ipynb']
    },
    maxFiles: 300,
    multiple: true
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
    setUploadResults(null);
    setUploadProgress(0);
  };

  const extractStudentInfo = (filename) => {
    const baseName = filename.replace('.ipynb', '');
    
    // Pattern 1: Check if filename contains " - " (dash separator)
    // Format: "Assignment - Student Name" or "Python_(Lab_05) - Student Name"
    if (baseName.includes(' - ')) {
      const parts = baseName.split(' - ');
      const studentName = parts[parts.length - 1].trim(); // Take last part after dash
      if (studentName) {
        const studentId = studentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        return { name: studentName, id: studentId };
      }
    }
    
    // Pattern 2: Check if filename contains "-" (dash without spaces)
    if (baseName.includes('-') && !baseName.includes(' - ')) {
      const parts = baseName.split('-');
      const studentName = parts[parts.length - 1].trim(); // Take last part after dash
      if (studentName) {
        const studentId = studentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        return { name: studentName, id: studentId };
      }
    }
    
    // Pattern 3: Underscore separated (fallback to original logic)
    const parts = baseName.split('_').filter(part => part.trim());
    
    if (parts.length === 1) {
      const part = parts[0];
      // Check if it's a roll number
      if (/^roll\d+$/i.test(part)) {
        return { name: part.toLowerCase(), id: part.toLowerCase() };
      }
      // Check if it's just numbers (student ID)
      if (/^\d+$/.test(part)) {
        return { name: `student_${part}`, id: part };
      }
      return { name: part, id: part.toLowerCase() };
    }
    
    // Multiple parts - find where assignment part ends and name begins
    const assignmentIndicators = ['lab', 'assignment', 'hw', 'project', 'task', 'exercise', 'ex', 'test', 'quiz'];
    
    let nameStartIndex = 0;
    
    // Find the last assignment indicator
    for (let i = 0; i < parts.length; i++) {
      const partLower = parts[i].toLowerCase();
      // Check if this part is an assignment indicator
      if (assignmentIndicators.includes(partLower)) {
        nameStartIndex = i + 1;
      }
      // Check if this part starts with assignment indicator
      else if (assignmentIndicators.some(indicator => partLower.startsWith(indicator))) {
        nameStartIndex = i + 1;
      }
      // Check if this part is assignment + number
      else if (/^(lab|assignment|hw|project|task|exercise|ex|test|quiz)\d+$/i.test(partLower)) {
        nameStartIndex = i + 1;
      }
    }
    
    // Extract name parts (everything after assignment indicators)
    let nameParts;
    if (nameStartIndex < parts.length) {
      nameParts = parts.slice(nameStartIndex);
    } else {
      // If no assignment indicators found, take the last 1-2 parts as name
      nameParts = parts.length >= 2 ? parts.slice(-2) : parts.slice(-1);
    }
    
    // Clean and format the name parts
    const cleanNameParts = [];
    for (const part of nameParts) {
      if (!part) continue;
      
      // Check if it's a roll number
      if (/^roll\d+$/i.test(part)) {
        return { name: part.toLowerCase(), id: part.toLowerCase() };
      }
      // Check if it's just numbers (student ID)
      if (/^\d+$/.test(part)) {
        return { name: `student_${part}`, id: part };
      }
      cleanNameParts.push(part);
    }
    
    if (cleanNameParts.length > 0) {
      const name = cleanNameParts.join(' ');
      const id = cleanNameParts.join('_').toLowerCase();
      return { name, id };
    }
    
    // Fallback
    return { name: baseName.replace('_', ' '), id: baseName.toLowerCase() };
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      const response = await api.post('/upload/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      setUploadResults(response.data);
      
      if (response.data.total_uploaded > 0) {
        toast.success(`Successfully uploaded ${response.data.total_uploaded} files`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
      
      if (response.data.total_failed > 0) {
        toast.warning(`${response.data.total_failed} files failed to upload`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-slate-600 font-medium mb-2">
                Drag & drop .ipynb files here, or click to select
              </p>
              <p className="text-sm text-slate-500">
                Maximum 300 files. Student names extracted from after dash (-) or filename end
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-lg font-semibold text-slate-900">
              Selected Files ({files.length})
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={clearAll}
                variant="outline"
                size="sm"
                disabled={uploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Remove All
              </Button>
              <Button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Upload Progress</span>
                <span className="text-sm font-medium text-slate-900">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* File List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file) => {
              const studentInfo = extractStudentInfo(file.name);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileIcon className="w-5 h-5 text-slate-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>→ {studentInfo.name} ({studentInfo.id})</span>
                      </div>
                    </div>
                  </div>
                  {!uploading && (
                    <Button
                      onClick={() => removeFile(file.id)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-red-600"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults && (
        <Card className="p-6">
          <h3 className="font-mono text-lg font-semibold text-slate-900 mb-4">
            Upload Results
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span>{uploadResults.total_uploaded} files uploaded successfully</span>
            </div>
            {uploadResults.total_failed > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircleIcon className="w-5 h-5" />
                <span>{uploadResults.total_failed} files failed</span>
              </div>
            )}
          </div>

          {/* Failed Files */}
          {uploadResults.failed_files && uploadResults.failed_files.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4" />
                Failed Files
              </h4>
              <div className="space-y-2">
                {uploadResults.failed_files.map((failedFile, index) => (
                  <div key={index} className="p-2 bg-red-50 rounded text-sm">
                    <span className="font-medium">{failedFile.filename}:</span>{' '}
                    <span className="text-red-600">{failedFile.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default BulkUpload;