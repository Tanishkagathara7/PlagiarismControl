import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { ArrowLeftIcon, FileTextIcon, DownloadIcon, AlertTriangleIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Results() {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [filterThreshold, setFilterThreshold] = useState(40);
  const [analysisData, setAnalysisData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      const filtered = results.filter((r) => r.similarity >= filterThreshold);
      setFilteredResults(filtered);
    }
  }, [results, filterThreshold]);

  const loadResults = async () => {
    try {
      const response = await api.get('/results/latest');
      setAnalysisData(response.data);
      setResults(response.data.results || []);
    } catch (error) {
      toast.error('Failed to load results');
    }
  };

  const getSimilarityColor = (similarity) => {
    if (similarity >= 70) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (similarity >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getSimilarityBadge = (similarity) => {
    if (similarity >= 70) return 'High';
    if (similarity >= 40) return 'Medium';
    return 'Low';
  };

  const handleViewComparison = (result) => {
    navigate(`/comparison/${result.fileA_id}/${result.fileB_id}`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Plagiarism Detection Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Files Analyzed: ${analysisData?.total_files || 0}`, 14, 36);
    doc.text(`Total Matches Found: ${analysisData?.total_matches || 0}`, 14, 42);
    doc.text(`Threshold: ${(analysisData?.threshold * 100).toFixed(0)}%`, 14, 48);
    
    const tableData = filteredResults.map((r) => [
      `${r.studentA}\n(${r.studentA_id})`,
      `${r.studentB}\n(${r.studentB_id})`,
      `${r.similarity.toFixed(2)}%`,
      getSimilarityBadge(r.similarity),
      r.total_matches.toString(),
    ]);
    
    doc.autoTable({
      startY: 55,
      head: [['Student A', 'Student B', 'Similarity', 'Risk', 'Matches']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [49, 46, 129] },
    });
    
    doc.save('plagiarism-report.pdf');
    toast.success('PDF downloaded');
  };

  const groupBySimilarCode = () => {
    const groups = {};
    
    filteredResults.forEach((result) => {
      const key = result.matching_lines[0]?.code || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({
        studentA: result.studentA,
        studentB: result.studentB,
        similarity: result.similarity,
      });
    });
    
    return Object.entries(groups)
      .filter(([_, students]) => students.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);
  };

  const similarCodeGroups = groupBySimilarCode();

  return (
    <div className="min-h-screen bg-slate-50" data-testid="results-page">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-mono font-semibold text-2xl text-slate-900" data-testid="page-title">
            Analysis Results
          </h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={downloadPDF}
              disabled={filteredResults.length === 0}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-mono text-sm uppercase tracking-wider button-shadow"
              data-testid="download-pdf-button"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-slate-600 hover:text-indigo-900"
              data-testid="back-button"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="flex flex-col justify-between h-24 border-l-4 border-indigo-900 bg-slate-50 p-4" data-testid="stat-total-files">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Files Analyzed</div>
            <div className="font-mono text-2xl font-semibold text-slate-900">{analysisData?.total_files || 0}</div>
          </Card>

          <Card className="flex flex-col justify-between h-24 border-l-4 border-rose-600 bg-slate-50 p-4" data-testid="stat-total-matches">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Total Matches</div>
            <div className="font-mono text-2xl font-semibold text-slate-900">{results.length}</div>
          </Card>

          <Card className="flex flex-col justify-between h-24 border-l-4 border-amber-600 bg-slate-50 p-4" data-testid="stat-filtered-matches">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Filtered Matches</div>
            <div className="font-mono text-2xl font-semibold text-slate-900">{filteredResults.length}</div>
          </Card>

          <Card className="flex flex-col justify-between h-24 border-l-4 border-emerald-600 bg-slate-50 p-4" data-testid="stat-threshold">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Filter Threshold</div>
            <div className="font-mono text-2xl font-semibold text-slate-900">{filterThreshold}%</div>
          </Card>
        </div>

        {similarCodeGroups.length > 0 && (
          <Card className="p-6 bg-white border border-slate-200 mb-8" data-testid="code-groups-card">
            <h2 className="font-mono font-medium text-xl text-slate-900 mb-4" data-testid="code-groups-title">
              Common Code Groups
            </h2>
            <p className="font-sans text-sm text-slate-600 mb-6">
              Students who share similar code blocks
            </p>
            <div className="space-y-4">
              {similarCodeGroups.map(([code, students], index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-200" data-testid={`code-group-${index}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600" />
                    <span className="font-mono text-sm font-medium text-slate-900">
                      {students.length} students with similar code
                    </span>
                  </div>
                  <div className="font-code text-xs bg-white p-3 border border-slate-200 mb-3 overflow-x-auto">
                    {code.substring(0, 100)}...
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {students.map((s, i) => (
                      <span key={i} className="font-sans text-xs px-2 py-1 bg-white border border-slate-200 text-slate-700">
                        {s.studentA} ↔ {s.studentB} ({s.similarity.toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 bg-white border border-slate-200 mb-8" data-testid="filter-card">
          <div className="flex items-center justify-between mb-4">
            <label className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Filter by Similarity
            </label>
            <span className="font-mono text-sm font-medium text-slate-900" data-testid="filter-threshold-value">
              {filterThreshold}%+
            </span>
          </div>
          <Slider
            value={[filterThreshold]}
            onValueChange={(value) => setFilterThreshold(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
            data-testid="filter-threshold-slider"
          />
          <div className="flex justify-between mt-2">
            <span className="font-sans text-xs text-slate-500">0%</span>
            <span className="font-sans text-xs text-slate-500">50%</span>
            <span className="font-sans text-xs text-slate-500">100%</span>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-200" data-testid="results-table-card">
          <h2 className="font-mono font-medium text-xl text-slate-900 mb-6" data-testid="results-table-title">
            Plagiarism Matches
          </h2>

          {filteredResults.length === 0 ? (
            <div className="text-center py-12" data-testid="no-results">
              <FileTextIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="font-sans text-base text-slate-600">
                {results.length === 0 ? 'No analysis results available' : 'No matches found at this threshold'}
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="results-list">
              {filteredResults.map((result, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 hover:border-indigo-900 transition-colors cursor-pointer"
                  onClick={() => handleViewComparison(result)}
                  data-testid={`result-item-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {result.studentA} ({result.studentA_id})
                        </span>
                        <span className="text-slate-400">↔</span>
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {result.studentB} ({result.studentB_id})
                        </span>
                      </div>
                      <p className="font-sans text-xs text-slate-600">
                        {result.total_matches} matching code blocks found
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 border font-mono text-xs uppercase tracking-wider ${getSimilarityColor(
                          result.similarity
                        )}`}
                        data-testid={`similarity-badge-${index}`}
                      >
                        {result.similarity.toFixed(2)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-900 hover:bg-indigo-50"
                        data-testid={`view-comparison-button-${index}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

export default Results;
