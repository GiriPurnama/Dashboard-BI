
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { generateSqlFromNaturalLanguage, analyzeDataInsight } from '../../services/geminiService';
import { generateSalesData } from '../../constants';
import { WidgetDataPoint } from '../../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { Modal } from '../ui/Modal';
import { SqlEditor } from './SqlEditor';

interface QueryBuilderProps {
  workspaceId: string;
  onSaveQuery: (name: string, sql: string) => void;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ workspaceId, onSaveQuery }) => {
  const { dataSources, saveQuery } = useWorkspace();
  const [naturalQuery, setNaturalQuery] = useState('');
  const [sql, setSql] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultData, setResultData] = useState<WidgetDataPoint[] | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [queryName, setQueryName] = useState('');

  // Get sources specific to this workspace
  const workspaceSources = dataSources.filter(ds => ds.workspaceId === workspaceId);
  const activeSource = workspaceSources[0];

  const handleAskAI = async () => {
    if (!naturalQuery) return;
    setIsGenerating(true);
    // Simulate schema context based on typical BI data
    const schema = "Tables: sales (id, date, amount, region, category), users (id, name, signup_date), inventory (id, product_name, stock_level)";
    const generatedSql = await generateSqlFromNaturalLanguage(naturalQuery, schema);
    setSql(generatedSql);
    setIsGenerating(false);
  };

  const handleRunQuery = async () => {
    if (!activeSource) return;
    setLoadingResults(true);
    setInsight(null);
    // Mock execution delay
    setTimeout(async () => {
      // Return random mock data for demo purposes since we don't have a real DB
      const mockResult = generateSalesData(); 
      setResultData(mockResult);
      setLoadingResults(false);
    }, 800);
  };

  const handleAnalyzeResults = async () => {
    if (!resultData) return;
    setIsAnalyzing(true);
    const aiInsight = await analyzeDataInsight(resultData);
    setInsight(aiInsight);
    setIsAnalyzing(false);
  };

  const handleSave = () => {
      if (queryName && sql) {
          saveQuery(workspaceId, queryName, sql);
          setIsSaveModalOpen(false);
          setQueryName('');
          // Optionally notify parent or show toast
      }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-6">
       {/* Context Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <span className="text-xl">🗄️</span>
            <div>
                <p className="text-xs font-bold text-blue-800 uppercase">Current Workspace Context</p>
                <p className="text-sm text-blue-900">
                    {activeSource 
                        ? `Connected to: ${activeSource.name} (${activeSource.type})` 
                        : "No Data Source connected to this workspace."}
                </p>
            </div>
         </div>
         {!activeSource && <Button size="sm">Connect Data</Button>}
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Ask AI to write query</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                placeholder="e.g. Show monthly revenue for 2024..."
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                disabled={!activeSource}
              />
              <Button onClick={handleAskAI} isLoading={isGenerating} size="sm" variant="secondary" disabled={!activeSource}>
                ✨ Generate
              </Button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 mb-2">SQL Editor</label>
            
            <div className="flex-1 border border-slate-300 rounded-md overflow-hidden">
                <SqlEditor value={sql} onChange={setSql} />
            </div>

            <div className="flex justify-between mt-4">
               <Button onClick={() => setIsSaveModalOpen(true)} variant="secondary" size="sm" disabled={!activeSource || !sql}>Save Query</Button>
               <Button onClick={handleRunQuery} isLoading={loadingResults} disabled={!activeSource}>Run Query</Button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-700">Results Preview</h3>
                {resultData && !insight && (
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        className="text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        onClick={handleAnalyzeResults}
                        isLoading={isAnalyzing}
                    >
                        ✨ Analyze with AI
                    </Button>
                )}
            </div>
            {resultData && <span className="text-xs text-slate-500">{resultData.length} rows returned</span>}
          </div>
          
          <div className="flex-1 overflow-auto p-0">
            {loadingResults ? (
              <div className="flex items-center justify-center h-full text-slate-400">Running query...</div>
            ) : resultData ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                  <tr>
                    {Object.keys(resultData[0] || {}).map(key => (
                      <th key={key} className="px-6 py-3 font-medium border-b border-slate-200">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultData.map((row, idx) => (
                    <tr key={idx} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                      {Object.values(row).map((val, vIdx) => (
                        <td key={vIdx} className="px-6 py-3 text-slate-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                {activeSource ? "Run a query to see results" : "Connect a data source first"}
              </div>
            )}
          </div>

          {insight && (
            <div className="p-4 bg-brand-50 border-t border-brand-100 relative animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="bg-white p-1.5 rounded-full shadow-sm text-brand-600 mt-0.5">
                  <span className="text-lg">🤖</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-brand-900">Executive Summary</h4>
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={handleAnalyzeResults}
                              disabled={isAnalyzing}
                              className="text-xs flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-brand-200 text-brand-700 font-medium hover:bg-brand-50 hover:border-brand-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                              title="Regenerate analysis"
                          >
                              <svg className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-brand-500' : 'text-brand-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                              {isAnalyzing ? 'Thinking...' : 'Regenerate'}
                          </button>
                          <button onClick={() => setInsight(null)} className="text-brand-400 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                      </div>
                  </div>
                  <p className={`text-sm text-brand-800 mt-2 leading-relaxed ${isAnalyzing ? 'opacity-60 blur-[0.5px] transition-all' : 'transition-all'}`}>
                    {insight}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Query Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Query">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Query Name</label>
                  <input 
                      type="text" 
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="e.g. Q3 Sales Analysis"
                      value={queryName}
                      onChange={e => setQueryName(e.target.value)}
                  />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!queryName}>Save</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
