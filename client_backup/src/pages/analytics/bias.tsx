import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const biasMetrics = {
  totalModelsAnalyzed: 40,
  modelsWithBias: 9,
  averageBiasScore: 0.18,
  criticalBiases: 2,
};

const biasAnalysisData: ChartDataPoint[] = [
  { name: "No Bias", value: 31 },
  { name: "With Bias", value: 9 },
];

const biasSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 2 },
  { name: "High", value: 3 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const biasTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 1 },
    { name: "Week 2", value: 3 },
    { name: "Week 3", value: 2 },
    { name: "Week 4", value: 3 },
  ],
  sixMonths: [
    { name: "Jan", value: 5 },
    { name: "Feb", value: 7 },
    { name: "Mar", value: 8 },
    { name: "Apr", value: 6 },
    { name: "May", value: 9 },
    { name: "Jun", value: 9 },
  ],
  oneYear: [
    { name: "Q1", value: 20 },
    { name: "Q2", value: 24 },
    { name: "Q3", value: 22 },
    { name: "Q4", value: 27 },
  ],
};

const biasIncidents = [
  { id: 1, model: "GPT-4 Production", type: "Gender Bias", severity: "Critical", category: "Demographic", date: "2024-12-28" },
  { id: 2, model: "Claude Enterprise", type: "Age Bias", severity: "High", category: "Demographic", date: "2024-12-27" },
  { id: 3, model: "Custom LLM v2", type: "Racial Bias", severity: "Critical", category: "Demographic", date: "2024-12-26" },
  { id: 4, model: "Gemini Pro", type: "Confirmation Bias", severity: "Medium", category: "Cognitive", date: "2024-12-25" },
  { id: 5, model: "Mistral 7B", type: "Selection Bias", severity: "Low", category: "Data", date: "2024-12-24" },
];

const chartColors = {
  analysis: ["#f59e0b", "#ef4444"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

export default function BiasAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          Bias Detection
        </h1>
        <p className="text-sm text-muted-foreground">
          Identify and monitor bias in your AI models
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models Analyzed
            </div>
            <div className="text-4xl font-bold text-primary">
              {biasMetrics.totalModelsAnalyzed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models with Bias
            </div>
            <div className="text-4xl font-bold" style={{ color: "#ef4444" }}>
              {biasMetrics.modelsWithBias}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Avg Bias Score
            </div>
            <div className="text-4xl font-bold" style={{ color: "#f59e0b" }}>
              {biasMetrics.averageBiasScore}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Critical Biases
            </div>
            <div className="text-4xl font-bold text-destructive">
              {biasMetrics.criticalBiases}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <PieChart data={biasAnalysisData} colors={chartColors.analysis} title="Bias Distribution" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart data={biasTrendData} color="#f59e0b" title="Bias Detection Trend" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart data={biasSeverityData} colors={chartColors.severity} title="Bias by Severity" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle>Recent Bias Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Bias Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {biasIncidents.map((incident) => (
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
                    <td className="py-3 px-4 text-sm text-muted-foreground">{incident.category}</td>
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
