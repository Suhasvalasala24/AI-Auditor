import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const hallucinationMetrics = {
  totalModelsAnalyzed: 38,
  modelsHallucinating: 7,
  averageHallucinationRate: 0.15,
  criticalCases: 1,
};

const hallucinationAnalysisData: ChartDataPoint[] = [
  { name: "No Hallucination", value: 31 },
  { name: "Hallucinating", value: 7 },
];

const hallucinationSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 1 },
  { name: "High", value: 2 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const hallucinationTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 1 },
    { name: "Week 2", value: 2 },
    { name: "Week 3", value: 2 },
    { name: "Week 4", value: 2 },
  ],
  sixMonths: [
    { name: "Jan", value: 4 },
    { name: "Feb", value: 5 },
    { name: "Mar", value: 6 },
    { name: "Apr", value: 5 },
    { name: "May", value: 7 },
    { name: "Jun", value: 7 },
  ],
  oneYear: [
    { name: "Q1", value: 15 },
    { name: "Q2", value: 17 },
    { name: "Q3", value: 18 },
    { name: "Q4", value: 21 },
  ],
};

const hallucinationIncidents = [
  { id: 1, model: "GPT-4 Production", type: "Factual Error", severity: "Critical", confidence: 0.92, date: "2024-12-28" },
  { id: 2, model: "Claude Enterprise", type: "Citation Fabrication", severity: "High", confidence: 0.85, date: "2024-12-27" },
  { id: 3, model: "Custom LLM v2", type: "Knowledge Conflation", severity: "Medium", confidence: 0.72, date: "2024-12-26" },
  { id: 4, model: "Gemini Pro", type: "Temporal Confusion", severity: "High", confidence: 0.78, date: "2024-12-25" },
  { id: 5, model: "Mistral 7B", type: "Entity Confusion", severity: "Low", confidence: 0.65, date: "2024-12-24" },
];

const chartColors = {
  analysis: ["#06b6d4", "#14b8a6"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

export default function HallucinationAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          Hallucination Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Detect and track model hallucinations and factual errors
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models Analyzed
            </div>
            <div className="text-4xl font-bold text-primary">
              {hallucinationMetrics.totalModelsAnalyzed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Models Hallucinating
            </div>
            <div className="text-4xl font-bold" style={{ color: "#14b8a6" }}>
              {hallucinationMetrics.modelsHallucinating}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Avg Hallucination Rate
            </div>
            <div className="text-4xl font-bold" style={{ color: "#06b6d4" }}>
              {(hallucinationMetrics.averageHallucinationRate * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Critical Cases
            </div>
            <div className="text-4xl font-bold text-destructive">
              {hallucinationMetrics.criticalCases}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <PieChart data={hallucinationAnalysisData} colors={chartColors.analysis} title="Hallucination Distribution" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart data={hallucinationTrendData} color="#06b6d4" title="Hallucination Trend" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart data={hallucinationSeverityData} colors={chartColors.severity} title="Hallucination by Severity" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle>Recent Hallucination Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Confidence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {hallucinationIncidents.map((incident) => (
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
                    <td className="py-3 px-4 text-sm font-mono text-foreground">{(incident.confidence * 100).toFixed(0)}%</td>
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
