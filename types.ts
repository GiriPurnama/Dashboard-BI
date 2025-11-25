
export enum ChartType {
  BAR = 'BAR',
  LINE = 'LINE',
  PIE = 'PIE',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  HEATMAP = 'HEATMAP',
  TABLE = 'TABLE',
  HTML = 'HTML',
  INDICATOR = 'INDICATOR'
}

export enum DataSourceType {
  CSV = 'CSV',
  JSON = 'JSON',
  POSTGRES = 'POSTGRES',
  MONGO = 'MONGO',
  REST_API = 'REST_API'
}

export enum AggregationType {
  NONE = 'NONE',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  COUNT = 'COUNT'
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  status?: 'Active' | 'Inactive';
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  description: string;
}

// New: Cron / Scheduler Types
export type CronInterval = '15m' | '30m' | '1h' | 'midnight';

export interface DataSourceSchedule {
  type: 'MANUAL' | 'AUTO';
  interval?: CronInterval;
  lastSyncedAt?: string;
  nextSyncAt?: string;
  isSyncing?: boolean;
}

export interface DataSource {
  id: string;
  workspaceId: string;
  name: string;
  type: DataSourceType;
  config: Record<string, any>;
  status: 'connected' | 'error' | 'pending';
  schedule: DataSourceSchedule;
  lastErrorMessage?: string; // For detailed logging
}

export interface WidgetDataPoint {
  [key: string]: string | number;
}

// New: Filter Definitions
export enum FilterType {
  DATE_RANGE = 'DATE_RANGE',
  SELECT = 'SELECT',
  TEXT = 'TEXT'
}

export interface DashboardFilter {
  id: string;
  label: string;
  type: FilterType;
  options?: string[]; // For SELECT type
  defaultValue?: any;
}

export interface Widget {
  id: string;
  type: ChartType;
  title: string;
  data: WidgetDataPoint[];
  config: {
    xAxis?: string;
    dataKeys?: string[]; 
    colors?: string[];
    htmlContent?: string;
    queryId?: string;
    aggregation?: AggregationType; // Added aggregation type
    // Map global filter ID to local data field key
    filterMapping?: Record<string, string>; 
  };
  layout: {
    w: number; // width (1-12 grid)
    h: number; // height (px)
  };
}

export interface Dashboard {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  widgets: Widget[];
  filters: DashboardFilter[]; // Global filters configured for this page
}

export interface SavedQuery {
  id: string;
  workspaceId: string;
  name: string;
  sql: string;
  description: string;
  lastRunAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}
