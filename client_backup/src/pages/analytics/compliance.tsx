import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const complianceMetrics = {
  overallScore: 82,
  gdprScore: 88,
  ccpaScore: 79,
  hipaaScore: 75,
};

const complianceDistributionData: ChartDataPoint[] = [
  { name: "Compliant", value: 35 },
  { name: "Partial", value: 8 },
  { name: "Non-Compliant", value: 4 },
];

const complianceByFrameworkData: ChartDataPoint[] = [
  { name: "GDPR", value: 88 },
  { name: "CCPA", value: 79 },
  { name: "HIPAA", value: 75 },
  { name: "SOC2", value: 92 },
];

const complianceTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 78 },
    { name: "Week 2", value: 80 },
    { name: "Week 3", value: 79 },
    { name: "Week 4", value: 82 },
  ],
  sixMonths: [
    { name: "Jan", value: 72 },
    { name: "Feb", value: 74 },
    { name: "Mar", value: 76 },
    { name: "Apr", value: 78 },
    { name: "May", value: 80 },
    { name: "Jun", value: 82 },
  ],
  oneYear: [
    { name: "Q1", value: 68 },
    { name: "Q2", value: 73 },
    { name: "Q3", value: 78 },
    { name: "Q4", value: 82 },
  ],
};

const complianceIssues = [
  { id: 1, model: "GPT-4 Production", framework: "GDPR", issue: "Data Retention", status: "Open", priority: "High" },
  { id: 2, model: "Claude Enterprise", framework: "HIPAA", issue: "PHI Exposure", status: "In Progress", priority: "Critical" },
  { id: 3, model: "Custom LLM v2", framework: "CCPA", issue: "Consent Missing", status: "Open", priority: "Medium" },
  { id: 4, model: "Gemini Pro", framework: "SOC2", issue: "Audit Logging", status: "Resolved", priority: "Low" },
  { id: 5, model: "Mistral 7B", framework: "GDPR", issue: "Right to Erasure", status: "In Progress", priority: "High" },
];

const chartColors = {
  distribution: ["#10b981", "#f59e0b", "#ef4444"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

function ComplianceScoreCard({ title, score }: { title: string; score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {title}
        </div>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold" style={{ color: getScoreColor(score) }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground mb-1">/ 100</span>
        </div>
        <Progress value={score} className="h-2" />
      </CardContent>
    </Card>
  );
}

export default function ComplianceAnalytics() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          Compliance Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Track regulatory compliance across your AI systems
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ComplianceScoreCard title="Overall Compliance" score={complianceMetrics.overallScore} />
        <ComplianceScoreCard title="GDPR Score" score={complianceMetrics.gdprScore} />
        <ComplianceScoreCard title="CCPA Score" score={complianceMetrics.ccpaScore} />
        <ComplianceScoreCard title="HIPAA Score" score={complianceMetrics.hipaaScore} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <PieChart data={complianceDistributionData} colors={chartColors.distribution} title="Compliance Status" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart data={complianceTrendData} color="#10b981" title="Compliance Score Trend" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Compliance by Framework</h3>
            <div className="space-y-4">
              {complianceByFrameworkData.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle>Compliance Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Framework</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Issue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {complianceIssues.map((issue) => (
                  <tr key={issue.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{issue.model}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{issue.framework}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{issue.issue}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        issue.status === "Resolved" ? "default" :
                        issue.status === "In Progress" ? "secondary" : "outline"
                      }>
                        {issue.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        issue.priority === "Critical" ? "destructive" :
                        issue.priority === "High" ? "default" :
                        issue.priority === "Medium" ? "secondary" : "outline"
                      }>
                        {issue.priority}
                      </Badge>
                    </td>
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
