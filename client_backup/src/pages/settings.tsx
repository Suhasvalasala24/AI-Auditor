import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();

  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
    webhook: false,
    emailAddress: "",
    slackWebhook: "",
    webhookUrl: "",
  });

  const [thresholds, setThresholds] = useState({
    piiSensitivity: "medium",
    driftThreshold: "0.1",
    biasThreshold: "0.05",
    hallucinationThreshold: "0.15",
  });

  const [integrations, setIntegrations] = useState({
    openai: "",
    anthropic: "",
    gemini: "",
  });

  const handleSaveNotifications = () => {
    toast({ title: "Notification settings saved" });
  };

  const handleSaveThresholds = () => {
    toast({ title: "Threshold settings saved" });
  };

  const handleSaveIntegrations = () => {
    toast({ title: "Integration settings saved" });
  };

  return (
    <div className="p-6">
      <div className="mb-8 pb-4 border-b-2 border-border">
        <h1
          className="text-3xl font-bold text-foreground"
          data-testid="text-page-title"
        >
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configure your AI Auditor preferences and integrations
        </p>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="mb-8">
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="thresholds" data-testid="tab-thresholds">
            Audit Thresholds
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            Model Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive audit results and alerts via email
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                  data-testid="switch-email-notifications"
                />
              </div>

              {notifications.email && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={notifications.emailAddress}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        emailAddress: e.target.value,
                      })
                    }
                    placeholder="you@company.com"
                    data-testid="input-email-address"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Slack Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send audit alerts to a Slack channel
                  </p>
                </div>
                <Switch
                  checked={notifications.slack}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, slack: checked })
                  }
                  data-testid="switch-slack-notifications"
                />
              </div>

              {notifications.slack && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label>Slack Webhook URL</Label>
                  <Input
                    type="url"
                    value={notifications.slackWebhook}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        slackWebhook: e.target.value,
                      })
                    }
                    placeholder="https://hooks.slack.com/services/..."
                    data-testid="input-slack-webhook"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Webhook Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send audit data to a custom webhook endpoint
                  </p>
                </div>
                <Switch
                  checked={notifications.webhook}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, webhook: checked })
                  }
                  data-testid="switch-webhook-notifications"
                />
              </div>

              {notifications.webhook && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label>Webhook URL</Label>
                  <Input
                    type="url"
                    value={notifications.webhookUrl}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        webhookUrl: e.target.value,
                      })
                    }
                    placeholder="https://your-api.com/webhook"
                    data-testid="input-webhook-url"
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveNotifications}
                  data-testid="button-save-notifications"
                >
                  Save Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <CardTitle>Audit Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>PII Detection Sensitivity</Label>
                <Select
                  value={thresholds.piiSensitivity}
                  onValueChange={(value) =>
                    setThresholds({ ...thresholds, piiSensitivity: value })
                  }
                >
                  <SelectTrigger data-testid="select-pii-sensitivity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher sensitivity detects more potential PII but may have
                  more false positives
                </p>
              </div>

              <div className="space-y-2">
                <Label>Drift Detection Threshold</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={thresholds.driftThreshold}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      driftThreshold: e.target.value,
                    })
                  }
                  data-testid="input-drift-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Distribution change threshold for flagging model drift (0-1)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bias Detection Threshold</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={thresholds.biasThreshold}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      biasThreshold: e.target.value,
                    })
                  }
                  data-testid="input-bias-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Statistical significance threshold for bias detection (0-1)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Hallucination Detection Threshold</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={thresholds.hallucinationThreshold}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      hallucinationThreshold: e.target.value,
                    })
                  }
                  data-testid="input-hallucination-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Confidence threshold for hallucination flagging (0-1)
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveThresholds}
                  data-testid="button-save-thresholds"
                >
                  Save Thresholds
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Model Provider Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  value={integrations.openai}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, openai: e.target.value })
                  }
                  placeholder="sk-..."
                  data-testid="input-openai-key"
                />
                <p className="text-xs text-muted-foreground">
                  Required for auditing GPT models
                </p>
              </div>

              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <Input
                  type="password"
                  value={integrations.anthropic}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      anthropic: e.target.value,
                    })
                  }
                  placeholder="sk-ant-..."
                  data-testid="input-anthropic-key"
                />
                <p className="text-xs text-muted-foreground">
                  Required for auditing Claude models
                </p>
              </div>

              <div className="space-y-2">
                <Label>Google AI API Key</Label>
                <Input
                  type="password"
                  value={integrations.gemini}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, gemini: e.target.value })
                  }
                  placeholder="AIza..."
                  data-testid="input-gemini-key"
                />
                <p className="text-xs text-muted-foreground">
                  Required for auditing Gemini models
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveIntegrations}
                  data-testid="button-save-integrations"
                >
                  Save Integrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
