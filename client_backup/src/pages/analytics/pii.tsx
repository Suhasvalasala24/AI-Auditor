import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const piiMetrics = {
  totalPIILeaks: 23,
  addressedLeaks: 15,
  pendingLeaks: 8,
  criticalLeaks: 5,
};

const piiLeaksData: ChartDataPoint[] = [
  { name: "Addressed", value: 15 },
  { name: "Pending", value: 8 },
];

const piiSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 5 },
  { name: "High", value: 8 },
  { name: "Medium", value: 7 },
  { name: "Low", value: 3 },
];

const piiTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 4 },
    { name: "Week 2", value: 6 },
    { name: "Week 3", value: 5 },
    { name: "Week 4", value: 8 },
  ],
  sixMonths: [
    { name: "Jan", value: 12 },
    { name: "Feb", value: 15 },
    { name: "Mar", value: 18 },
    { name: "Apr", value: 14 },
    { name: "May", value: 20 },
    { name: "Jun", value: 23 },
  ],
  oneYear: [
    { name: "Q1", value: 45 },
    { name: "Q2", value: 57 },
    { name: "Q3", value: 62 },
    { name: "Q4", value: 71 },
  ],
};

const piiIncidents = [
  { id: 1, model: "GPT-4 Production", type: "Email Address", severity: "Critical", count: 12, date: "2024-12-28" },
  { id: 2, model: "Claude Enterprise", type: "Phone Number", severity: "High", count: 8, date: "2024-12-27" },
  { id: 3, model: "Custom LLM v2", type: "SSN", severity: "Critical", count: 3, date: "2024-12-26" },
  { id: 4, model: "Gemini Pro", type: "Credit Card", severity: "Critical", count: 2, date: "2024-12-25" },
  { id: 5, model: "Mistral 7B", type: "Address", severity: "Medium", count: 5, date: "2024-12-24" },
  { id: 6, model: "GPT-4 Production", type: "Name", severity: "Low", count: 15, date: "2024-12-23" },
];

const chartColors = {
  analysis: ["#10b981", "#3b82f6"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

export default function PIIAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          PII Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Track and manage Personal Identifiable Information exposure
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Total PII Leaks
            </div>
            <div className="text-4xl font-bold text-primary">
              {piiMetrics.totalPIILeaks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Addressed Leaks
            </div>
            <div className="text-4xl font-bold" style={{ color: "#10b981" }}>
              {piiMetrics.addressedLeaks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Pending Leaks
            </div>
            <div className="text-4xl font-bold" style={{ color: "#f59e0b" }}>
              {piiMetrics.pendingLeaks}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Critical Leaks
            </div>
            <div className="text-4xl font-bold text-destructive">
              {piiMetrics.criticalLeaks}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <PieChart data={piiLeaksData} colors={chartColors.analysis} title="PII Leak Status" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart data={piiTrendData} color="#3b82f6" title="PII Leak Trend" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart data={piiSeverityData} colors={chartColors.severity} title="PII Leaks by Severity" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle>Recent PII Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">PII Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Count</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {piiIncidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{incident.model}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{incident.type}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        incident.severity === "Critical" ? "destructive" :
                        incident.severity === "High" ? "default" :
                        incident.severity === "Medium" ? "secondary" : "outline"
                      }>
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-foreground">{incident.count}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{incident.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
