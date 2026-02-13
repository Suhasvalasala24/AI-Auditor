import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import { apiGet } from "@/lib/api";
import type { ChartDataPoint, TrendData } from "@/types/dashboard";

/* -----------------------------
   BACKEND MODEL TYPE
-------------------------------- */
type BackendModel = {
  id: number;
  model_id: string;
  name: string;
  version: string;
  last_audit_status?: string | null;
};

/* -----------------------------
   SAFE PLACEHOLDER CHART DATA
-------------------------------- */
const emptyPie: ChartDataPoint[] = [{ name: "No data", value: 1 }];

const emptyTrend: TrendData = {
  oneMonth: [],
  sixMonths: [],
  oneYear: [],
};

/* -----------------------------
   UI COMPONENTS
-------------------------------- */
function MetricCard({
  label,
  value,
  suffix = "",
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          {label}
        </div>
        <div className="text-4xl font-bold" style={{ color }}>
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold mb-6 pb-3 border-b">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
}

/* -----------------------------
   DASHBOARD
-------------------------------- */
export default function Dashboard() {
  const [models, setModels] = useState<BackendModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<BackendModel[]>("/models")
      .then(setModels)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Backend error: {error}
      </div>
    );
  }

  const totalModels = models.length;
  const activeModels = models.filter(
    (m) => m.last_audit_status !== null
  ).length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-8">
        AI Model Monitoring Overview
      </p>

      {/* METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total Models"
          value={totalModels}
          color="#3b82f6"
        />
        <MetricCard
          label="Active Models"
          value={activeModels}
          color="#10b981"
        />
        <MetricCard
          label="AI Risk Score"
          value={0}
          suffix="/100"
          color="#f59e0b"
        />
        <MetricCard
          label="Compliance Score"
          value={0}
          suffix="%"
          color="#8b5cf6"
        />
      </div>

      {/* CONNECTED MODELS */}
      <Section title="Connected Models">
        {models.length === 0 && (
          <div className="text-muted-foreground">
            No models registered yet
          </div>
        )}

        {models.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="font-semibold">{m.name}</div>
              <div className="text-sm text-muted-foreground">
                {m.model_id} · v{m.version}
              </div>
              <div className="text-sm">
                Status: {m.last_audit_status ?? "Not audited"}
              </div>
            </CardContent>
          </Card>
        ))}
      </Section>

      {/* PLACEHOLDER CHARTS */}
      <Section title="PII Monitoring">
        <Card>
          <CardContent>
            <PieChart
              data={emptyPie}
              colors={["#ccc"]}
              title="PII Leaks"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <BarChart
              data={emptyTrend}
              color="#ccc"
              title="PII Trend"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <PieChart
              data={emptyPie}
              colors={["#ccc"]}
              title="Severity"
            />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
