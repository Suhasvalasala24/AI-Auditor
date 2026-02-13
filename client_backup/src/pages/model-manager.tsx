import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, Info, MoreVertical, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomModel, SystemModel } from "@shared/schema";

const systemModels: SystemModel[] = [
  { id: "1", name: "Grok 4 Fast", icon: "X" },
  { id: "2", name: "GPT-5", icon: "GPT" },
  { id: "3", name: "GPT-5 Mini", icon: "GPT" },
  { id: "4", name: "GPT-5 Nano", icon: "GPT" },
  { id: "5", name: "Grok 4 (0709)", icon: "X" },
  { id: "6", name: "Grok 3 Mini Fast", icon: "X" },
  { id: "7", name: "Gemini 2.5 Flash", icon: "G" },
  { id: "8", name: "Gemini 2.5 Flash Lite", icon: "G" },
  { id: "9", name: "Gemini 2.5 Pro", icon: "G" },
  { id: "10", name: "Grok 3 Fast", icon: "X" },
  { id: "11", name: "Claude Opus 4", icon: "C" },
  { id: "12", name: "Claude Sonnet 4", icon: "C" },
  { id: "13", name: "Gemini 2.5 Flash Preview 04-17", icon: "G" },
  { id: "14", name: "o4 mini", icon: "O" },
  { id: "15", name: "GPT-4.1", icon: "GPT" },
  { id: "16", name: "GPT-4.1 Mini", icon: "GPT" },
  { id: "17", name: "o3", icon: "O" },
  { id: "18", name: "O3 Mini", icon: "O" },
  { id: "19", name: "O1", icon: "O" },
  { id: "20", name: "O1 Mini", icon: "O" },
  { id: "21", name: "o1Pro", icon: "O" },
  { id: "22", name: "Claude Sonnet 3.7", icon: "C" },
  { id: "23", name: "Grok 3", icon: "X" },
  { id: "24", name: "Grok 3 Mini", icon: "X" },
  { id: "25", name: "Mistral Small 2503", icon: "M" },
  { id: "26", name: "Mistral Small 2501", icon: "M" },
  { id: "27", name: "Codestral 2501", icon: "M" },
  { id: "28", name: "Gemini 2.0 Flash 001", icon: "G" },
  { id: "29", name: "Llama 3.3 70B", icon: "L" },
  { id: "30", name: "Llama 3.3 8B", icon: "L" },
  { id: "31", name: "Gemini 2.0 Flash", icon: "G" },
  { id: "32", name: "Gemini 2.0 Flash-Lite", icon: "G" },
];

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function ModelManager() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const [formData, setFormData] = useState({
    nickname: "",
    apiUrl: "",
    apiKey: "",
    provider: "",
    description: "",
    temperature: 0.7,
    maxTokens: "",
    topP: 1.0,
    seed: "",
  });

  const { data: customModels = [], isLoading } = useQuery<CustomModel[]>({
    queryKey: ["/api/models"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/models", {
        nickname: data.nickname,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey || undefined,
        provider: data.provider || undefined,
        description: data.description || undefined,
        temperature: data.temperature !== undefined ? String(data.temperature) : undefined,
        maxTokens: data.maxTokens || undefined,
        topP: data.topP !== undefined ? String(data.topP) : undefined,
        seed: data.seed || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Model added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add model", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Model deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete model", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      nickname: "",
      apiUrl: "",
      apiKey: "",
      provider: "",
      description: "",
      temperature: 0.7,
      maxTokens: "",
      topP: 1.0,
      seed: "",
    });
    setShowAdditionalDetails(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nickname || !formData.apiUrl) {
      toast({
        title: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6">
      <div className="mb-8 pb-4 border-b-2 border-border">
        <h1
          className="text-3xl font-bold text-foreground"
          data-testid="text-page-title"
        >
          Model Manager
        </h1>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Custom Models
          </h2>
          <InfoTooltip content="Manage your custom AI models with personalized configurations" />
        </div>

        {customModels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {customModels.map((model) => (
              <Card key={model.id} data-testid={`card-model-${model.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      {model.nickname}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {model.provider || "Custom"}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-model-menu-${model.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(model.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full border-dashed h-14 text-muted-foreground"
          onClick={() => setIsModalOpen(true)}
          data-testid="button-add-custom-model"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add custom model
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            System Models
          </h2>
          <InfoTooltip content="Pre-configured system models available for auditing" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {systemModels.map((model) => (
            <Card
              key={model.id}
              className="hover-elevate cursor-pointer"
              data-testid={`card-system-model-${model.id}`}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {model.icon}
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {model.name}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add custom model
              <InfoTooltip content="Add a new custom model with your own API configuration" />
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Model Nickname <span className="text-destructive">*</span>
                <InfoTooltip content="A friendly name to identify this custom model" />
              </Label>
              <Input
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                placeholder="My Custom Model"
                data-testid="input-model-nickname"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                API URL <span className="text-destructive">*</span>
                <InfoTooltip content="The endpoint URL for your custom model API" />
              </Label>
              <Input
                value={formData.apiUrl}
                onChange={(e) =>
                  setFormData({ ...formData, apiUrl: e.target.value })
                }
                placeholder="https://api.example.com/v1/chat"
                data-testid="input-model-api-url"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                API Key
                <InfoTooltip content="Your API key for authentication (optional)" />
              </Label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                placeholder="sk-..."
                data-testid="input-model-api-key"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Provider
                <InfoTooltip content="The model provider (OpenAI, Anthropic, etc.)" />
              </Label>
              <Input
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                placeholder="OpenAI, Anthropic, Custom..."
                data-testid="input-model-provider"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Description
                <InfoTooltip content="Optional description of this model's purpose" />
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this model is used for..."
                data-testid="input-model-description"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
              className="text-sm"
              data-testid="button-toggle-additional"
            >
              {showAdditionalDetails ? "Hide" : "Show"} additional settings
            </Button>

            {showAdditionalDetails && (
              <div className="space-y-5 pt-2 border-t border-border">
                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    Temperature: {formData.temperature}
                    <InfoTooltip content="Controls randomness in the model's output (0-1)" />
                  </Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([value]) =>
                      setFormData({ ...formData, temperature: value })
                    }
                    max={1}
                    step={0.1}
                    data-testid="slider-temperature"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Max Tokens
                    <InfoTooltip content="Maximum number of tokens to generate" />
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTokens: e.target.value })
                    }
                    placeholder="4096"
                    data-testid="input-max-tokens"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    Top P: {formData.topP}
                    <InfoTooltip content="Controls diversity via nucleus sampling (0-1)" />
                  </Label>
                  <Slider
                    value={[formData.topP]}
                    onValueChange={([value]) =>
                      setFormData({ ...formData, topP: value })
                    }
                    max={1}
                    step={0.1}
                    data-testid="slider-top-p"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Seed
                    <InfoTooltip content="Random seed for reproducible outputs" />
                  </Label>
                  <Input
                    type="number"
                    value={formData.seed}
                    onChange={(e) =>
                      setFormData({ ...formData, seed: e.target.value })
                    }
                    placeholder="42"
                    data-testid="input-seed"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-model"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-save-model"
              >
                {createMutation.isPending ? "Adding..." : "Add Model"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
