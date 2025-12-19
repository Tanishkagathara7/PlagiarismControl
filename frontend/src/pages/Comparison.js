import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeftIcon } from 'lucide-react';

function Comparison() {
  const { fileAId, fileBId } = useParams();
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadComparison();
  }, [fileAId, fileBId]);

  const loadComparison = async () => {
    try {
      const response = await api.post('/compare', {
        fileA_id: fileAId,
        fileB_id: fileBId,
      });
      setComparisonData(response.data);
    } catch (error) {
      toast.error('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900 mx-auto mb-4"></div>
          <p className="font-sans text-sm text-slate-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="error-state">
        <Card className="p-8 text-center">
          <p className="font-sans text-base text-slate-600">Failed to load comparison data</p>
          <Button onClick={() => navigate('/results')} className="mt-4">
            Back to Results
          </Button>
        </Card>
      </div>
    );
  }

  const codeA = comparisonData.fileA.code.split('\n');
  const codeB = comparisonData.fileB.code.split('\n');

  return (
    <div className="min-h-screen bg-slate-50" data-testid="comparison-page">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="page-title">
            Code Comparison
          </h1>
          <Button
            onClick={() => navigate('/results')}
            variant="ghost"
            className="text-slate-600 hover:text-indigo-900"
            data-testid="back-button"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-white border border-slate-200" data-testid="student-a-card">
            <h2 className="font-mono font-medium text-lg text-slate-900 mb-2" data-testid="student-a-name">
              {comparisonData.fileA.student_name}
            </h2>
            <p className="font-sans text-sm text-slate-600" data-testid="student-a-id">
              ID: {comparisonData.fileA.student_id}
            </p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200" data-testid="student-b-card">
            <h2 className="font-mono font-medium text-lg text-slate-900 mb-2" data-testid="student-b-name">
              {comparisonData.fileB.student_name}
            </h2>
            <p className="font-sans text-sm text-slate-600" data-testid="student-b-id">
              ID: {comparisonData.fileB.student_id}
            </p>
          </Card>
        </div>

        <Card className="p-6 bg-white border border-slate-200" data-testid="code-comparison-card">
          <h2 className="font-mono font-medium text-xl text-slate-900 mb-6" data-testid="comparison-title">
            Side-by-Side Code Comparison
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-testid="code-a-section">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-600">
                  {comparisonData.fileA.student_name}
                </span>
              </div>
              <div className="border border-slate-200 bg-white overflow-x-auto max-h-[600px] overflow-y-auto">
                {codeA.map((line, index) => (
                  <div key={index} className="diff-line" data-testid={`code-a-line-${index}`}>
                    <span className="diff-line-number">{index + 1}</span>
                    <span>{line || ' '}</span>
                  </div>
                ))}
              </div>
            </div>

            <div data-testid="code-b-section">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-600">
                  {comparisonData.fileB.student_name}
                </span>
              </div>
              <div className="border border-slate-200 bg-white overflow-x-auto max-h-[600px] overflow-y-auto">
                {codeB.map((line, index) => (
                  <div key={index} className="diff-line" data-testid={`code-b-line-${index}`}>
                    <span className="diff-line-number">{index + 1}</span>
                    <span>{line || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default Comparison;
