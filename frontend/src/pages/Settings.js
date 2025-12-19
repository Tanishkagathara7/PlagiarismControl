import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { ArrowLeftIcon, SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const [defaultAnalysisThreshold, setDefaultAnalysisThreshold] = useState(50);
  const [defaultFilterThreshold, setDefaultFilterThreshold] = useState(40);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load from localStorage
    const savedAnalysisThreshold = localStorage.getItem('defaultAnalysisThreshold');
    const savedFilterThreshold = localStorage.getItem('defaultFilterThreshold');
    
    if (savedAnalysisThreshold) {
      setDefaultAnalysisThreshold(parseInt(savedAnalysisThreshold));
    }
    if (savedFilterThreshold) {
      setDefaultFilterThreshold(parseInt(savedFilterThreshold));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('defaultAnalysisThreshold', defaultAnalysisThreshold.toString());
      localStorage.setItem('defaultFilterThreshold', defaultFilterThreshold.toString());
      
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setDefaultAnalysisThreshold(50);
    setDefaultFilterThreshold(40);
    localStorage.removeItem('defaultAnalysisThreshold');
    localStorage.removeItem('defaultFilterThreshold');
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-slate-900 rounded-lg">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="font-mono text-3xl font-bold text-slate-900">
              Settings
            </h1>
            <p className="font-sans text-base text-slate-600">
              Configure default thresholds and application preferences
            </p>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-6">
          {/* Analysis Threshold Settings */}
          <Card className="p-6">
            <h2 className="font-mono text-xl font-semibold text-slate-900 mb-4">
              Default Analysis Threshold
            </h2>
            <p className="font-sans text-sm text-slate-600 mb-6">
              This threshold will be used by default when starting new plagiarism analysis.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Analysis Threshold
                </label>
                <span className="font-mono text-sm font-medium text-slate-900">
                  {defaultAnalysisThreshold}%
                </span>
              </div>
              
              <Slider
                value={[defaultAnalysisThreshold]}
                onValueChange={(value) => setDefaultAnalysisThreshold(value[0])}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-slate-500">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              
              <p className="font-sans text-sm text-slate-600">
                Code blocks with similarity above {defaultAnalysisThreshold}% will be flagged as potential plagiarism during analysis.
              </p>
            </div>
          </Card>

          {/* Filter Threshold Settings */}
          <Card className="p-6">
            <h2 className="font-mono text-xl font-semibold text-slate-900 mb-4">
              Default Filter Threshold
            </h2>
            <p className="font-sans text-sm text-slate-600 mb-6">
              This threshold will be used by default when viewing results to filter matches.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Filter Threshold
                </label>
                <span className="font-mono text-sm font-medium text-slate-900">
                  {defaultFilterThreshold}%
                </span>
              </div>
              
              <Slider
                value={[defaultFilterThreshold]}
                onValueChange={(value) => setDefaultFilterThreshold(value[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              
              <p className="font-sans text-sm text-slate-600">
                Only results with similarity above {defaultFilterThreshold}% will be shown by default in the results view.
              </p>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-slate-900 text-white hover:bg-slate-800 font-mono text-sm uppercase tracking-wider"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="font-mono text-sm uppercase tracking-wider"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;