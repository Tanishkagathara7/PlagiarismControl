import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { UploadIcon, FileIcon, TrashIcon, ArrowLeftIcon, CheckCircleIcon } from 'lucide-react';

function Upload() {
  const [files, setFiles] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      toast.error('Failed to load files');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const ipynbFiles = acceptedFiles.filter((file) => file.name.endsWith('.ipynb'));
    if (ipynbFiles.length === 0) {
      toast.error('Only .ipynb files are allowed');
      return;
    }
    setSelectedFile(ipynbFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/x-ipynb+json': ['.ipynb'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile || !studentName || !studentId) {
      toast.error('Please fill all fields and select a file');
      return;
    }

    if (files.length >= 100) {
      toast.error('Maximum file limit (100) reached');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('student_name', studentName);
      formData.append('student_id', studentId);

      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('File uploaded successfully');
      setSelectedFile(null);
      setStudentName('');
      setStudentId('');
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await api.delete(`/files/${fileId}`);
      toast.success('File deleted');
      await loadFiles();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="upload-page">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="page-title">
            Upload Files
          </h1>
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-slate-600 hover:text-indigo-900"
            data-testid="back-button"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5">
            <Card className="p-6 bg-white border border-slate-200" data-testid="upload-form-card">
              <h2 className="font-mono font-medium text-xl text-slate-900 mb-6" data-testid="upload-form-title">
                Upload Notebook
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="student-name" className="font-mono text-xs uppercase tracking-widest text-slate-500">
                    Student Name
                  </Label>
                  <Input
                    id="student-name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="mt-2 font-mono"
                    placeholder="Enter student name"
                    data-testid="student-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="student-id" className="font-mono text-xs uppercase tracking-widest text-slate-500">
                    Student ID / Roll Number
                  </Label>
                  <Input
                    id="student-id"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-2 font-mono"
                    placeholder="Enter student ID"
                    data-testid="student-id-input"
                  />
                </div>

                <div>
                  <Label className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2 block">
                    Jupyter Notebook File
                  </Label>
                  <div
                    {...getRootProps()}
                    className={`dropzone ${isDragActive ? 'active' : ''}`}
                    data-testid="dropzone"
                  >
                    <input {...getInputProps()} />
                    <UploadIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2" data-testid="selected-file-display">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        <p className="font-sans text-sm text-slate-900">{selectedFile.name}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-sans text-base text-slate-600 mb-1">
                          Drag & drop .ipynb file here
                        </p>
                        <p className="font-sans text-sm text-slate-400">or click to browse</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !studentName || !studentId}
                  className="w-full bg-indigo-900 text-white hover:bg-indigo-800 font-mono text-sm uppercase tracking-wider button-shadow disabled:opacity-50"
                  data-testid="upload-button"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </Card>
          </div>

          <div className="md:col-span-7">
            <Card className="p-6 bg-white border border-slate-200" data-testid="files-list-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono font-medium text-xl text-slate-900" data-testid="files-list-title">
                  Uploaded Files ({files.length}/100)
                </h2>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-state">
                  <FileIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="font-sans text-base text-slate-600">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto" data-testid="files-list">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <FileIcon className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="font-mono text-sm font-medium text-slate-900" data-testid={`file-name-${file.id}`}>
                            {file.filename}
                          </p>
                          <p className="font-sans text-xs text-slate-600" data-testid={`file-meta-${file.id}`}>
                            {file.student_name} ({file.student_id})
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDelete(file.id)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        data-testid={`delete-button-${file.id}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Upload;
