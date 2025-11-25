
import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Workspace, Dashboard, DataSource, DataSourceSchedule, CronInterval, AuditLog, SavedQuery } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

interface WorkspaceContextType {
  workspaces: Workspace[];
  dashboards: Dashboard[];
  dataSources: DataSource[];
  savedQueries: SavedQuery[];
  logs: AuditLog[];
  addWorkspace: (name: string, desc: string) => void;
  deleteWorkspace: (id: string) => void;
  addDashboard: (workspaceId: string, name: string) => void;
  updateDashboard: (dashboard: Dashboard) => void;
  deleteDashboard: (id: string) => void;
  addDataSource: (source: DataSource) => void;
  saveQuery: (workspaceId: string, name: string, sql: string) => void;
  updateDataSourceSchedule: (id: string, schedule: DataSourceSchedule) => void;
  triggerDataSourceRefresh: (id: string) => Promise<void>;
  addLog: (action: string, details: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  // To avoid stale closures in interval
  const dataSourcesRef = useRef(dataSources);
  useEffect(() => {
      dataSourcesRef.current = dataSources;
  }, [dataSources]);

  // FETCH DATA ON MOUNT / USER CHANGE
  useEffect(() => {
      if (!user) {
          setWorkspaces([]);
          setDashboards([]);
          setDataSources([]);
          return;
      }

      const fetchData = async () => {
          // 1. Fetch Workspaces
          const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at');
          if (wsData) {
             setWorkspaces(wsData.map(w => ({ id: w.id, name: w.name, description: w.description, ownerId: w.owner_id })));
             
             // 2. Fetch Dependent Data if workspaces exist
             const { data: dbData } = await supabase.from('dashboards').select('*');
             if (dbData) setDashboards(dbData.map(d => ({ ...d, workspaceId: d.workspace_id })));

             const { data: dsData } = await supabase.from('data_sources').select('*');
             if (dsData) setDataSources(dsData.map(d => ({ ...d, workspaceId: d.workspace_id })));

             const { data: sqData } = await supabase.from('saved_queries').select('*');
             if (sqData) setSavedQueries(sqData.map(q => ({ ...q, workspaceId: q.workspace_id })));
             
             const { data: lData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
             if (lData) setLogs(lData.map(l => ({ ...l, user: user.name }))); // Simply mapping current user name for now as join is complex
          }
      };

      fetchData();
  }, [user]);

  const addLog = async (action: string, details: string) => {
    if (!user) return;
    const newLog = {
      user_id: user.id,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    
    // Optimistic Update
    const displayLog: AuditLog = {
        id: `temp-${Date.now()}`,
        timestamp: newLog.timestamp,
        user: user.name,
        action,
        details
    };
    setLogs(prev => [displayLog, ...prev]);

    await supabase.from('audit_logs').insert(newLog);
  };

  const addWorkspace = async (name: string, description: string) => {
    if (!user) return;
    const { data, error } = await supabase
        .from('workspaces')
        .insert({ owner_id: user.id, name, description })
        .select()
        .single();

    if (data) {
        const newWs: Workspace = { id: data.id, name: data.name, description: data.description, ownerId: data.owner_id };
        setWorkspaces(prev => [...prev, newWs]);
        addLog('Create Workspace', `Created workspace "${name}"`);
    }
  };

  const deleteWorkspace = async (id: string) => {
    await supabase.from('workspaces').delete().eq('id', id);
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    setDashboards(prev => prev.filter(d => d.workspaceId !== id));
    setDataSources(prev => prev.filter(ds => ds.workspaceId !== id));
    addLog('Delete Workspace', `Deleted workspace ID ${id}`);
  };

  const addDashboard = async (workspaceId: string, name: string) => {
    const { data } = await supabase
        .from('dashboards')
        .insert({ workspace_id: workspaceId, name, widgets: [], filters: [] })
        .select()
        .single();
    
    if (data) {
        setDashboards(prev => [...prev, { ...data, workspaceId: data.workspace_id }]);
        addLog('Create Dashboard', `Created dashboard "${name}"`);
    }
  };

  const updateDashboard = async (updatedDashboard: Dashboard) => {
    // Optimistic
    setDashboards(prev => prev.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
    
    await supabase
        .from('dashboards')
        .update({ 
            name: updatedDashboard.name,
            widgets: updatedDashboard.widgets,
            filters: updatedDashboard.filters
        })
        .eq('id', updatedDashboard.id);

    addLog('Update Dashboard', `Updated dashboard "${updatedDashboard.name}"`);
  };

  const deleteDashboard = async (id: string) => {
    await supabase.from('dashboards').delete().eq('id', id);
    setDashboards(prev => prev.filter(d => d.id !== id));
    addLog('Delete Dashboard', `Deleted dashboard ID ${id}`);
  };

  const addDataSource = async (source: DataSource) => {
    const { data } = await supabase
        .from('data_sources')
        .insert({
            workspace_id: source.workspaceId,
            name: source.name,
            type: source.type,
            config: source.config,
            status: 'connected',
            schedule: { type: 'MANUAL' }
        })
        .select()
        .single();

    if (data) {
        setDataSources(prev => [...prev, { ...data, workspaceId: data.workspace_id }]);
        addLog('Add Data Source', `Connected source "${source.name}"`);
    }
  };

  const saveQuery = async (workspaceId: string, name: string, sql: string) => {
      const { data } = await supabase
        .from('saved_queries')
        .insert({ workspace_id: workspaceId, name, sql, description: 'Saved Query' })
        .select()
        .single();
      
      if (data) {
          setSavedQueries(prev => [...prev, { ...data, workspaceId: data.workspace_id }]);
          addLog('Save Query', `Saved query "${name}"`);
      }
  };

  // --- Cron / Scheduler Logic (Client Side Simulation for now) ---
  // In a real Supabase app, this logic belongs in Database Webhooks or Edge Functions (pg_cron)
  
  const calculateNextRun = (interval?: CronInterval): string => {
      const now = new Date();
      let next = new Date(now);
      switch (interval) {
          case '15m': next = new Date(now.getTime() + 15 * 60 * 1000); break;
          case '30m': next = new Date(now.getTime() + 30 * 60 * 1000); break;
          case '1h': next = new Date(now.getTime() + 60 * 60 * 1000); break;
          case 'midnight': next.setDate(now.getDate() + 1); next.setHours(0, 0, 0, 0); break;
          default: return '';
      }
      return next.toISOString();
  };

  const updateDataSourceSchedule = async (id: string, schedule: DataSourceSchedule) => {
      const updatedSchedule = {
          ...schedule,
          nextSyncAt: schedule.type === 'AUTO' ? calculateNextRun(schedule.interval) : undefined
      };

      // Optimistic
      setDataSources(prev => prev.map(ds => ds.id === id ? { ...ds, schedule: updatedSchedule } : ds));
      
      await supabase
        .from('data_sources')
        .update({ schedule: updatedSchedule })
        .eq('id', id);
      
      addLog('Update Schedule', `Updated schedule for source ${id}`);
  };

  const triggerDataSourceRefresh = async (id: string) => {
      const ds = dataSources.find(d => d.id === id);
      if (!ds) return;

      // 1. Set Syncing in UI and DB
      const syncingSchedule = { ...ds.schedule, isSyncing: true };
      setDataSources(prev => prev.map(d => d.id === id ? { ...d, schedule: syncingSchedule } : d));
      
      // Update DB to notify other users (if real-time was enabled)
      await supabase.from('data_sources').update({ schedule: syncingSchedule }).eq('id', id);

      try {
        // 2. Simulate Delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Success Update
        const now = new Date().toISOString();
        const nextRun = ds.schedule.type === 'AUTO' ? calculateNextRun(ds.schedule.interval) : undefined;
        
        const doneSchedule = { 
            ...ds.schedule, 
            isSyncing: false, 
            lastSyncedAt: now, 
            nextSyncAt: nextRun 
        };

        setDataSources(prev => prev.map(d => d.id === id ? { ...d, status: 'connected', schedule: doneSchedule } : d));
        
        await supabase.from('data_sources').update({ 
            status: 'connected', 
            schedule: doneSchedule,
            last_error_message: null 
        }).eq('id', id);

        addLog('Data Refresh Success', `Refreshed source "${ds.name}"`);

      } catch (error: any) {
         const errorSchedule = { ...ds.schedule, isSyncing: false };
         setDataSources(prev => prev.map(d => d.id === id ? { ...d, status: 'error', schedule: errorSchedule } : d));
         
         await supabase.from('data_sources').update({ 
             status: 'error', 
             schedule: errorSchedule,
             last_error_message: error.message 
         }).eq('id', id);

         addLog('Data Refresh Failed', `Failed to refresh source "${ds.name}"`);
      }
  };

  // Cron Heartbeat (Client-side simulation)
  useEffect(() => {
      const intervalId = setInterval(() => {
          const now = new Date();
          dataSourcesRef.current.forEach(ds => {
              if (ds.schedule.type === 'AUTO' && !ds.schedule.isSyncing && ds.schedule.nextSyncAt) {
                  if (now >= new Date(ds.schedule.nextSyncAt)) {
                      console.log(`[Cron] Auto-triggering ${ds.name}`);
                      triggerDataSourceRefresh(ds.id);
                  }
              }
          });
      }, 30000); // Check every 30s
      return () => clearInterval(intervalId);
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, dashboards, dataSources, savedQueries, logs,
      addWorkspace, deleteWorkspace, addDashboard, updateDashboard, deleteDashboard,
      addDataSource, saveQuery, updateDataSourceSchedule, triggerDataSourceRefresh, addLog
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
