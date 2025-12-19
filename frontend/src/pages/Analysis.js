import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Progress } from '../components/ui/progress';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon } from 'lucide-react';

function Analysis() {
  const [threshold, setThreshold] = useState(50);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadFiles();
    loadDefaultThreshold();
  }, []);

  const loadDefaultThreshold = () => {
    const savedThreshold = localStorage.getItem('defaultAnalysisThreshold');
    if (savedThreshold) {
      setThreshold(parseInt(savedThreshold));
    }
  };

  const loadFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      toast.error('Failed to load files');
    }
  };

  const handleAnalyze = async () => {
    if (files.length < 2) {
      toast.error('At least 2 files are required for analysis');
      return;
    }

    if (files.length > 100) {
      toast.warning('Large number of files detected. Analysis may take longer.');
    }

    setAnalyzing(true);
    setProgress(0);

    // More realistic progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 5;
        if (prev < 60) return prev + 3;
        if (prev < 85) return prev + 2;
        return Math.min(prev + 1, 90);
      });
    }, 800);

    try {
      const startTime = Date.now();
      await api.post('/analyze', { threshold: threshold / 100 });

      clearInterval(progressInterval);
      setProgress(100);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.success(`Analysis completed in ${duration}s`);
      
      setTimeout(() => {
        navigate('/results');
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      
      const errorMessage = error.response?.data?.detail || 'Analysis failed';
      
      if (errorMessage.includes('timeout')) {
        toast.error('Analysis timed out. Try reducing the number of files or threshold.');
      } else if (errorMessage.includes('At least 2 files')) {
        toast.error('Please upload at least 2 files before running analysis.');
      } else {
        toast.error(`Analysis failed: ${errorMessage}`);
      }
      
      setAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="analysis-page">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="page-title">
            Run Analysis
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Card className="p-8 bg-white border border-slate-200" data-testid="analysis-card">
          <div className="mb-8">
            <h2 className="font-mono font-medium text-2xl text-slate-900 mb-2" data-testid="analysis-title">
              Configure Analysis
            </h2>
            <p className="font-sans text-base text-slate-600" data-testid="analysis-description">
              Adjust similarity threshold and start plagiarism detection
            </p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="flex flex-col justify-between h-24 border-l-4 border-indigo-900 bg-slate-50 p-4" data-testid="stat-files">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Files Uploaded</div>
                <div className="font-mono text-2xl font-semibold text-slate-900">{files.length}</div>
              </Card>

              <Card className="flex flex-col justify-between h-24 border-l-4 border-blue-500 bg-slate-50 p-4" data-testid="stat-threshold">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Threshold</div>
                <div className="font-mono text-2xl font-semibold text-slate-900">{threshold}%</div>
              </Card>

              <Card className="flex flex-col justify-between h-24 border-l-4 border-emerald-600 bg-slate-50 p-4" data-testid="stat-comparisons">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Comparisons</div>
                <div className="font-mono text-2xl font-semibold text-slate-900">
                  {files.length > 1 ? Math.floor((files.length * (files.length - 1)) / 2) : 0}
                </div>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Similarity Threshold
                </label>
                <span className="font-mono text-sm font-medium text-slate-900" data-testid="threshold-value">
                  {threshold}%
                </span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={10}
                max={100}
                step={5}
                className="w-full"
                disabled={analyzing}
                data-testid="threshold-slider"
              />
              <div className="flex justify-between mt-2">
                <span className="font-sans text-xs text-slate-500">10%</span>
                <span className="font-sans text-xs text-slate-500">50%</span>
                <span className="font-sans text-xs text-slate-500">100%</span>
              </div>
              <p className="font-sans text-sm text-slate-600 mt-4">
                Code blocks with similarity above {threshold}% will be flagged as potential plagiarism.
              </p>
            </div>

            {analyzing && (
              <div data-testid="progress-section">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Analyzing...</span>
                  <span className="font-mono text-sm font-medium text-slate-900" data-testid="progress-value">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="w-full" data-testid="progress-bar" />
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || files.length < 2}
              className="w-full bg-indigo-900 text-white hover:bg-indigo-800 font-mono text-sm uppercase tracking-wider py-4 button-shadow disabled:opacity-50"
              data-testid="analyze-button"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>

            {files.length < 2 && (
              <p className="font-sans text-sm text-amber-600 text-center" data-testid="warning-message">
                Upload at least 2 files to start analysis
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default Analysis;
