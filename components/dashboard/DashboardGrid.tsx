
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard, Widget, ChartType, DashboardFilter, FilterType, DataSource, AggregationType } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { generateSalesData, generateScatterData } from '../../constants';

interface DashboardGridProps {
  dashboard: Dashboard;
  onUpdateDashboard: (dashboard: Dashboard) => void;
}

// Common styles - Enforce bg-white strongly
const inputStyles = "w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all placeholder-slate-400";
const labelStyles = "block text-sm font-semibold text-slate-700 mb-2";

export const DashboardGrid: React.FC<DashboardGridProps> = ({ dashboard, onUpdateDashboard }) => {
  const { dataSources, savedQueries } = useWorkspace();
  const [fullScreenWidget, setFullScreenWidget] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [exportMenuOpenId, setExportMenuOpenId] = useState<string | null>(null);
  
  // Date Filter State
  const [datePresetState, setDatePresetState] = useState<Record<string, string>>({});
  
  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);

  // Drill Down State
  const [drillDownData, setDrillDownData] = useState<{ title: string, data: any } | null>(null);

  // Add/Edit Widget State
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null); // null = create mode
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetType, setNewWidgetType] = useState<ChartType>(ChartType.BAR);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  
  // Field Configuration State
  const [xAxisField, setXAxisField] = useState('');
  const [dataKeyField, setDataKeyField] = useState('');
  const [tableColumns, setTableColumns] = useState<string[]>([]); // For Table type
  const [aggregationType, setAggregationType] = useState<AggregationType>(AggregationType.SUM);
  const [tempFilterMapping, setTempFilterMapping] = useState<Record<string, string>>({});
  
  // Preview State
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  
  // Resizing State
  const [resizingWidget, setResizingWidget] = useState<{id: string, startY: number, startH: number} | null>(null);

  // Initialize default filters
  useEffect(() => {
    const defaults: Record<string, any> = {};
    dashboard.filters.forEach(f => {
      if (f.defaultValue) defaults[f.id] = f.defaultValue;
    });
    setActiveFilters(defaults);
  }, [dashboard.id]);

  // Close export menu on outside click
  useEffect(() => {
    const closeMenu = () => setExportMenuOpenId(null);
    if (exportMenuOpenId) {
        window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [exportMenuOpenId]);

  // Global resize listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingWidget) return;
      
      const deltaY = e.clientY - resizingWidget.startY;
      const newHeight = Math.max(150, resizingWidget.startH + deltaY);
      
      // Update immediately in UI
      onUpdateDashboard({
        ...dashboard,
        widgets: dashboard.widgets.map(w => 
          w.id === resizingWidget.id 
            ? { ...w, layout: { ...w.layout, h: newHeight } } 
            : w
        )
      });
    };

    const handleMouseUp = () => {
      setResizingWidget(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (resizingWidget) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingWidget, dashboard, onUpdateDashboard]);

  const processAggregation = (data: any[], xField: string, yField: string, agg: AggregationType) => {
      const groups: Record<string, number[]> = {};
      
      data.forEach(row => {
          const key = String(row[xField]);
          const val = Number(row[yField]) || 0;
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(val);
      });

      return Object.keys(groups).map(key => {
          const values = groups[key];
          let result = 0;

          switch(agg) {
              case AggregationType.SUM:
                  result = values.reduce((a, b) => a + b, 0);
                  break;
              case AggregationType.AVG:
                  result = values.reduce((a, b) => a + b, 0) / values.length;
                  break;
              case AggregationType.MIN:
                  result = Math.min(...values);
                  break;
              case AggregationType.MAX:
                  result = Math.max(...values);
                  break;
              case AggregationType.COUNT:
                  result = values.length;
                  break;
              case AggregationType.NONE:
              default:
                  result = values[0];
          }

          result = Math.round(result * 100) / 100;

          return {
              [xField]: key,
              [yField]: result
          };
      });
  };

  // Real-time Preview & Field Extraction Logic
  useEffect(() => {
    if (!selectedSourceId) {
        setPreviewData([]);
        setAvailableFields([]);
        return;
    }

    // 1. Fetch Raw Data (Source or Query)
    // If selectedSourceId matches a saved Query, we use mock data but pretend it came from that query.
    // This simulates "Using a Query Result as a Dataset".
    let rawData: any[] = [];
    
    if (selectedSourceId.startsWith('sq-')) {
        // It's a saved query. 
        // In a real app, we would run the SQL. Here, we return mock sales data with dimensions.
        rawData = generateSalesData();
    } else if (newWidgetType === ChartType.SCATTER) {
        rawData = generateScatterData();
    } else {
        rawData = generateSalesData();
    }

    // 2. Extract Fields from Raw Data
    if (rawData.length > 0) {
        const fields = Object.keys(rawData[0]);
        setAvailableFields(fields);
    } else {
        setAvailableFields([]);
    }

    // 3. Process Data based on Type & Configuration
    if (newWidgetType === ChartType.TABLE) {
        // For tables, just map the selected columns
        if (tableColumns.length === 0) {
            // If no columns selected yet, show raw data (up to limit) or nothing
            setPreviewData(rawData.slice(0, 5));
        } else {
            const processed = rawData.map(row => {
                const newRow: any = {};
                tableColumns.forEach(col => {
                    newRow[col] = row[col] && typeof row[col] !== 'object' ? row[col] : '';
                });
                return newRow;
            });
            setPreviewData(processed);
        }
    } else if (newWidgetType === ChartType.HTML) {
        setPreviewData([]);
    } else if (newWidgetType === ChartType.INDICATOR) {
        // Indicator Logic: Aggregate to single value
        if (!dataKeyField) {
            setPreviewData([]);
            return;
        }
        const vals = rawData.map(r => Number(r[dataKeyField]) || 0);
        let result = 0;
        switch(aggregationType) {
             case AggregationType.SUM: result = vals.reduce((a, b) => a + b, 0); break;
             case AggregationType.AVG: result = vals.reduce((a, b) => a + b, 0) / vals.length; break;
             case AggregationType.MIN: result = Math.min(...vals); break;
             case AggregationType.MAX: result = Math.max(...vals); break;
             case AggregationType.COUNT: result = vals.length; break;
             default: result = vals[0];
        }
        // Return as array with 1 object for renderer consistency
        setPreviewData([{ [dataKeyField]: Math.round(result * 100) / 100 }]);
    } else {
        // For charts, use aggregation
        // This allows combining fields (Pivoting). 
        // E.g., if Source is "SELECT * FROM Sales", I can choose X=Category, Y=Revenue (Sum) to see Revenue by Category.
        if (!xAxisField || !dataKeyField) {
            // Show empty or sample if incomplete config
            setPreviewData([]);
            return;
        }
        const processed = processAggregation(rawData, xAxisField, dataKeyField, aggregationType);
        setPreviewData(processed);
    }

  }, [selectedSourceId, xAxisField, dataKeyField, aggregationType, newWidgetType, tableColumns]);


  const availableSources = dataSources.filter(ds => ds.workspaceId === dashboard.workspaceId);
  const availableQueries = savedQueries.filter(sq => sq.workspaceId === dashboard.workspaceId);

  const handleFilterChange = (filterId: string, value: any) => {
    setActiveFilters(prev => ({ ...prev, [filterId]: value }));
  };

  // Specific handler for Date Presets
  const handleDatePresetChange = (filterId: string, preset: string) => {
      setDatePresetState(prev => ({ ...prev, [filterId]: preset }));
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      let start = '';
      let end = today;

      if (preset === '7_DAYS') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          start = d.toISOString().split('T')[0];
      } else if (preset === '30_DAYS') {
           const d = new Date();
          d.setDate(d.getDate() - 30);
          start = d.toISOString().split('T')[0];
      } else if (preset === 'THIS_MONTH') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          start = d.toISOString().split('T')[0];
      } else if (preset === 'LAST_MONTH') {
          const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
          start = firstDay.toISOString().split('T')[0];
          end = lastDay.toISOString().split('T')[0];
      } else if (preset === 'CUSTOM') {
          // Do not update filter values yet, wait for user input
          return; 
      } else {
          // All Time / Clear
          handleFilterChange(filterId, null);
          return;
      }

      handleFilterChange(filterId, { start, end });
  };

  const applyFiltersToWidget = (widget: Widget) => {
    let filteredData = [...widget.data];
    const mapping = widget.config.filterMapping || {};

    Object.entries(activeFilters).forEach(([filterId, filterValue]) => {
      const mappedField = mapping[filterId];
      if (!mappedField || !filterValue) return;

      const filterDef = dashboard.filters.find(f => f.id === filterId);
      if (!filterDef) return;

      filteredData = filteredData.filter(row => {
        const rowValue = row[mappedField];
        
        if (filterDef.type === FilterType.SELECT) {
            return rowValue === filterValue || filterValue === 'All';
        }
        
        if (filterDef.type === FilterType.DATE_RANGE && typeof filterValue === 'object' && filterValue !== null) {
            const { start, end } = filterValue as { start?: string, end?: string };
            if (!rowValue) return true; // Skip if no date on row
            
            const rowDate = new Date(String(rowValue));
            let matchesStart = true;
            let matchesEnd = true;

            if (start) matchesStart = rowDate >= new Date(start);
            if (end) matchesEnd = rowDate <= new Date(end);

            return matchesStart && matchesEnd;
        }

        return true;
      });
    });

    return { ...widget, data: filteredData };
  };

  const handleDataPointClick = (widgetTitle: string, dataPoint: any) => {
      if (!isEditMode) {
        setDrillDownData({ title: widgetTitle, data: dataPoint });
      }
  };

  // -- Drag & Drop Config Handlers (Modal) --
  const handleDragStart = (e: React.DragEvent, field: string) => {
    e.dataTransfer.setData("field", field);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent, target: 'xaxis' | 'yaxis' | 'columns' | 'filter') => {
    e.preventDefault();
    const field = e.dataTransfer.getData("field");
    
    if (target === 'xaxis') setXAxisField(field);
    if (target === 'yaxis') setDataKeyField(field);
    if (target === 'columns') {
        if (!tableColumns.includes(field)) {
            setTableColumns([...tableColumns, field]);
        }
    }
    // New: Drop to create Filter
    if (target === 'filter') {
        const filterId = field.toLowerCase().replace(/\s+/g, '_');
        // 1. Create Global Filter if not exists
        if (!dashboard.filters.find(f => f.id === filterId)) {
            const newFilter: DashboardFilter = {
                id: filterId,
                label: field.charAt(0).toUpperCase() + field.slice(1),
                type: FilterType.SELECT, // Defaulting to Select as per request
                options: ['Option A', 'Option B', 'Option C'] // Mock options
            };
            onUpdateDashboard({ ...dashboard, filters: [...dashboard.filters, newFilter] });
        }
        // 2. Update Local Widget Mapping
        setTempFilterMapping(prev => ({ ...prev, [filterId]: field }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  // -- Widget Layout Reordering Handlers --
  const handleWidgetDragStart = (e: React.DragEvent, index: number) => {
      if (!isEditMode) return;
      e.dataTransfer.setData("widgetIndex", index.toString());
  };

  const handleWidgetDrop = (e: React.DragEvent, dropIndex: number) => {
      if (!isEditMode) return;
      e.preventDefault();
      const dragIndex = Number(e.dataTransfer.getData("widgetIndex"));
      if (dragIndex === dropIndex) return;

      const newWidgets = [...dashboard.widgets];
      const [movedWidget] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(dropIndex, 0, movedWidget);
      
      onUpdateDashboard({ ...dashboard, widgets: newWidgets });
  };

  const moveWidget = (index: number, direction: 'UP' | 'DOWN') => {
      if (direction === 'UP' && index === 0) return;
      if (direction === 'DOWN' && index === dashboard.widgets.length - 1) return;

      const newWidgets = [...dashboard.widgets];
      const swapIndex = direction === 'UP' ? index - 1 : index + 1;
      
      [newWidgets[index], newWidgets[swapIndex]] = [newWidgets[swapIndex], newWidgets[index]];
      onUpdateDashboard({ ...dashboard, widgets: newWidgets });
  };

  const handleMouseDownResize = (e: React.MouseEvent, widget: Widget) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setResizingWidget({
      id: widget.id,
      startY: e.clientY,
      startH: widget.layout.h || 300
    });
  };

  // -- Add/Edit Widget Logic --
  const openAddModal = () => {
      resetWidgetForm();
      setEditingWidgetId(null);
      setShowAddWidgetModal(true);
  };

  const openEditModal = (widget: Widget) => {
      setEditingWidgetId(widget.id);
      setNewWidgetTitle(widget.title);
      setNewWidgetType(widget.type);
      // For mock purposes, we assume source is available or just pick first
      if (widget.config.queryId) {
          setSelectedSourceId(widget.config.queryId); // Saved Query
      } else if (availableSources.length > 0) {
          setSelectedSourceId(availableSources[0].id);
      }
      
      setXAxisField(widget.config.xAxis || '');
      // Check config.dataKeys for single value or array
      if (widget.type === ChartType.TABLE) {
          setTableColumns(widget.config.dataKeys || []);
      } else {
          setDataKeyField(widget.config.dataKeys?.[0] || '');
      }
      setAggregationType(widget.config.aggregation || AggregationType.SUM);
      setTempFilterMapping(widget.config.filterMapping || {});
      
      // Don't set preview data immediately to avoid flash, useEffect will handle it via source
      setShowAddWidgetModal(true);
  };

  const handleSaveWidget = () => {
    if (!newWidgetTitle) return;

    const isTable = newWidgetType === ChartType.TABLE;
    const isHtml = newWidgetType === ChartType.HTML;
    const isIndicator = newWidgetType === ChartType.INDICATOR;
    
    // Validation
    if (!isHtml) {
       if (isTable && tableColumns.length === 0) return;
       if (!isTable && !isIndicator && (!xAxisField || !dataKeyField)) return;
       if (isIndicator && !dataKeyField) return;
    }

    const widgetConfig: any = {
        xAxis: (isTable || isIndicator) ? undefined : xAxisField,
        dataKeys: isTable ? tableColumns : [dataKeyField], 
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'], 
        aggregation: isTable ? undefined : aggregationType,
        htmlContent: isHtml ? '<div class="p-4">Edit HTML content</div>' : undefined,
        filterMapping: tempFilterMapping,
        queryId: selectedSourceId.startsWith('sq-') ? selectedSourceId : undefined
    };

    if (editingWidgetId) {
        // Update existing
        const updatedWidgets = dashboard.widgets.map(w => {
            if (w.id === editingWidgetId) {
                return {
                    ...w,
                    title: newWidgetTitle,
                    type: newWidgetType,
                    data: previewData,
                    config: { ...w.config, ...widgetConfig }
                };
            }
            return w;
        });
        onUpdateDashboard({ ...dashboard, widgets: updatedWidgets });
    } else {
        // Create new
        const newWidget: Widget = {
            id: `w-${Date.now()}`,
            title: newWidgetTitle,
            type: newWidgetType,
            data: previewData,
            config: widgetConfig,
            layout: { w: isTable ? 3 : 1, h: 300 }
        };
        onUpdateDashboard({ ...dashboard, widgets: [...dashboard.widgets, newWidget] });
    }

    setShowAddWidgetModal(false);
    resetWidgetForm();
  };

  const resetWidgetForm = () => {
      setNewWidgetTitle('');
      setNewWidgetType(ChartType.BAR);
      setXAxisField('');
      setDataKeyField('');
      setTableColumns([]);
      setAggregationType(AggregationType.SUM);
      setTempFilterMapping({});
      setPreviewData([]);
      setAvailableFields([]);
      setEditingWidgetId(null);
  };

  // Edit Mode Actions
  const handleDeleteWidget = (id: string) => {
      if (confirm('Are you sure you want to delete this widget?')) {
        onUpdateDashboard({ 
            ...dashboard, 
            widgets: dashboard.widgets.filter(w => w.id !== id) 
        });
      }
  };

  const handleResizeWidth = (id: string, delta: number) => {
      const updated = dashboard.widgets.map(w => {
          if (w.id === id) {
              const newW = Math.min(3, Math.max(1, w.layout.w + delta));
              return { ...w, layout: { ...w.layout, w: newW }};
          }
          return w;
      });
      onUpdateDashboard({ ...dashboard, widgets: updated });
  };

  // Construct preview widget for the modal
  const isTablePreview = newWidgetType === ChartType.TABLE;
  const isHtmlPreview = newWidgetType === ChartType.HTML;
  const isIndicatorPreview = newWidgetType === ChartType.INDICATOR;

  const previewWidget: Widget = {
    id: 'preview-widget',
    title: newWidgetTitle || 'New Widget',
    type: newWidgetType,
    data: previewData,
    config: {
        xAxis: (isTablePreview || isIndicatorPreview) ? undefined : xAxisField,
        dataKeys: isTablePreview ? tableColumns : (dataKeyField ? [dataKeyField] : []), 
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'], 
        aggregation: isTablePreview ? undefined : aggregationType,
        htmlContent: isHtmlPreview ? '<div class="p-4 text-center text-slate-400">HTML content placeholder</div>' : undefined
    },
    layout: { w: 1, h: 300 }
  };

  // Embed Code Generator
  const embedCode = `<iframe src="${window.location.href.split('#')[0]}#/embed/${dashboard.id}" width="100%" height="100%" frameborder="0" style="border:none; overflow:hidden;"></iframe>`;

  // Export Logic (Same as before)
  const handleDownload = (widget: Widget, format: 'csv' | 'xls') => {
     // ... simplified for brevity, logic remains same as provided previously
     const data = widget.data;
      if (!data || data.length === 0) return;
      
      const filename = (widget.title || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const headers = Object.keys(data[0]);

      if (format === 'csv') {
          const csvContent = [
              headers.join(','),
              ...data.map(row => headers.map(fieldName => {
                  const val = row[fieldName];
                  return `"${val}"`;
              }).join(','))
          ].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header & Controls */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-slate-800">{dashboard.name}</h2>
            <div className="flex space-x-3">
                {isEditMode ? (
                    <Button variant="danger" onClick={() => setIsEditMode(false)}>Done Editing</Button>
                ) : (
                    <>
                        <Button onClick={openAddModal}>+ Add Widget</Button>
                        <Button variant="secondary" onClick={() => setIsEditMode(true)}>✏️ Edit Layout</Button>
                    </>
                )}
                {/* Page Settings button hidden as requested */}
                {/* <Button variant="secondary" size="sm" onClick={() => setShowConfigModal(true)}>⚙️ Page Settings</Button> */}
                <Button variant="ghost" size="sm" onClick={() => setShowEmbedModal(true)}>&lt;/&gt;</Button>
            </div>
        </div>

        {/* Filter Bar */}
        {dashboard.filters.length > 0 && (
            <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100 items-start animate-in fade-in duration-300">
                {dashboard.filters.map(filter => (
                    <div key={filter.id} className="flex flex-col min-w-[180px]">
                        <label className="text-xs font-semibold text-slate-500 mb-1">{filter.label}</label>
                        {filter.type === FilterType.SELECT ? (
                            <select 
                                className="text-sm bg-white border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 w-full py-2 px-3 shadow-sm"
                                value={activeFilters[filter.id] || ''}
                                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                            >
                                <option value="">Select...</option>
                                <option value="All">All</option>
                                {filter.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : filter.type === FilterType.DATE_RANGE ? (
                             <div className="flex flex-col gap-2">
                                 <select
                                    className="text-sm bg-white border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 w-full py-2 px-3 shadow-sm"
                                    value={datePresetState[filter.id] || ''}
                                    onChange={(e) => handleDatePresetChange(filter.id, e.target.value)}
                                 >
                                     <option value="">All Time</option>
                                     <option value="THIS_MONTH">This Month</option>
                                     <option value="LAST_MONTH">Last Month</option>
                                     <option value="7_DAYS">Last 7 Days</option>
                                     <option value="30_DAYS">Last 30 Days</option>
                                     <option value="CUSTOM">Custom Range</option>
                                 </select>
                                 {datePresetState[filter.id] === 'CUSTOM' && (
                                    <div className="flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <input 
                                            type="date"
                                            className="text-sm bg-white border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 py-1.5 px-2 w-32 shadow-sm"
                                            onChange={(e) => handleFilterChange(filter.id, { ...(activeFilters[filter.id] || {}), start: e.target.value })}
                                            value={activeFilters[filter.id]?.start || ''}
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input 
                                            type="date"
                                            className="text-sm bg-white border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 py-1.5 px-2 w-32 shadow-sm"
                                            onChange={(e) => handleFilterChange(filter.id, { ...(activeFilters[filter.id] || {}), end: e.target.value })}
                                            value={activeFilters[filter.id]?.end || ''}
                                        />
                                   </div>
                                 )}
                           </div>
                        ) : (
                            <input 
                                type="text"
                                className="text-sm bg-white border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 py-2 px-3 shadow-sm"
                                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                            />
                        )}
                    </div>
                ))}
                <div className="flex items-end self-center mt-4">
                    <button onClick={() => { setActiveFilters({}); setDatePresetState({}); }} className="text-xs text-brand-600 hover:underline mb-1 ml-2 font-medium">Clear Filters</button>
                </div>
            </div>
        )}
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto p-6">
        {dashboard.widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="mb-4">No widgets on this page yet.</p>
                <Button variant="secondary" onClick={openAddModal}>Add Your First Widget</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard.widgets.map((widget, index) => {
                const filteredWidget = applyFiltersToWidget(widget);
                const colSpan = widget.layout.w === 3 ? 'lg:col-span-3' : widget.layout.w === 2 ? 'lg:col-span-2' : 'lg:col-span-1';
                const isFullScreen = fullScreenWidget === widget.id;
                const baseHeight = widget.type === ChartType.INDICATOR ? 150 : 300;
                const currentHeight = widget.layout.h || baseHeight;
                const heightStyle = isFullScreen ? 'auto' : `${currentHeight}px`;
                const showExport = widget.data && widget.data.length > 0 && widget.type !== ChartType.HTML;

                return (
                <div 
                    key={widget.id} 
                    draggable={isEditMode}
                    onDragStart={(e) => handleWidgetDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleWidgetDrop(e, index)}
                    className={`
                        bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col transition-all relative
                        ${colSpan}
                        ${isFullScreen ? "fixed inset-4 z-40 bg-white shadow-2xl p-6" : "p-5"}
                        ${isEditMode ? "cursor-move ring-2 ring-dashed ring-slate-300 hover:ring-brand-400" : "hover:shadow-md"}
                    `} 
                    style={{ height: heightStyle }}
                >
                    {/* Widget Header ... (Keep existing) */}
                    <div className={`flex items-center justify-between mb-4 ${isEditMode ? 'bg-slate-50 -mx-5 -mt-5 p-3 px-5 border-b border-slate-100 rounded-t-xl' : ''}`}>
                        <h3 className="font-semibold text-slate-800 truncate" title={widget.title}>{widget.title}</h3>
                        <div className="flex items-center space-x-1">
                            {isEditMode ? (
                                <>
                                    <div className="flex items-center bg-white border border-slate-200 rounded mr-2 shadow-sm">
                                        <button onClick={() => moveWidget(index, 'UP')} disabled={index === 0} className="px-3 py-2 hover:bg-slate-100 text-sm border-r border-slate-200 disabled:opacity-30" title="Move Up/Left">⬆️</button>
                                        <button onClick={() => moveWidget(index, 'DOWN')} disabled={index === dashboard.widgets.length-1} className="px-3 py-2 hover:bg-slate-100 text-sm border-r border-slate-200 disabled:opacity-30" title="Move Down/Right">⬇️</button>
                                        <button onClick={() => handleResizeWidth(widget.id, -1)} className="px-3 py-2 hover:bg-slate-100 text-xs border-r border-slate-200 font-mono font-bold" title="Narrower">|←|</button>
                                        <button onClick={() => handleResizeWidth(widget.id, 1)} className="px-3 py-2 hover:bg-slate-100 text-xs border-r border-slate-200 font-mono font-bold" title="Wider">|→|</button>
                                    </div>
                                    <button onClick={() => openEditModal(widget)} className="p-2 text-slate-500 hover:text-blue-600 rounded" title="Edit Config">✏️</button>
                                    <button onClick={() => handleDeleteWidget(widget.id)} className="p-2 text-slate-500 hover:text-red-600 rounded" title="Delete">🗑️</button>
                                </>
                            ) : (
                                <>
                                    {/* View Mode Controls */}
                                    {showExport && (
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExportMenuOpenId(exportMenuOpenId === widget.id ? null : widget.id);
                                                }}
                                                className="text-slate-400 hover:text-brand-600 p-1 rounded hover:bg-slate-100"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                            </button>
                                            {exportMenuOpenId === widget.id && (
                                                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-md shadow-xl border border-slate-200 py-1 z-50">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(filteredWidget, 'csv'); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">CSV</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button onClick={() => setFullScreenWidget(isFullScreen ? null : widget.id)} className="text-slate-400 hover:text-brand-600 p-1 rounded hover:bg-slate-100">
                                        {isFullScreen ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Widget Content */}
                    <div className={`flex-1 min-h-0 relative ${isEditMode ? 'pointer-events-none opacity-75' : ''}`}>
                        {widget.type === ChartType.HTML ? (
                            <div className="w-full h-full prose prose-sm max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: widget.config.htmlContent || '' }} />
                        ) : (
                            <ChartRenderer 
                                widget={filteredWidget} 
                                onDataPointClick={(data) => handleDataPointClick(widget.title, data)}
                            />
                        )}
                    </div>
                    {isEditMode && (
                         <div 
                             className="absolute bottom-0 left-0 right-0 h-5 bg-slate-100 hover:bg-brand-100 border-t border-slate-300 cursor-ns-resize flex items-center justify-center rounded-b-xl transition-colors z-10"
                             onMouseDown={(e) => handleMouseDownResize(e, widget)}
                         >
                            <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
                         </div>
                     )}
                </div>
                );
            })}
            </div>
        )}
      </div>
      
      {fullScreenWidget && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30" onClick={() => setFullScreenWidget(null)}></div>}

      {/* DRILL DOWN MODAL */}
      {drillDownData && (
          <Modal
            isOpen={!!drillDownData}
            onClose={() => setDrillDownData(null)}
            title={`Drill Down: ${drillDownData.title}`}
            size="lg"
          >
            {/* Drill down content... */}
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Selected Data Point</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(drillDownData.data).map(([key, value]) => {
                            if (key === 'activeTooltipIndex' || key.startsWith('_') || typeof value === 'function' || typeof value === 'symbol') return null;
                            return (
                                <div key={key} className="bg-white p-3 rounded shadow-sm border border-slate-100">
                                    <span className="block text-[10px] font-medium text-slate-400 uppercase mb-1 truncate">{key}</span>
                                    <span className="block text-base font-semibold text-slate-800 truncate">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                 <div className="flex justify-end"><Button variant="secondary" onClick={() => setDrillDownData(null)}>Close</Button></div>
            </div>
          </Modal>
      )}

      {/* EMBED CODE MODAL */}
      <Modal isOpen={showEmbedModal} onClose={() => setShowEmbedModal(false)} title="Embed Dashboard" size="md" footer={<Button onClick={() => setShowEmbedModal(false)}>Close</Button>}>
          <div className="space-y-4">
              <textarea readOnly className="w-full h-32 bg-slate-900 text-slate-300 font-mono text-xs p-3 rounded" value={embedCode} onClick={(e) => e.currentTarget.select()} />
          </div>
      </Modal>

      {/* ADD/EDIT WIDGET MODAL */}
      <Modal
        isOpen={showAddWidgetModal}
        onClose={() => setShowAddWidgetModal(false)}
        title={editingWidgetId ? "Edit Widget" : "Create Custom Widget"}
        size="xl"
        footer={<Button onClick={handleSaveWidget} disabled={!newWidgetTitle}>{editingWidgetId ? "Update Widget" : "Save Widget"}</Button>}
      >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[65vh]">
            
            {/* Col 1: General & Fields Source */}
            <div className="lg:col-span-3 border-r border-slate-200 pr-4 flex flex-col gap-6 overflow-y-auto">
                <div>
                    <label className={labelStyles}>1. Widget Title</label>
                    <input type="text" className={inputStyles} placeholder="Title..." value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)} />
                </div>
                
                <div>
                    <label className={labelStyles}>2. Data Source</label>
                    <select className={inputStyles} value={selectedSourceId} onChange={e => setSelectedSourceId(e.target.value)}>
                        <option value="">Select Source...</option>
                        <optgroup label="Data Sources">
                            {availableSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </optgroup>
                        {availableQueries.length > 0 && (
                            <optgroup label="Saved Queries">
                                {availableQueries.map(q => <option key={q.id} value={q.id}>Query: {q.name}</option>)}
                            </optgroup>
                        )}
                    </select>
                </div>

                {selectedSourceId && newWidgetType !== ChartType.HTML && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Fields</label>
                        <p className="text-xs text-slate-400 mb-3">Drag fields to configuration zones</p>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {availableFields.length > 0 ? availableFields.map(field => (
                                <div 
                                    key={field} 
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, field)}
                                    className="bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 cursor-grab active:cursor-grabbing hover:border-brand-400 hover:shadow-sm flex items-center"
                                >
                                    <span className="w-4 h-4 bg-slate-100 text-slate-400 rounded-sm flex items-center justify-center text-[10px] mr-2">#</span>
                                    {field}
                                </div>
                            )) : (
                                <div className="text-xs text-slate-400 italic p-2">No fields detected from source.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Col 2: Config Zones */}
            <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
                 {/* Filter Creation Zone - NEW FEATURE */}
                 <div 
                    onDrop={(e) => handleDrop(e, 'filter')} 
                    onDragOver={handleDragOver}
                    className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                 >
                    <div className="text-2xl mb-2">🔍</div>
                    <p className="text-sm font-bold text-blue-800">Drop Field to Create Filter</p>
                    <p className="text-xs text-blue-600">Creates a dashboard filter & links to this widget.</p>
                    {Object.keys(tempFilterMapping).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 justify-center">
                            {Object.entries(tempFilterMapping).map(([id, field]) => (
                                <span key={id} className="bg-white text-blue-600 text-xs px-2 py-1 rounded border border-blue-200">
                                    {field}
                                </span>
                            ))}
                        </div>
                    )}
                 </div>

                 <div>
                    <label className={labelStyles}>3. Visualization Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[ChartType.BAR, ChartType.LINE, ChartType.PIE, ChartType.AREA, ChartType.SCATTER, ChartType.TABLE, ChartType.INDICATOR, ChartType.HTML].map(type => (
                            <button
                                key={type}
                                onClick={() => setNewWidgetType(type)}
                                className={`px-2 py-2 text-[10px] font-bold uppercase rounded border transition-all ${newWidgetType === type ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conditional Configuration Zones */}
                {newWidgetType === ChartType.HTML ? (
                    <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                        Config option not available for HTML mode yet.
                    </div>
                ) : (
                    <>
                         {newWidgetType !== ChartType.TABLE && newWidgetType !== ChartType.INDICATOR && (
                             <div 
                                onDrop={(e) => handleDrop(e, 'xaxis')} 
                                onDragOver={handleDragOver}
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${xAxisField ? 'border-brand-300 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
                             >
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">X-Axis / Group By</label>
                                {xAxisField ? (
                                    <div className="flex justify-between items-center bg-white p-2 rounded border border-brand-200 shadow-sm">
                                        <span className="font-mono text-brand-700 font-bold text-sm">{xAxisField}</span>
                                        <button onClick={() => setXAxisField('')} className="text-slate-400 hover:text-red-500">×</button>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-2">Drag field here</div>
                                )}
                             </div>
                         )}

                        {newWidgetType === ChartType.TABLE ? (
                             <div 
                                onDrop={(e) => handleDrop(e, 'columns')} 
                                onDragOver={handleDragOver}
                                className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg p-4 min-h-[100px]"
                             >
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Table Columns</label>
                                <div className="space-y-2">
                                    {tableColumns.map(col => (
                                        <div key={col} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <span className="font-mono text-slate-700 text-sm">{col}</span>
                                            <button onClick={() => setTableColumns(tableColumns.filter(c => c !== col))} className="text-slate-400 hover:text-red-500">×</button>
                                        </div>
                                    ))}
                                    {tableColumns.length === 0 && <div className="text-center text-slate-400 text-xs py-4">Drag fields here</div>}
                                </div>
                             </div>
                        ) : (
                             <div 
                                onDrop={(e) => handleDrop(e, 'yaxis')} 
                                onDragOver={handleDragOver}
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${dataKeyField ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
                             >
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    {newWidgetType === ChartType.INDICATOR ? 'Metric Value' : 'Y-Axis / Metric'}
                                </label>
                                {dataKeyField ? (
                                    <div className="flex justify-between items-center bg-white p-2 rounded border border-green-200 shadow-sm">
                                        <span className="font-mono text-green-700 font-bold text-sm">{dataKeyField}</span>
                                        <button onClick={() => setDataKeyField('')} className="text-slate-400 hover:text-red-500">×</button>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-2">Drag field here</div>
                                )}
                             </div>
                        )}

                         {newWidgetType !== ChartType.TABLE && (
                            <div>
                                <label className={labelStyles}>Aggregation</label>
                                <select className={inputStyles} value={aggregationType} onChange={e => setAggregationType(e.target.value as AggregationType)}>
                                    <option value={AggregationType.SUM}>Sum</option>
                                    <option value={AggregationType.AVG}>Average</option>
                                    <option value={AggregationType.COUNT}>Count</option>
                                    <option value={AggregationType.MIN}>Min</option>
                                    <option value={AggregationType.MAX}>Max</option>
                                    <option value={AggregationType.NONE}>None</option>
                                </select>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Col 3: Preview */}
            <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-white font-semibold text-slate-600 text-sm flex justify-between">
                    <span>Live Preview</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Mock Data</span>
                </div>
                <div className="flex-1 p-4 min-h-[300px]">
                    <ChartRenderer widget={previewWidget} />
                </div>
            </div>

          </div>
      </Modal>
    </div>
  );
};
