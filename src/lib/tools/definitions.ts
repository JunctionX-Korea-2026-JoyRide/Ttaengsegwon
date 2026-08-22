import { ToolDefinition } from "@/types";

export const DOMAIN_TOOLS: ToolDefinition[] = [
  {
    name: "search_nearby_facilities",
    description:
      "Search for convenience facilities (cafes, marts, hospitals, gyms, pharmacies) near a given location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
        category: {
          type: "string",
          description:
            "Facility category (e.g. cafe, mart, hospital, gym, pharmacy)",
        },
        radiusMeter: {
          type: "number",
          description: "Search radius in meters (default 500m)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_public_transport",
    description:
      "Get public transportation information (subway stations, bus stops) near the target location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
        radiusMeter: {
          type: "number",
          description: "Search radius in meters (default 1000m)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_safety_facilities",
    description:
      "Retrieve safety indicators including CCTV counts, police station proximity, and street lighting status.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "analyze_area",
    description:
      "Comprehensive living quality and convenience analysis for a residential location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_places",
    description:
      "Search for places, shops, cafes, restaurants, or amenities using keyword and optional location (e.g. '성수역 카페', '강남 맛집'). Returns real coordinates and place information for map rendering.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword or place category (e.g., '조용한 카페', '한식당', '약국')",
        },
        location: {
          type: "string",
          description: "Reference location, station, or neighborhood (e.g., '성수역', '역삼동', '홍대입구')",
        },
        radius: {
          type: "number",
          description: "Search radius in meters (optional, default 1000)",
        },
      },
      required: ["query"],
    },
  },
];

