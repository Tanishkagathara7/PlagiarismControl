import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import BulkUpload from '../components/BulkUpload';
import { FileIcon, TrashIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';

function Upload() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
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

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${files.length} files? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete('/files');
      toast.success(`Successfully deleted ${response.data.total_records_deleted} files`);
      await loadFiles();
    } catch (error) {
      toast.error('Failed to delete all files');
      await loadFiles(); // Refresh to show current state
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    loadFiles();
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="upload-page">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="page-title">
            Bulk Upload Files
          </h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={loadFiles}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="font-mono font-medium text-3xl text-slate-900 mb-2">
            Upload Jupyter Notebooks
          </h2>
          <p className="font-sans text-base text-slate-600">
            Upload multiple .ipynb files at once. Student names will be automatically extracted from filenames.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bulk Upload Section */}
          <div className="lg:col-span-2">
            <BulkUpload onUploadComplete={handleUploadComplete} />
          </div>

          {/* Current Files Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white border border-slate-200" data-testid="files-list-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono font-medium text-xl text-slate-900" data-testid="files-list-title">
                  Current Files
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {files.length}/300
                  </span>
                  {files.length > 0 && (
                    <Button
                      onClick={handleDeleteAll}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      disabled={loading}
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete All
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <RefreshCwIcon className="w-8 h-8 mx-auto text-slate-400 animate-spin mb-2" />
                  <p className="text-sm text-slate-500">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-state">
                  <FileIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="font-sans text-base text-slate-600">No files uploaded yet</p>
                  <p className="font-sans text-sm text-slate-500 mt-2">
                    Use the bulk upload to add multiple files
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto" data-testid="files-list">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-medium text-slate-900 truncate" data-testid={`file-name-${file.id}`}>
                            {file.filename}
                          </p>
                          <p className="font-sans text-xs text-slate-600 truncate" data-testid={`file-meta-${file.id}`}>
                            {file.student_name}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            ID: {file.student_id}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDelete(file.id)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-shrink-0"
                        data-testid={`delete-button-${file.id}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total Files:</span>
                    <span className="font-medium text-slate-900">{files.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-slate-600">Remaining Slots:</span>
                    <span className="font-medium text-slate-900">{300 - files.length}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* File Naming Guidelines */}
            <Card className="p-4 bg-blue-50 border border-blue-200 mt-4">
              <h4 className="font-mono text-sm font-semibold text-blue-900 mb-2">
                File Naming Guidelines
              </h4>
              <div className="space-y-2 text-xs text-blue-800">
                <div>
                  <span className="font-medium">Format 1:</span> Python_(Lab_05) - Ashish Vadher.ipynb
                </div>
                <div>
                  <span className="font-medium">Format 2:</span> Assignment1 - John Doe.ipynb
                </div>
                <div>
                  <span className="font-medium">Format 3:</span> lab7_firstname_lastname.ipynb
                </div>
                <div className="text-blue-600 mt-2">
                  ✅ Student names are extracted from after dash (-) or at the end of filename
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Upload;