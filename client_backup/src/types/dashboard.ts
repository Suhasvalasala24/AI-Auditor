// client/src/types/dashboard.ts

export type ChartDataPoint = {
    name: string;
    value: number;
  };
  
  export type TrendData = {
    oneMonth: ChartDataPoint[];
    sixMonths: ChartDataPoint[];
    oneYear: ChartDataPoint[];
  };
  