import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function createMCPServer(mcpHandlers) {
  // Create MCP server
  const server = new Server(
    {
      name: 'social-media-content-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Add debug logging
  console.error('MCP Server initializing...');

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      return await mcpHandlers.handleToolsList();
    } catch (error) {
      console.error('Error in tools/list handler:', error);
      throw error;
    }
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return await mcpHandlers.handleToolCall(name, args);
    } catch (error) {
      console.error(`Error in tool call ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  });

  return server;
} 