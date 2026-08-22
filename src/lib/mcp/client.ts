import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

interface McpClientConfig {
  serverUrl?: string;
  clientId?: string;
  clientSecret?: string;
  gyeongbukMcpDir?: string;
}

class McpManager {
  private client: Client | null = null;
  private isConnected = false;

  private getConfig(): McpClientConfig {
    return {
      serverUrl: process.env.MCP_SERVER_URL,
      clientId: process.env.MCP_CLIENT_ID,
      clientSecret: process.env.MCP_CLIENT_SECRET,
      gyeongbukMcpDir: process.env.GYEONGBUK_MCP_DIR,
    };
  }

  private createTransport(config: McpClientConfig): Transport | null {
    // 로컬 stdio MCP 서버 (gyeongbuk-mcp, uv/fastmcp 기반)
    if (config.gyeongbukMcpDir) {
      return new StdioClientTransport({
        command: "uv",
        args: [
          "--directory",
          config.gyeongbukMcpDir,
          "run",
          "fastmcp",
          "run",
          "src/server.py",
        ],
      });
    }

    // 원격 SSE MCP 서버
    if (config.serverUrl) {
      return new SSEClientTransport(new URL(config.serverUrl));
    }

    return null;
  }

  public async getClient(): Promise<Client | null> {
    const config = this.getConfig();

    if (this.client && this.isConnected) {
      return this.client;
    }

    const transport = this.createTransport(config);
    if (!transport) {
      return null;
    }

    try {
      const client = new Client(
        {
          name: "ttaengsegwon-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);

      this.client = client;
      this.isConnected = true;
      return this.client;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      this.isConnected = false;
      this.client = null;
      return null;
    }
  }

  public async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("MCP client is not connected");
    }

    return await client.callTool({
      name,
      arguments: args,
    });
  }
}

export const mcpManager = new McpManager();

/**
 * MCP callTool 결과에서 실제 JSON 데이터를 꺼낸다.
 * FastMCP는 structuredContent에 파싱된 객체를 함께 담아 보내므로 이를 우선 사용하고,
 * 없으면 content[0].text(JSON 문자열)를 파싱한다. 순수 fallback 객체는 그대로 반환한다.
 */
export function extractToolPayload(result: unknown): unknown {
  if (!result || typeof result !== "object") {
    return result;
  }

  const record = result as Record<string, unknown>;

  if (record.structuredContent && typeof record.structuredContent === "object") {
    return record.structuredContent;
  }

  if (Array.isArray(record.content)) {
    const textPart = record.content.find(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
    );

    if (textPart) {
      try {
        return JSON.parse(textPart.text);
      } catch {
        return textPart.text;
      }
    }
  }

  return result;
}
