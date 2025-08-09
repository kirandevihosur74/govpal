import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dept: string }> }
) {
  try {
    const { dept } = await params;
    
    // Load department manifest
    const manifest = getDepartmentManifest(dept);
    
    return NextResponse.json(manifest);
  } catch (error) {
    console.error('Manifest API error:', error);
    return NextResponse.json(
      { error: 'Failed to load manifest' },
      { status: 500 }
    );
  }
}

function getDepartmentManifest(dept: string) {
  const manifests: Record<string, any> = {
    'public-works': {
      name: "Public Works",
      description: "Infrastructure and city services management",
      widgets: [
        {
          id: "search",
          type: "search",
          title: "Asset Search",
          description: "Search through infrastructure assets",
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
          config: { placeholder: "Search assets, projects, reports..." },
          permissions: ["read"]
        },
        {
          id: "map",
          type: "map",
          title: "Infrastructure Map",
          description: "City infrastructure overview",
          position: { x: 6, y: 0 },
          size: { width: 6, height: 4 },
          config: { 
            center: [37.7749, -122.4194], 
            zoom: 12,
            layers: ["roads", "utilities", "projects"]
          },
          permissions: ["read"],
          roleOverrides: {
            "clerk": { size: { width: 0, height: 0 } }
          }
        },
        {
          id: "timeline",
          type: "timeline",
          title: "Project Timeline",
          description: "Infrastructure project progress",
          position: { x: 0, y: 3 },
          size: { width: 8, height: 2 },
          config: { 
            timeRange: "6months",
            projects: ["street_repair", "bridge_maintenance", "water_main"]
          },
          permissions: ["read"]
        },
        {
          id: "analytics",
          type: "analytics",
          title: "Department Metrics",
          description: "Performance and budget tracking",
          position: { x: 8, y: 3 },
          size: { width: 4, height: 2 },
          config: { 
            charts: ["budget", "completion_rate", "response_time"],
            refreshInterval: 300
          },
          permissions: ["read"]
        },
        {
          id: "work_orders",
          type: "work_orders",
          title: "Work Orders",
          description: "Active maintenance requests",
          position: { x: 0, y: 5 },
          size: { width: 12, height: 3 },
          config: { 
            statuses: ["pending", "in_progress", "completed"],
            priority: ["high", "medium", "low"]
          },
          permissions: ["read", "write"]
        }
      ],
      roles: {
        "planner": ["search", "map", "timeline", "analytics"],
        "clerk": ["search", "work_orders"],
        "supervisor": ["search", "map", "timeline", "analytics", "work_orders"]
      },
      theme: {
        primary: "#059669",
        secondary: "#10B981",
        icon: "🚧"
      }
    },
    
    'planning': {
      name: "Planning Department",
      description: "Urban planning and development oversight",
      widgets: [
        {
          id: "search",
          type: "search",
          title: "Zoning Search",
          description: "Search zoning codes and regulations",
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
          config: { placeholder: "Search zoning, permits, applications..." },
          permissions: ["read"]
        },
        {
          id: "map",
          type: "map",
          title: "Zoning Map",
          description: "City zoning and land use",
          position: { x: 6, y: 0 },
          size: { width: 6, height: 4 },
          config: { 
            center: [37.7749, -122.4194], 
            zoom: 11,
            layers: ["zoning", "parcels", "developments"]
          },
          permissions: ["read"]
        },
        {
          id: "applications",
          type: "applications",
          title: "Development Applications",
          description: "Planning permit applications",
          position: { x: 0, y: 3 },
          size: { width: 8, height: 3 },
          config: { 
            types: ["residential", "commercial", "industrial"],
            statuses: ["submitted", "review", "approved", "denied"]
          },
          permissions: ["read", "write"]
        },
        {
          id: "codebrowser",
          type: "codebrowser",
          title: "Planning Code",
          description: "Municipal planning regulations",
          position: { x: 8, y: 3 },
          size: { width: 4, height: 3 },
          config: { 
            sections: ["zoning", "subdivision", "environmental", "historic"]
          },
          permissions: ["read"]
        }
      ],
      roles: {
        "planner": ["search", "map", "applications", "codebrowser"],
        "clerk": ["search", "applications"],
        "supervisor": ["search", "map", "applications", "codebrowser"]
      },
      theme: {
        primary: "#7C3AED",
        secondary: "#8B5CF6",
        icon: "P"
      }
    },
    
    'finance': {
      name: "Finance Department",
      description: "Budget management and financial oversight",
      widgets: [
        {
          id: "search",
          type: "search",
          title: "Financial Search",
          description: "Search budgets and transactions",
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
          config: { placeholder: "Search budgets, invoices, reports..." },
          permissions: ["read"]
        },
        {
          id: "budget_overview",
          type: "budget",
          title: "Budget Overview",
          description: "City budget breakdown and tracking",
          position: { x: 6, y: 0 },
          size: { width: 6, height: 4 },
          config: { 
            fiscal_year: 2024,
            departments: ["public_works", "planning", "police", "fire"]
          },
          permissions: ["read"]
        },
        {
          id: "analytics",
          type: "analytics",
          title: "Financial Analytics",
          description: "Revenue and expense analysis",
          position: { x: 0, y: 3 },
          size: { width: 8, height: 3 },
          config: { 
            charts: ["revenue", "expenses", "variance", "forecast"],
            period: "quarterly"
          },
          permissions: ["read"]
        },
        {
          id: "approvals",
          type: "approvals",
          title: "Pending Approvals",
          description: "Financial approvals queue",
          position: { x: 8, y: 3 },
          size: { width: 4, height: 3 },
          config: { 
            types: ["purchase_orders", "invoices", "budget_changes"],
            thresholds: [1000, 5000, 25000]
          },
          permissions: ["read", "approve"],
          roleOverrides: {
            "clerk": { permissions: ["read"] }
          }
        }
      ],
      roles: {
        "planner": ["search", "budget_overview", "analytics"],
        "clerk": ["search", "approvals"],
        "supervisor": ["search", "budget_overview", "analytics", "approvals"]
      },
      theme: {
        primary: "#DC2626",
        secondary: "#EF4444",
        icon: "💰"
      }
    }
  };
  
  return manifests[dept] || manifests['public-works'];
}
