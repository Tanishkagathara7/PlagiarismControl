import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { FileIcon, UploadIcon, BarChart3Icon, LogOutIcon, SettingsIcon } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({ totalFiles: 0, lastAnalysis: null, maxFiles: 300 });
  const [defaultThreshold, setDefaultThreshold] = useState(50);
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  useEffect(() => {
    loadStats();
    loadDefaultThreshold();
  }, []);

  const loadDefaultThreshold = () => {
    const savedThreshold = localStorage.getItem('defaultAnalysisThreshold');
    if (savedThreshold) {
      setDefaultThreshold(parseInt(savedThreshold));
    }
  };

  const loadStats = async () => {
    try {
      const [filesRes, resultsRes, countRes] = await Promise.all([
        api.get('/files'),
        api.get('/results/latest'),
        api.get('/files/count'),
      ]);

      setStats({
        totalFiles: filesRes.data.length,
        lastAnalysis: resultsRes.data,
        maxFiles: countRes.data.max,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to default values
      setStats(prev => ({
        ...prev,
        maxFiles: 300,
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="dashboard-title">
            PlagiarismControl
          </h1>
          <div className="flex items-center gap-4">
            <span className="font-sans text-sm text-slate-600" data-testid="username-display">
              {username}
            </span>
            <Button
              onClick={() => navigate('/settings')}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
              data-testid="settings-button"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-indigo-900"
              data-testid="logout-button"
            >
              <LogOutIcon className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="font-mono font-medium text-3xl text-slate-900 mb-2" data-testid="welcome-heading">
            Control Center
          </h2>
          <p className="font-sans text-base text-slate-600" data-testid="dashboard-description">
            Jupyter Notebook plagiarism detection and analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card className="flex flex-col justify-between h-32 border-l-4 border-indigo-900 bg-slate-50 p-4 stat-card" data-testid="stat-total-files">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Total Files</div>
            <div className="font-mono text-3xl font-semibold text-slate-900">{stats.totalFiles}</div>
          </Card>

          <Card className="flex flex-col justify-between h-32 border-l-4 border-blue-500 bg-slate-50 p-4 stat-card" data-testid="stat-file-limit">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Limit</div>
            <div className="font-mono text-3xl font-semibold text-slate-900">{stats.maxFiles}</div>
          </Card>

          <Card className="flex flex-col justify-between h-32 border-l-4 border-emerald-600 bg-slate-50 p-4 stat-card" data-testid="stat-last-analysis">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Last Analysis</div>
            <div className="font-sans text-sm text-slate-700">
              {stats.lastAnalysis?.total_matches !== undefined
                ? `${stats.lastAnalysis.total_matches} matches`
                : 'No analysis yet'}
            </div>
          </Card>

          <Card className="flex flex-col justify-between h-32 border-l-4 border-amber-600 bg-slate-50 p-4 stat-card" data-testid="stat-threshold">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Default Threshold</div>
            <div className="font-mono text-3xl font-semibold text-slate-900">{defaultThreshold}%</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-slate-200 hover:shadow-md transition-shadow" data-testid="action-card-upload">
            <div className="flex items-center justify-center w-16 h-16 bg-indigo-900 rounded-lg mb-4">
              <UploadIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-mono font-medium text-xl text-slate-900 mb-2">Upload Files</h3>
            <p className="font-sans text-sm text-slate-600 mb-6">
              Upload Jupyter Notebook files (.ipynb) for analysis
            </p>
            <Button
              onClick={() => navigate('/upload')}
              className="w-full bg-indigo-900 text-white hover:bg-indigo-800 font-mono text-sm uppercase tracking-wider button-shadow"
              data-testid="navigate-upload-button"
            >
              Go to Upload
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 hover:shadow-md transition-shadow" data-testid="action-card-analyze">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-lg mb-4">
              <BarChart3Icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-mono font-medium text-xl text-slate-900 mb-2">Run Analysis</h3>
            <p className="font-sans text-sm text-slate-600 mb-6">
              Analyze uploaded files for code plagiarism
            </p>
            <Button
              onClick={() => navigate('/analysis')}
              disabled={stats.totalFiles < 2}
              className="w-full bg-blue-500 text-white hover:bg-blue-600 font-mono text-sm uppercase tracking-wider button-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="navigate-analysis-button"
            >
              Start Analysis
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-slate-200 hover:shadow-md transition-shadow" data-testid="action-card-results">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-lg mb-4">
              <FileIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-mono font-medium text-xl text-slate-900 mb-2">View Results</h3>
            <p className="font-sans text-sm text-slate-600 mb-6">
              Review plagiarism detection results and reports
            </p>
            <Button
              onClick={() => navigate('/results')}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-mono text-sm uppercase tracking-wider button-shadow"
              data-testid="navigate-results-button"
            >
              View Results
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
