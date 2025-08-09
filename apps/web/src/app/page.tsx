"use client";

import { useState, useEffect } from "react";

interface WidgetManifest {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  permissions: string[];
  roleOverrides?: Record<string, Partial<WidgetManifest>>;
}

interface DepartmentManifest {
  name: string;
  description: string;
  widgets: WidgetManifest[];
  roles: Record<string, string[]>;
  theme: {
    primary: string;
    secondary: string;
    icon: string;
  };
}

interface UserAction {
  type: 'query' | 'click' | 'open_doc' | 'view_statute' | 'select_address';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UIAdaptation {
  id: string;
  trigger: string;
  action: string;
  timestamp: number;
  widgets_added: string[];
  widgets_removed: string[];
}

export default function Home() {
  // Dynamic UI state
  const [selectedDept, setSelectedDept] = useState<string>("public-works");
  const [selectedRole, setSelectedRole] = useState<string>("planner");
  const [manifest, setManifest] = useState<DepartmentManifest | null>(null);
  const [morphPrompt, setMorphPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  
  // Just-in-Time UI Adaptation
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [adaptations, setAdaptations] = useState<UIAdaptation[]>([]);
  const [dynamicWidgets, setDynamicWidgets] = useState<WidgetManifest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDocuments, setOpenDocuments] = useState<string[]>([]);
  const [currentStatute, setCurrentStatute] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load manifest data
  useEffect(() => {
    loadManifest(selectedDept);
  }, [selectedDept]);

  const loadManifest = async (dept: string) => {
    try {
      const response = await fetch(`/api/manifest/${dept}`);
      if (response.ok) {
        const manifestData = await response.json();
        setManifest(manifestData);
      } else {
        // Fallback to default manifest
        setManifest(createDefaultManifest(dept));
      }
    } catch (error) {
      console.error("Failed to load manifest:", error);
      setManifest(createDefaultManifest(dept));
    }
  };

  const createDefaultManifest = (dept: string): DepartmentManifest => {
    const deptConfig = {
      "public-works": {
        name: "Public Works",
        description: "Infrastructure and city services",
        icon: "🚧",
        primary: "#059669",
        secondary: "#10B981"
      },
      "planning": {
        name: "Planning",
        description: "City planning and development",
        icon: "🏗️",
        primary: "#7C3AED",
        secondary: "#8B5CF6"
      },
      "finance": {
        name: "Finance",
        description: "Budget and financial management",
        icon: "💰",
        primary: "#DC2626",
        secondary: "#EF4444"
      }
    };

    const config = deptConfig[dept as keyof typeof deptConfig] || deptConfig["public-works"];

    return {
      name: config.name,
      description: config.description,
      widgets: createDefaultWidgets(dept),
      roles: {
        "planner": ["map", "timeline", "analytics", "codebrowser"],
        "clerk": ["search", "forms"],
        "supervisor": ["map", "timeline", "analytics", "codebrowser", "reports", "admin"]
      },
      theme: {
        primary: config.primary,
        secondary: config.secondary,
        icon: config.icon
      }
    };
  };

  const createDefaultWidgets = (dept: string): WidgetManifest[] => {
    return [
      {
        id: "search",
        type: "search",
        title: "Document Search",
        description: "Search through department documents",
        position: { x: 0, y: 0 },
        size: { width: 6, height: 3 },
        config: { placeholder: "Search documents..." },
        permissions: ["read"]
      },
      {
        id: "map",
        type: "map",
        title: "City Map",
        description: "Interactive city map view",
        position: { x: 6, y: 0 },
        size: { width: 6, height: 4 },
        config: { center: [37.7749, -122.4194], zoom: 12 },
        permissions: ["read"],
        roleOverrides: {
          "clerk": { size: { width: 0, height: 0 } } // Hide for clerks
        }
      },
      {
        id: "timeline",
        type: "timeline",
        title: "Project Timeline",
        description: "Track project progress",
        position: { x: 0, y: 3 },
        size: { width: 12, height: 2 },
        config: { timeRange: "6months" },
        permissions: ["read"]
      },
      {
        id: "analytics",
        type: "analytics",
        title: "Department Analytics",
        description: "Key performance metrics",
        position: { x: 0, y: 5 },
        size: { width: 8, height: 3 },
        config: { charts: ["budget", "permits", "complaints"] },
        permissions: ["read"]
      },
      {
        id: "codebrowser",
        type: "codebrowser",
        title: "Code Browser",
        description: "Browse municipal codes and regulations",
        position: { x: 8, y: 5 },
        size: { width: 4, height: 3 },
        config: { sections: ["zoning", "building", "safety"] },
        permissions: ["read"]
      }
    ];
  };

  // MorphLLM integration
  const generateDynamicUI = async () => {
    if (!morphPrompt.trim()) return;

    setIsGenerating(true);
    setExecutionResult(null);

    try {
      // Generate code using MorphLLM
      const response = await fetch('/api/morph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: morphPrompt,
          context: {
            department: selectedDept,
            role: selectedRole,
            manifest: manifest
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate UI code');
      }

      const result = await response.json();
      setGeneratedCode(result.code);
      
      // Execute the generated code using Freestyle
      const execResponse = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: result.code })
      });

