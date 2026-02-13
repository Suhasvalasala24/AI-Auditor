import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Model = {
  id: number;
  model_id: string;
  name: string;
};

type Audit = {
  audit_id: string;
  model_name?: string;
  audit_result: string;
  executed_at: string;
};

export default function Audits() {
  const [selectedModel, setSelectedModel] = useState<string>("");

  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ["models"],
    queryFn: () => apiGet("/models"),
  });

  const { data: audits = [], refetch } = useQuery<Audit[]>({
    queryKey: ["audits"],
    queryFn: () => apiGet("/audits"),
  });

  const triggerAudit = async () => {
    if (!selectedModel) return;
    await apiPost(`/audits/trigger/${selectedModel}`);
    refetch();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audits</h1>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <select
              className="border px-3 py-2 rounded"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="">Select model</option>
              {models.map((m) => (
                <option key={m.id} value={m.model_id}>
                  {m.name}
                </option>
              ))}
            </select>

            <Button onClick={triggerAudit}>
              Trigger Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="font-semibold mb-4">Audit History</h2>

      <div className="space-y-3">
        {audits.map((audit) => (
          <Card key={audit.audit_id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <div className="font-medium">{audit.model_name}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(audit.executed_at).toLocaleString()}
                </div>
              </div>
              <div className="font-semibold">
                {audit.audit_result}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
