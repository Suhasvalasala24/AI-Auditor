import { useState } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { TrendData } from "@shared/schema";

interface BarChartProps {
  data: TrendData;
  color: string;
  title: string;
}

type TimeRange = "oneMonth" | "sixMonths" | "oneYear";

export function BarChart({ data, color, title }: BarChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("oneMonth");

  const timeRangeLabels: Record<TimeRange, string> = {
    oneMonth: "1M",
    sixMonths: "6M",
    oneYear: "1Y",
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex gap-1">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTimeRange(range)}
              data-testid={`button-timerange-${range}`}
            >
              {timeRangeLabels[range]}
            </Button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <RechartsBarChart data={data[timeRange]}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
