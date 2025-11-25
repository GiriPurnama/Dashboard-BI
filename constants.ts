
import { Workspace, DataSource, DataSourceType, Dashboard, ChartType, Widget, FilterType } from './types';

export const MOCK_USER = {
  id: 'u1',
  email: 'admin@insightflow.com',
  name: 'Admin User'
};

export const INITIAL_WORKSPACES: Workspace[] = [
  { id: 'ws1', name: 'Retail Client A', ownerId: 'u1', description: 'Sales performance for Q1-Q4' },
  { id: 'ws2', name: 'Logistics Client B', ownerId: 'u1', description: 'Fleet management and delivery times' },
];

export const INITIAL_DATA_SOURCES: DataSource[] = [
  { 
    id: 'ds1', 
    workspaceId: 'ws1', 
    name: 'Sales DB (Postgres)', 
    type: DataSourceType.POSTGRES, 
    config: { host: 'db.sales.com' }, 
    status: 'connected',
    schedule: {
        type: 'MANUAL',
        lastSyncedAt: new Date().toISOString()
    }
  },
  { 
    id: 'ds2', 
    workspaceId: 'ws1', 
    name: 'Marketing CSV', 
    type: DataSourceType.CSV, 
    config: { fileName: 'campaigns.csv' }, 
    status: 'connected',
    schedule: {
        type: 'AUTO',
        interval: '1h',
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
        nextSyncAt: new Date(Date.now() + 10000).toISOString() // Set to run soon for demo
    }
  },
  { 
    id: 'ds3', 
    workspaceId: 'ws2', 
    name: 'Fleet API', 
    type: DataSourceType.REST_API, 
    config: { endpoint: 'api.fleet.io' }, 
    status: 'connected',
    schedule: {
        type: 'MANUAL',
        lastSyncedAt: new Date().toISOString()
    }
  },
];

// Mock data generator
export const generateSalesData = () => [
  { month: 'Jan', revenue: 4000, profit: 2400, churn: 100, status: 'Active', category: 'Electronics', date: '2024-01-01' },
  { month: 'Feb', revenue: 3000, profit: 1398, churn: 200, status: 'Active', category: 'Furniture', date: '2024-02-01' },
  { month: 'Mar', revenue: 2000, profit: 9800, churn: 150, status: 'Active', category: 'Electronics', date: '2024-03-01' },
  { month: 'Apr', revenue: 2780, profit: 3908, churn: 180, status: 'Inactive', category: 'Clothing', date: '2024-04-01' },
  { month: 'May', revenue: 1890, profit: 4800, churn: 220, status: 'Inactive', category: 'Furniture', date: '2024-05-01' },
  { month: 'Jun', revenue: 2390, profit: 3800, churn: 190, status: 'Active', category: 'Clothing', date: '2024-06-01' },
  { month: 'Jul', revenue: 3490, profit: 4300, churn: 170, status: 'Active', category: 'Electronics', date: '2024-07-01' },
];

export const generateScatterData = () => Array.from({ length: 50 }, (_, i) => ({
  x: Math.floor(Math.random() * 100),
  y: Math.floor(Math.random() * 100),
  z: Math.floor(Math.random() * 500),
  route_type: i % 2 === 0 ? 'Express' : 'Standard'
}));

const salesData = generateSalesData();

export const INITIAL_DASHBOARDS: Dashboard[] = [
  {
    id: 'db1',
    workspaceId: 'ws1',
    name: 'Executive Overview',
    filters: [
        { id: 'period', label: 'Date Range', type: FilterType.DATE_RANGE }
    ],
    widgets: [
      {
        id: 'w1',
        type: ChartType.AREA,
        title: 'Revenue Trends',
        data: salesData,
        config: { 
            xAxis: 'month', 
            dataKeys: ['revenue', 'profit'], 
            colors: ['#0ea5e9', '#8b5cf6'],
            filterMapping: { 'period': 'date' } 
        },
        layout: { w: 2, h: 300 }
      },
      {
        id: 'w2',
        type: ChartType.BAR,
        title: 'Monthly Churn',
        data: salesData,
        config: { 
            xAxis: 'month', 
            dataKeys: ['churn'], 
            colors: ['#ef4444'],
            filterMapping: { 'period': 'date' } 
        },
        layout: { w: 1, h: 300 }
      },
      {
        id: 'w3',
        type: ChartType.HTML,
        title: 'External KPI',
        data: [],
        config: { htmlContent: '<div class="p-4 bg-green-100 rounded-lg text-center"><h3 class="text-2xl font-bold text-green-800">98.5%</h3><p class="text-green-600">SLA Uptime</p></div>' },
        layout: { w: 1, h: 150 }
      }
    ]
  },
  {
    id: 'db2',
    workspaceId: 'ws2',
    name: 'Logistics Ops',
    filters: [],
    widgets: [
      {
        id: 'w4',
        type: ChartType.SCATTER,
        title: 'Delivery Routes Efficiency',
        data: generateScatterData(),
        config: { xAxis: 'x', dataKeys: ['y'], colors: ['#f59e0b'] },
        layout: { w: 3, h: 400 }
      }
    ]
  }
];
