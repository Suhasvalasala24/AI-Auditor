export type ChartDataPoint = {
    name: string;
    value: number;
  };
  
  export type TrendPoint = {
    name: string;
    value: number;
  };
  
  export type TrendData = {
    oneMonth: TrendPoint[];
    sixMonths: TrendPoint[];
    oneYear: TrendPoint[];
  };
  
  export type Model = {
    id: number;
    model_id: string;
    name: string;
    version: string;
    connection_type: string;
    last_audit_status?: string;
  };
  