      if (!execResponse.ok) {
        throw new Error('Failed to execute generated code');
      }

      const execResult = await execResponse.json();
      setExecutionResult(execResult);

    } catch (error) {
      console.error('MorphLLM error:', error);
      setExecutionResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Search real government data
  const searchGovernmentData = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/government-data?q=${encodeURIComponent(query)}&dept=${selectedDept}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Track user actions for JIT adaptation
  const trackAction = (action: UserAction) => {
    setUserActions(prev => [...prev.slice(-9), action]); // Keep last 10 actions
    
    // Trigger immediate adaptation check
    setTimeout(() => checkForAdaptations([...userActions.slice(-9), action]), 100);
    
    // If it's a search query, also perform real search
    if (action.type === 'query' && action.content.trim()) {
      searchGovernmentData(action.content);
    }
  };

  // Check for adaptation triggers based on recent actions
  const checkForAdaptations = (actions: UserAction[]) => {
    const recentActions = actions.slice(-5); // Last 5 actions
    const now = Date.now();
    
    // Rule 1: If last 3 queries include two addresses → auto-inject Map + Timeline
    const addressQueries = recentActions.filter(a => 
      a.type === 'query' && /\d+\s+\w+\s+(street|st|avenue|ave|boulevard|blvd|road|rd)/i.test(a.content)
    );
    
    if (addressQueries.length >= 2 && !dynamicWidgets.find(w => w.id === 'adaptive_map')) {
      addAdaptiveWidget('adaptive_map', 'Address Pattern Detected', ['adaptive_map', 'adaptive_timeline']);
    }
    
    // Rule 2: If a statute is referenced → pin Code Browser
    const statuteActions = recentActions.filter(a => 
      (a.type === 'query' && /\b(section|code|statute|ordinance|§)\s*\d+/i.test(a.content)) ||
      a.type === 'view_statute'
    );
    
    if (statuteActions.length >= 1 && !dynamicWidgets.find(w => w.id === 'adaptive_codebrowser')) {
      addAdaptiveWidget('adaptive_codebrowser', 'Legal Reference Detected', ['adaptive_codebrowser']);
    }
    
    // Rule 3: If user opens 3+ docs → show Diff panel
    if (openDocuments.length >= 3 && !dynamicWidgets.find(w => w.id === 'adaptive_diff')) {
      addAdaptiveWidget('adaptive_diff', 'Multiple Documents Open', ['adaptive_diff']);
    }
    
    // Rule 4: Budget/financial queries → inject budget widget
    const budgetQueries = recentActions.filter(a =>
      a.type === 'query' && /\b(budget|cost|expense|revenue|financial|money|\$)\b/i.test(a.content)
    );
    
    if (budgetQueries.length >= 2 && !dynamicWidgets.find(w => w.id === 'adaptive_budget')) {
      addAdaptiveWidget('adaptive_budget', 'Financial Analysis Needed', ['adaptive_budget']);
    }
  };

  // Add adaptive widget and log the adaptation
  const addAdaptiveWidget = (widgetId: string, trigger: string, widgetIds: string[]) => {
    const adaptation: UIAdaptation = {
      id: `adapt_${Date.now()}`,
      trigger,
      action: `Auto-added ${widgetIds.join(', ')}`,
      timestamp: Date.now(),
      widgets_added: widgetIds,
      widgets_removed: []
    };
    
    setAdaptations(prev => [...prev, adaptation]);
    
    // Create the adaptive widgets
    const newWidgets = createAdaptiveWidgets(widgetIds);
    setDynamicWidgets(prev => [...prev, ...newWidgets]);
  };

  // Create adaptive widgets based on triggers
  const createAdaptiveWidgets = (widgetIds: string[]): WidgetManifest[] => {
    const widgets: WidgetManifest[] = [];
    
    if (widgetIds.includes('adaptive_map')) {
      widgets.push({
        id: 'adaptive_map',
        type: 'adaptive_map',
        title: '🎯 Auto-Generated Map',
        description: 'Triggered by address queries',
        position: { x: 6, y: 0 },
        size: { width: 6, height: 3 },
        config: { 
          addresses: userActions.filter(a => a.type === 'query').map(a => a.content),
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('adaptive_timeline')) {
      widgets.push({
        id: 'adaptive_timeline',
        type: 'adaptive_timeline',
        title: '📅 Auto-Generated Timeline',
        description: 'Triggered by location-based queries',
        position: { x: 0, y: 6 },
        size: { width: 12, height: 2 },
        config: { 
          focus: 'location_projects',
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('adaptive_codebrowser')) {
      widgets.push({
        id: 'adaptive_codebrowser',
        type: 'adaptive_codebrowser',
        title: '⚖️ Auto-Generated Code Browser',
        description: 'Triggered by legal references',
        position: { x: 8, y: 3 },
        size: { width: 4, height: 4 },
        config: { 
          highlighted_sections: currentStatute ? [currentStatute] : [],
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('adaptive_diff')) {
      widgets.push({
        id: 'adaptive_diff',
        type: 'adaptive_diff',
        title: '🔍 Auto-Generated Document Compare',
        description: 'Triggered by multiple open documents',
        position: { x: 0, y: 8 },
        size: { width: 12, height: 3 },
        config: { 
          documents: openDocuments,
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('adaptive_budget')) {
      widgets.push({
        id: 'adaptive_budget',
        type: 'adaptive_budget',
        title: '💰 Auto-Generated Budget Analysis',
        description: 'Triggered by financial queries',
        position: { x: 6, y: 3 },
        size: { width: 6, height: 3 },
        config: { 
          focus: 'query_analysis',
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    return widgets;
  };

  // Remove adaptive widget
  const removeAdaptiveWidget = (widgetId: string) => {
    setDynamicWidgets(prev => prev.filter(w => w.id !== widgetId));
    
    const adaptation: UIAdaptation = {
      id: `remove_${Date.now()}`,
      trigger: 'User dismissed',
      action: `Removed ${widgetId}`,
      timestamp: Date.now(),
      widgets_added: [],
      widgets_removed: [widgetId]
    };
    
    setAdaptations(prev => [...prev, adaptation]);
  };

  const getFilteredWidgets = () => {
    if (!manifest) return dynamicWidgets;
    
    const rolePermissions = manifest.roles[selectedRole] || [];
    
    const baseWidgets = manifest.widgets.filter(widget => {
      // Check if role has permission for this widget
      if (!rolePermissions.includes(widget.id)) return false;
      
      // Apply role overrides
      if (widget.roleOverrides && widget.roleOverrides[selectedRole]) {
        const override = widget.roleOverrides[selectedRole];
        // Hide widget if size is set to 0
        if (override.size && override.size.width === 0 && override.size.height === 0) {
          return false;
        }
      }
      
      return true;
    }).map(widget => {
      // Apply role overrides to visible widgets
      if (widget.roleOverrides && widget.roleOverrides[selectedRole]) {
        return { ...widget, ...widget.roleOverrides[selectedRole] };
      }
      return widget;
    });
    
    // Combine base widgets with dynamically added widgets
    return [...baseWidgets, ...dynamicWidgets];
  };

  const renderWidget = (widget: WidgetManifest) => {
    const widgetStyle = {
      gridColumn: `span ${widget.size.width}`,
      gridRow: `span ${widget.size.height}`,
      minHeight: `${widget.size.height * 100}px`
    };

    const isAdaptive = widget.config?.auto_generated;

    return (
      <div 
        key={widget.id} 
        className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-300 ${
          isAdaptive 
            ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 animate-pulse' 
            : 'border-gray-200'
        }`}
        style={widgetStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
            {isAdaptive && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                🤖 AI Added
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getWidgetIcon(widget.type)}</span>
            {isAdaptive && (
              <button
                onClick={() => removeAdaptiveWidget(widget.id)}
                className="text-gray-400 hover:text-red-500 text-sm"
                title="Remove adaptive widget"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {widget.description && (
          <p className="text-sm text-gray-600 mb-4">{widget.description}</p>
        )}
        
        <div className="h-full">
          {renderWidgetContent(widget)}
        </div>
      </div>
    );
  };

  const getWidgetIcon = (type: string) => {
    const icons: Record<string, string> = {
      search: "🔍",
      map: "🗺️",
      timeline: "📅",
      analytics: "📊",
      codebrowser: "📚",
      forms: "📝",
      reports: "📄",
      admin: "⚙️"
    };
    return icons[type] || "📦";
  };

  const renderWidgetContent = (widget: WidgetManifest) => {
    switch (widget.type) {
      case "search":
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  trackAction({
                    type: 'query',
                    content: e.target.value,
                    timestamp: Date.now()
                  });
                }}
                placeholder={widget.config.placeholder || "Search..."}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            
            {searchQuery && searchResults.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="text-xs text-gray-600 font-medium">
                  🏛️ San Francisco Open Data ({searchResults.length} results)
                </div>
                {searchResults.map((result, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer"
                       onClick={() => {
                         trackAction({ type: 'open_doc', content: result.title, timestamp: Date.now() });
                         setOpenDocuments(prev => [...prev, result.id]);
                       }}>
                    <div className="font-medium text-sm text-gray-900">{result.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{result.content.substring(0, 100)}...</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {result.metadata.dept}
                      </span>
                      <span className="text-xs text-gray-500">
                        Score: {(result.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                🎯 Try: "building permits", "zoning applications", or "budget 2024"
              </div>
            )}
          </div>
        );
      
      case "map":
        return (
          <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-lg h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm text-gray-600">Interactive Map View</p>
              <p className="text-xs text-gray-500">
                Center: {widget.config.center?.join(", ")} | Zoom: {widget.config.zoom}
              </p>
            </div>
          </div>
        );
      
      case "timeline":
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Projects Timeline</span>
              <span className="text-xs text-gray-500">{widget.config.timeRange}</span>
            </div>
            <div className="space-y-2">
              {["Street Repair Project", "New Park Development", "Water Main Upgrade"].map((project, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">{project}</span>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "analytics":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {widget.config.charts?.map((chart: string, idx: number) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {["85%", "$2.4M", "127"][idx]}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">{chart}</div>
                </div>
              ))}
            </div>
            <div className="h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-sm text-gray-600">📈 Chart Visualization</span>
            </div>
          </div>
        );
      
      case "codebrowser":
        return (
          <div className="space-y-3">
            {widget.config.sections?.map((section: string, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div className="font-medium text-sm capitalize">{section} Code</div>
                <div className="text-xs text-gray-500">Municipal regulations and statutes</div>
              </div>
            ))}
          </div>
        );
      
      // Adaptive widget types
      case "adaptive_map":
        return (
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm text-gray-700 font-medium">AI-Generated Map</p>
              <p className="text-xs text-gray-600 mt-1">
                Showing: {widget.config.addresses?.slice(-2).join(", ") || "Address locations"}
              </p>
            </div>
          </div>
        );

      case "adaptive_timeline":
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">🎯 Location-Based Projects</span>
              <span className="text-xs text-purple-600">AI Generated</span>
            </div>
            <div className="space-y-2">
              {["Street Infrastructure at Main St", "Utilities Update - Downtown", "Permits Filed - Residential"].map((project, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">{project}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "adaptive_codebrowser":
        return (
          <div className="space-y-3">
            <div className="text-xs text-purple-600 mb-2">🎯 AI Detected Legal References</div>
            {["Section 15.2 - Zoning Requirements", "Ordinance 2024-01 - Building Codes", "Statute § 125.3 - Permits"].map((section, idx) => (
              <div key={idx} className="border border-purple-200 rounded-lg p-3 hover:bg-purple-50 cursor-pointer">
                <div className="font-medium text-sm">{section}</div>
                <div className="text-xs text-gray-500">Referenced in recent queries</div>
              </div>
            ))}
          </div>
        );

      case "adaptive_diff":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">🎯 AI Document Comparison</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-purple-200 rounded p-3">
                <div className="text-sm font-medium">Document A</div>
                <div className="text-xs text-gray-500">Building Permit #2024-001</div>
              </div>
              <div className="border border-purple-200 rounded p-3">
                <div className="text-sm font-medium">Document B</div>
                <div className="text-xs text-gray-500">Zoning Application #2024-015</div>
              </div>
            </div>
            <div className="text-sm text-purple-700">🔍 Comparing regulatory compliance...</div>
          </div>
        );

      case "adaptive_budget":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">🎯 AI Financial Analysis</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">$1.2M</div>
                <div className="text-xs text-gray-600">Project Budget</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">15%</div>
                <div className="text-xs text-gray-600">Under Budget</div>
              </div>
            </div>
            <div className="text-sm text-purple-700">💡 Based on your financial queries</div>
          </div>
        );
      
      default:
        return (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-sm">Widget content for {widget.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ 
                    background: manifest?.theme ? `linear-gradient(135deg, ${manifest.theme.primary}, ${manifest.theme.secondary})` : 'linear-gradient(135deg, #3B82F6, #6366F1)'
                  }}
                >
                  {manifest?.theme?.icon || 'G'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    GovPal
                  </h1>
                  <p className="text-sm text-gray-600">Dynamic Government UI</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="planner">👨‍💼 Planner</option>
                <option value="clerk">📋 Clerk</option>
                <option value="supervisor">👩‍💼 Supervisor</option>
              </select>
              
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="public-works">🚧 Public Works</option>
                <option value="planning">🏗️ Planning</option>
                <option value="finance">💰 Finance</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Department Header */}
        {manifest && (
          <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl"
                style={{ 
                  background: `linear-gradient(135deg, ${manifest.theme.primary}, ${manifest.theme.secondary})`
                }}
              >
                {manifest.theme.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{manifest.name}</h2>
                <p className="text-gray-600">{manifest.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Role: <span className="font-medium">{selectedRole}</span> • 
                  Widgets: <span className="font-medium">{getFilteredWidgets().length}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MorphLLM Interface */}
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            🧠 MorphLLM - Dynamic UI Generator
          </h3>
          <div className="space-y-4">
            <textarea
              value={morphPrompt}
              onChange={(e) => setMorphPrompt(e.target.value)}
              placeholder="Describe how you want to modify the UI... (e.g., 'Add a budget widget for finance department' or 'Show permit status dashboard')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Current context: {manifest?.name} department, {selectedRole} role
              </div>
              <button
                onClick={generateDynamicUI}
                disabled={isGenerating || !morphPrompt.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? "Generating..." : "Generate UI"}
              </button>
            </div>
          </div>
          
          {/* Generated Code & Results */}
          {(generatedCode || executionResult) && (
            <div className="mt-6 space-y-4">
              {generatedCode && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Generated Code:</h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {generatedCode}
                  </pre>
                </div>
              )}
              
              {executionResult && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Execution Result:</h4>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    {executionResult.error ? (
                      <div className="text-red-600">❌ Error: {executionResult.error}</div>
                    ) : (
                      <div className="text-green-600">✅ Success: {JSON.stringify(executionResult, null, 2)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Widget Grid */}
        <div className="grid grid-cols-12 gap-6 auto-rows-min">
          {getFilteredWidgets().map(renderWidget)}
        </div>

        {/* Just-in-Time UI Adaptation Demo */}
        <div className="mt-8 space-y-6">
          {/* Demo Simulation Buttons */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 Just-in-Time UI Adaptation Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  trackAction({ type: 'query', content: '123 Main Street permits', timestamp: Date.now() });
                  setTimeout(() => trackAction({ type: 'query', content: '456 Oak Avenue zoning', timestamp: Date.now() }), 500);
                }}
                className="bg-white p-4 rounded-lg border border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="text-2xl mb-2">🗺️</div>
                <div className="text-sm font-medium">Trigger Map</div>
                <div className="text-xs text-gray-600">Query 2 addresses</div>
              </button>

              <button
                onClick={() => {
                  trackAction({ type: 'query', content: 'section 15.2 zoning code', timestamp: Date.now() });
                  setCurrentStatute('section-15.2');
                }}
                className="bg-white p-4 rounded-lg border border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="text-2xl mb-2">⚖️</div>
                <div className="text-sm font-medium">Trigger Code Browser</div>
                <div className="text-xs text-gray-600">Reference statute</div>
              </button>

              <button
                onClick={() => {
                  setOpenDocuments(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
                  setTimeout(() => checkForAdaptations(userActions), 100);
                }}
                className="bg-white p-4 rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm font-medium">Trigger Diff Panel</div>
                <div className="text-xs text-gray-600">Open 3 documents</div>
              </button>

              <button
                onClick={() => {
                  trackAction({ type: 'query', content: 'budget analysis $500k', timestamp: Date.now() });
                  setTimeout(() => trackAction({ type: 'query', content: 'financial report expenses', timestamp: Date.now() }), 500);
                }}
                className="bg-white p-4 rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="text-sm font-medium">Trigger Budget Widget</div>
                <div className="text-xs text-gray-600">Ask financial questions</div>
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              🎯 These buttons simulate user behavior patterns that trigger automatic UI adaptations.
            </div>
          </div>

          {/* Adaptation Log */}
          {adaptations.length > 0 && (
            <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 UI Adaptation Log</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {adaptations.slice(-5).reverse().map((adaptation) => (
                  <div key={adaptation.id} className="bg-white p-4 rounded-lg border border-yellow-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{adaptation.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(adaptation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Trigger:</span> {adaptation.trigger}
                    </div>
                    {adaptation.widgets_added.length > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        ✅ Added: {adaptation.widgets_added.join(', ')}
                      </div>
                    )}
                    {adaptation.widgets_removed.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        ❌ Removed: {adaptation.widgets_removed.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Demonstration */}
          <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎭 Role-Based UI Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["planner", "clerk", "supervisor"].map((role) => (
                <div key={role} className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium capitalize mb-2">{role}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {manifest?.roles[role]?.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              💡 Switch roles above to see how the UI adapts dynamically. Try the demo buttons to see AI-powered just-in-time adaptations!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}