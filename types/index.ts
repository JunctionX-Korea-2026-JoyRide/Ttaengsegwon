export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  data?: AnalysisResult;
  createdAt: string;
}

export interface FacilityInfo {
  name: string;
  category: string;
  distanceMeter: number;
  address?: string;
}

export interface TransportInfo {
  stationName: string;
  line: string;
  distanceMeter: number;
  walkingMinutes: number;
}

export interface SafetyInfo {
  cctvCount: number;
  policeStationDistanceMeter: number;
  streetLightDensity: "low" | "medium" | "high";
  safetyScore: number;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  transport?: {
    score: number;
    nearestStations: TransportInfo[];
  };
  safety?: SafetyInfo;
  facilities?: FacilityInfo[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

export interface ChatApiRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

export interface ChatApiResponse {
  message: string;
  data?: AnalysisResult;
}
