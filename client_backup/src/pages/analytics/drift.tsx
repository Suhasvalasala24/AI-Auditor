import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const driftMetrics = {
  totalModelsAnalyzed: 35,
  modelsWithDrift: 12,
  averageDriftScore: 0.23,
  criticalDrifts: 3,
};

const driftAnalysisData: ChartDataPoint[] = [
  { name: "No Drift", value: 23 },
  { name: "With Drift", value: 12 },
];

const driftSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 3 },
  { name: "High", value: 5 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const driftTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 2 },
    { name: "Week 2", value: 4 },
    { name: "Week 3", value: 3 },
    { name: "Week 4", value: 3 },
  ],
  sixMonths: [
    { name: "Jan", value: 8 },
    { name: "Feb", value: 10 },
    { name: "Mar", value: 12 },
    { name: "Apr", value: 9 },
    { name: "May", value: 11 },
    { name: "Jun", value: 12 },
  ],
  oneYear: [
    { name: "Q1", value: 30 },
    { name: "Q2", value: 32 },
    { name: "Q3", value: 28 },
    { name: "Q4", value: 35 },
  ],
};

const driftIncidents = [
  { id: 1, model: "GPT-4 Production", type: "Data Drift", severity: "Critical", score: 0.45, date: "2024-12-28" },
  { id: 2, model: "Claude Enterprise", type: "Concept Drift", severity: "High", score: 0.32, date: "2024-12-27" },
  { id: 3, model: "Custom LLM v2", type: "Prediction Drift", severity: "Medium", score: 0.21, date: "2024-12-26" },
  { id: 4, model: "Gemini Pro", type: "Feature Drift", severity: "High", score: 0.28, date: "2024-12-25" },
  { id: 5, model: "Mistral 7B", type: "Data Drift", severity: "Low", score: 0.12, date: "2024-12-24" },
];

const chartColors = {
  analysis: ["#8b5cf6", "#ec4899"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

export default function DriftAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          Drift Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor model drift across your AI systems
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models Analyzed
            </div>
            <div className="text-4xl font-bold text-primary">
              {driftMetrics.totalModelsAnalyzed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models with Drift
            </div>
            <div className="text-4xl font-bold" style={{ color: "#ec4899" }}>
              {driftMetrics.modelsWithDrift}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Avg Drift Score
            </div>
            <div className="text-4xl font-bold" style={{ color: "#f59e0b" }}>
              {driftMetrics.averageDriftScore}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Critical Drifts
            </div>
            <div className="text-4xl font-bold text-destructive">
              {driftMetrics.criticalDrifts}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <PieChart data={driftAnalysisData} colors={chartColors.analysis} title="Drift Distribution" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart data={driftTrendData} color="#8b5cf6" title="Drift Detection Trend" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart data={driftSeverityData} colors={chartColors.severity} title="Drift by Severity" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle>Recent Drift Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Drift Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {driftIncidents.map((incident) => (
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
                    <td className="py-3 px-4 text-sm font-mono text-foreground">{incident.score}</td>
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
