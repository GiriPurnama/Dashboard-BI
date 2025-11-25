
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { WorkspaceProvider, useWorkspace } from './components/context/WorkspaceContext';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { DashboardGrid } from './components/dashboard/DashboardGrid';
import { QueryBuilder } from './components/query/QueryBuilder';
import { UserManagement } from './components/admin/UserManagement';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { INITIAL_DATA_SOURCES } from './constants';
import { CronInterval, DataSource, DataSourceSchedule } from './types';

// --- Login Screen ---
const LoginScreen = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials. Try admin@insightflow.com / password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-2">Sign in to InsightFlow BI</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
              placeholder="admin@insightflow.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
              placeholder="password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" size="lg" isLoading={loading}>Sign In</Button>
        </form>
      </div>
    </div>
  );
};

// --- Main Layout ---
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { 
    workspaces, dashboards, dataSources, 
    addWorkspace, addDashboard, updateDashboard, 
    updateDataSourceSchedule, triggerDataSourceRefresh 
  } = useWorkspace();
  
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [activePageId, setActivePageId] = useState<string>('');
  const [view, setView] = useState<'dashboard' | 'query' | 'sources' | 'users' | 'logs'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals
  const [isAddWsOpen, setIsAddWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [tempSchedule, setTempSchedule] = useState<DataSourceSchedule>({ type: 'MANUAL' });


  // Initialize defaults
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
        const wsDashboards = dashboards.filter(d => d.workspaceId === activeWorkspaceId);
        if (wsDashboards.length > 0) {
            // Keep current page if valid, else switch to first
            if (!wsDashboards.find(d => d.id === activePageId)) {
                setActivePageId(wsDashboards[0].id);
            }
        } else {
            setActivePageId('');
        }
        // Reset view to dashboard when workspace changes
        setView('dashboard');
    }
  }, [activeWorkspaceId, dashboards]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const workspaceDashboards = dashboards.filter(d => d.workspaceId === activeWorkspaceId);
  const activeDashboard = dashboards.find(d => d.id === activePageId);

  // Filter Data Sources strictly by activeWorkspaceId
  const workspaceDataSources = dataSources.filter(ds => ds.workspaceId === activeWorkspaceId);

  const handleCreateWorkspace = () => {
      if (newWsName) {
          addWorkspace(newWsName, 'New Workspace');
          setNewWsName('');
          setIsAddWsOpen(false);
      }
  };

  const handleCreatePage = () => {
      if (newPageName && activeWorkspaceId) {
          addDashboard(activeWorkspaceId, newPageName);
          setNewPageName('');
          setIsAddPageOpen(false);
      }
  };

  const openScheduleModal = (ds: DataSource) => {
      setEditingSourceId(ds.id);
      setTempSchedule(ds.schedule || { type: 'MANUAL' });
      setScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
      if (editingSourceId) {
          updateDataSourceSchedule(editingSourceId, tempSchedule);
      }
      setScheduleModalOpen(false);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white font-bold">IF</div>
             <span className="text-white font-bold text-lg">InsightFlow</span>
          </div>
          {/* Close button only visible on mobile inside sidebar */}
          <button className="md:hidden text-slate-400" onClick={() => setIsMobileMenuOpen(false)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workspace</label>
                <button onClick={() => setIsAddWsOpen(true)} className="text-xs text-brand-400 hover:text-brand-300 font-bold">+ ADD</button>
            </div>
            <select 
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              className="mt-1 w-full bg-slate-800 border-none text-white rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-brand-500"
            >
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-6">
             <div className="flex justify-between items-center mb-2 px-2">
                 <span className="text-xs font-semibold text-slate-500 uppercase">PAGES</span>
                 <button onClick={() => setIsAddPageOpen(true)} className="text-slate-500 hover:text-white" title="Add Page">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                 </button>
             </div>
             <div className="space-y-1">
                 {workspaceDashboards.length === 0 && <div className="px-2 text-xs text-slate-600 italic">No pages yet</div>}
                 {workspaceDashboards.map(db => (
                     <button
                        key={db.id}
                        onClick={() => { setView('dashboard'); setActivePageId(db.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center px-3 py-2 rounded-md transition-colors text-sm ${activePageId === db.id && view === 'dashboard' ? 'bg-brand-900/50 text-white border border-brand-700' : 'hover:bg-slate-800'}`}
                     >
                        <span className="truncate">{db.name}</span>
                     </button>
                 ))}
             </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <span className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2 block">TOOLS</span>
            <button 
                onClick={() => { setView('query'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${view === 'query' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                Query Builder
            </button>
            <button 
                onClick={() => { setView('sources'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${view === 'sources' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                Data Sources
            </button>
          </div>

           <div className="border-t border-slate-800 pt-4">
             <span className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2 block">ADMIN</span>
             <button 
                 onClick={() => { setView('users'); setIsMobileMenuOpen(false); }}
                 className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${view === 'users' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
             >
                 <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                 User Management
             </button>
             <button 
                 onClick={() => { setView('logs'); setIsMobileMenuOpen(false); }}
                 className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${view === 'logs' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
             >
                 <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 Audit Logs
             </button>
           </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <button onClick={logout} className="text-xs text-slate-400 hover:text-white">Sign Out</button>
            </div>
          </div>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-slate-300 shadow-xl animate-in slide-in-from-left duration-200">
                <SidebarContent />
            </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Toggle */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white font-bold">IF</div>
             <span className="text-white font-bold text-lg">InsightFlow</span>
            </div>
            <button onClick={toggleMobileMenu} className="p-1 rounded hover:bg-slate-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
        </div>

        {view === 'sources' && (
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Data Sources</h2>
                    <p className="text-sm text-slate-500">Workspace: {activeWorkspace?.name}</p>
                </div>
                <Button size="sm">+ New Source</Button>
            </header>
        )}

        <main className="flex-1 overflow-auto">
          {view === 'dashboard' ? (
             activeDashboard ? (
                <DashboardGrid 
                    dashboard={activeDashboard} 
                    onUpdateDashboard={updateDashboard}
                />
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                     <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
                     <p>Select a page from the sidebar or create a new one.</p>
                     <Button variant="secondary" className="mt-4" onClick={() => setIsAddPageOpen(true)}>Create Page</Button>
                 </div>
             )
          ) : view === 'query' ? (
            <QueryBuilder workspaceId={activeWorkspaceId} onSaveQuery={() => {}} />
          ) : view === 'users' ? (
            <UserManagement />
          ) : view === 'logs' ? (
             <AuditLogViewer />
          ) : (
            <div className="p-8">
              {workspaceDataSources.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {workspaceDataSources.map(ds => (
                    <div key={ds.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${ds.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 truncate">{ds.name}</h3>
                                    <p className="text-xs text-slate-500">{ds.type} • ID: {ds.id}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ds.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {ds.status}
                            </span>
                        </div>

                        <div className="flex-1 bg-slate-50 rounded-lg p-3 text-sm border border-slate-100 mb-4 space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Schedule:</span>
                                <span className="font-medium text-slate-700 flex items-center">
                                    {ds.schedule.type === 'AUTO' ? (
                                        <>
                                            <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse"></span>
                                            Auto ({ds.schedule.interval})
                                        </>
                                    ) : (
                                        <span className="text-slate-500">Manual</span>
                                    )}
                                </span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-500">Last Sync:</span>
                                <span className="text-xs text-slate-600">{ds.schedule.lastSyncedAt ? new Date(ds.schedule.lastSyncedAt).toLocaleTimeString() : 'Never'}</span>
                             </div>
                             {ds.schedule.type === 'AUTO' && (
                                 <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Next Run:</span>
                                    <span className="text-xs text-slate-600">{ds.schedule.nextSyncAt ? new Date(ds.schedule.nextSyncAt).toLocaleTimeString() : '-'}</span>
                                 </div>
                             )}
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => openScheduleModal(ds)}
                            >
                                ⚙️ Schedule
                            </Button>
                            <Button 
                                size="sm" 
                                className="flex-1" 
                                onClick={() => triggerDataSourceRefresh(ds.id)}
                                isLoading={ds.schedule.isSyncing}
                            >
                                🔄 Refresh
                            </Button>
                        </div>
                    </div>
                    ))}
                </div>
              ) : (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="mb-2">No data sources connected to this workspace.</p>
                      <Button size="sm" onClick={() => {}}>Connect Source</Button>
                  </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Workspace Modal */}
      <Modal 
        isOpen={isAddWsOpen} 
        onClose={() => setIsAddWsOpen(false)} 
        title="Create New Workspace"
        footer={<Button onClick={handleCreateWorkspace}>Create Workspace</Button>}
      >
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
                <input 
                    type="text" 
                    className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                    placeholder="e.g. Sales Dept, Client X"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                />
            </div>
        </div>
      </Modal>

      {/* Add Page Modal */}
      <Modal 
        isOpen={isAddPageOpen} 
        onClose={() => setIsAddPageOpen(false)} 
        title="Create New Page"
        footer={<Button onClick={handleCreatePage}>Create Page</Button>}
      >
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page Name</label>
                <input 
                    type="text" 
                    className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                    placeholder="e.g. Monthly Overview"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                />
            </div>
            <p className="text-sm text-slate-500">This page will be added to <strong>{activeWorkspace?.name}</strong>.</p>
        </div>
      </Modal>

      {/* Data Source Schedule Modal */}
      <Modal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          title="Configure Refresh Schedule"
          footer={<Button onClick={handleSaveSchedule}>Save Schedule</Button>}
      >
          <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Refresh Type</label>
                  <div className="flex gap-4">
                      <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-all ${tempSchedule.type === 'MANUAL' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name="scheduleType" 
                            value="MANUAL" 
                            checked={tempSchedule.type === 'MANUAL'}
                            onChange={() => setTempSchedule({ ...tempSchedule, type: 'MANUAL' })}
                            className="sr-only"
                          />
                          <div className="font-bold text-slate-800 mb-1">Manual Only</div>
                          <div className="text-xs text-slate-500">Data updates only when you click Refresh.</div>
                      </label>
                      <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-all ${tempSchedule.type === 'AUTO' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name="scheduleType" 
                            value="AUTO" 
                            checked={tempSchedule.type === 'AUTO'}
                            onChange={() => setTempSchedule({ ...tempSchedule, type: 'AUTO', interval: tempSchedule.interval || '1h' })}
                            className="sr-only"
                          />
                          <div className="font-bold text-slate-800 mb-1">Automatic</div>
                          <div className="text-xs text-slate-500">Scheduled cron jobs update data automatically.</div>
                      </label>
                  </div>
              </div>

              {tempSchedule.type === 'AUTO' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Update Interval</label>
                      <select 
                          className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 p-2.5 bg-white"
                          value={tempSchedule.interval}
                          onChange={(e) => setTempSchedule({ ...tempSchedule, interval: e.target.value as CronInterval })}
                      >
                          <option value="15m">Every 15 Minutes</option>
                          <option value="30m">Every 30 Minutes</option>
                          <option value="1h">Every Hour</option>
                          <option value="midnight">Every Midnight (00:00)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                          Next run will be calculated based on this interval from the current time.
                      </p>
                  </div>
              )}
          </div>
      </Modal>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/" element={
                <ProtectedRoute>
                    <DashboardLayout />
                </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </HashRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default App;
