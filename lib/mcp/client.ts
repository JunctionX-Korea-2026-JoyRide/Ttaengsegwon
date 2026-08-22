import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

interface McpClientConfig {
  serverUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

class McpManager {
  private client: Client | null = null;
  private isConnected = false;

  private getConfig(): McpClientConfig {
    return {
      serverUrl: process.env.MCP_SERVER_URL,
      clientId: process.env.MCP_CLIENT_ID,
      clientSecret: process.env.MCP_CLIENT_SECRET,
    };
  }

  public async getClient(): Promise<Client | null> {
    const config = this.getConfig();
    if (!config.serverUrl) {
      return null;
    }

    if (this.client && this.isConnected) {
      return this.client;
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

      const transport = new SSEClientTransport(new URL(config.serverUrl));
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
