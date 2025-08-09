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
  // Unique ID generator to prevent duplicate keys
  const generateUniqueId = (prefix: string) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  
  // Document Upload & Analysis
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Project Analysis
  const [projectProposal, setProjectProposal] = useState<any>(null);
  const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
  
  // File Preview Modal
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);

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
        icon: "PW",
        primary: "#059669",
        secondary: "#10B981"
      },
      "planning": {
        name: "Planning",
        description: "City planning and development",
        icon: "P",
        primary: "#7C3AED",
        secondary: "#8B5CF6"
      },
      "finance": {
        name: "Finance",
        description: "Budget and financial management",
        icon: "F",
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
          "planner": ["search", "map", "timeline", "analytics", "codebrowser"],
          "clerk": ["search", "forms"],
          "supervisor": ["search", "map", "timeline", "analytics", "codebrowser", "reports", "admin"]
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
  const searchGovernmentData = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalResults(0);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/government-data?q=${encodeURIComponent(query)}&dept=${selectedDept}&limit=${resultsPerPage}&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.total || 0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Document Upload & Analysis
  const handleDocumentUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/document-analysis', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newDocs = result.results.filter((r: any) => r.status === 'success');
        setUploadedDocuments(prev => [...prev, ...newDocs]);
        
        // Auto-adapt UI based on document categories
        adaptUIBasedOnDocuments(newDocs);
        
        // Track document upload action
        trackAction({
          type: 'open_doc',
          content: `Uploaded ${newDocs.length} documents`,
          timestamp: Date.now(),
          metadata: { categories: newDocs.map((d: any) => d.analysis.category) }
        });
      }
    } catch (error) {
      console.error('Document analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const adaptUIBasedOnDocuments = (documents: any[]) => {
    const categories = documents.map(doc => doc.analysis.category);
    const recommendedWidgets = documents.flatMap(doc => doc.analysis.recommended_widgets);
    
    // Group documents by category for smart widget injection
    const categoryGroups = categories.reduce((acc: Record<string, number>, cat: string) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    // Auto-inject widgets based on document categories
    if (categoryGroups.building_permit >= 1) {
      addDocumentAdaptiveWidget('permit_tracker', 'Building Permits Detected', ['permit_tracker', 'property_map']);
    }
    
    if (categoryGroups.zoning_application >= 1) {
      addDocumentAdaptiveWidget('zoning_map', 'Zoning Applications Detected', ['zoning_map', 'code_browser']);
    }
    
    if (categoryGroups.contract >= 1) {
      addDocumentAdaptiveWidget('contract_monitor', 'Contracts Detected', ['contract_monitor', 'vendor_tracker']);
    }
    
    if (categoryGroups.insurance >= 1) {
      addDocumentAdaptiveWidget('insurance_tracker', 'Insurance Documents Detected', ['insurance_tracker', 'expiration_monitor']);
    }

    // Flag high-risk documents
    const flaggedDocs = documents.filter(doc => 
      doc.analysis.flags.requires_attention || 
      doc.analysis.flags.is_outdated ||
      doc.analysis.flags.risk_level === 'high'
    );
    
    if (flaggedDocs.length > 0) {
      addDocumentAdaptiveWidget('document_alerts', 'High-Risk Documents Flagged', ['document_alerts', 'compliance_checker']);
    }

    // Generate project proposal analysis
    generateProjectProposal(documents);
  };

  const generateProjectProposal = (documents: any[]) => {
    if (documents.length === 0) return;

    const categories = documents.map(doc => doc.analysis.category);
    const flaggedDocs = documents.filter(doc => 
      doc.analysis.flags.requires_attention || 
      doc.analysis.flags.is_outdated ||
      doc.analysis.flags.risk_level === 'high'
    );

    const projectFiles = {
      permits: documents.filter(doc => doc.analysis.category === 'building_permit'),
      zoning: documents.filter(doc => doc.analysis.category === 'zoning_application'),
      contracts: documents.filter(doc => doc.analysis.category === 'contract'),
      insurance: documents.filter(doc => doc.analysis.category === 'insurance'),
      other: documents.filter(doc => !['building_permit', 'zoning_application', 'contract', 'insurance'].includes(doc.analysis.category))
    };

    // Determine project type based on documents
    let projectType = 'General Project';
    let projectDescription = '';
    
    if (projectFiles.permits.length > 0 && projectFiles.zoning.length > 0) {
      projectType = 'Development Project';
      projectDescription = 'Construction/development project with permits and zoning applications';
    } else if (projectFiles.permits.length > 0) {
      projectType = 'Building Project';
      projectDescription = 'Building permit project requiring construction oversight';
    } else if (projectFiles.contracts.length > 0) {
      projectType = 'Service Contract Project';
      projectDescription = 'Service delivery project with contractual obligations';
    } else if (projectFiles.zoning.length > 0) {
      projectType = 'Planning Project';
      projectDescription = 'Zoning and planning review project';
    }

    const proposal = {
      id: generateUniqueId('PROJ'),
      type: projectType,
      description: projectDescription,
      created: new Date().toISOString(),
      status: flaggedDocs.length > 0 ? 'Needs Review' : 'Ready for Processing',
      files: {
        total: documents.length,
        permits: projectFiles.permits,
        zoning: projectFiles.zoning,
        contracts: projectFiles.contracts,
        insurance: projectFiles.insurance,
        other: projectFiles.other
      },
      flagged_documents: flaggedDocs,
      risk_assessment: {
        level: flaggedDocs.length > 2 ? 'high' : flaggedDocs.length > 0 ? 'medium' : 'low',
        issues: flaggedDocs.map(doc => ({
          file: doc.filename,
          issue: doc.analysis.flags.is_outdated ? 'Document Expired' : 
                 doc.analysis.flags.requires_attention ? 'Requires Attention' : 'High Risk',
          priority: doc.analysis.flags.risk_level
        }))
      },
      next_steps: generateNextSteps(projectFiles, flaggedDocs)
    };

    setProjectProposal(proposal);
    setShowProjectAnalysis(true);
  };

  const generateNextSteps = (projectFiles: any, flaggedDocs: any[]) => {
    const steps = [];
    
    if (flaggedDocs.length > 0) {
      steps.push('Address flagged documents before proceeding');
    }
    
    if (projectFiles.permits.length > 0) {
      steps.push('Review building permit applications');
      steps.push('Schedule inspections if approved');
    }
    
    if (projectFiles.zoning.length > 0) {
      steps.push('Review zoning compliance');
      steps.push('Schedule planning commission hearing');
    }
    
    if (projectFiles.contracts.length > 0) {
      steps.push('Verify contract terms and conditions');
      steps.push('Set up payment schedule');
    }
    
    if (projectFiles.insurance.length > 0) {
      steps.push('Verify insurance coverage');
      steps.push('Set renewal reminders');
    }

    return steps.length > 0 ? steps : ['All documents ready for processing'];
  };

  // File Preview Functions
  const openFilePreview = (file: any) => {
    setPreviewFile(file);
    setShowFilePreview(true);
  };

  const closeFilePreview = () => {
    setShowFilePreview(false);
    setPreviewFile(null);
  };

  const downloadFile = (file: any) => {
    // Get document content based on category
    let content = '';
    
    // Handle San Francisco Open Data results
    if (file.metadata && file.metadata.source === 'SF Open Data') {
      content = `SAN FRANCISCO OPEN DATA RECORD

Title: ${file.title}
Dataset: ${file.metadata.dataset}
Department: ${file.metadata.dept}
Source: ${file.metadata.source}
Last Updated: ${file.metadata.last_updated}
Relevance Score: ${(file.score * 100).toFixed(0)}%

RECORD DETAILS:
${file.content}

RAW DATA:
${JSON.stringify(file.raw_data, null, 2)}

This data was retrieved from the San Francisco Open Data Portal.
For more information, visit: ${file.path}`;
    } else if (file.analysis && file.analysis.category === 'building_permit') {
      content = `BUILDING PERMIT APPLICATION

Application Number: BP-2024-1234
Property Address: 123 Main Street, San Francisco, CA 94102
Applicant: John Developer
Project Description: Single family residence renovation
Permit Type: Building Permit
Application Date: 2024-01-15
Estimated Cost: $150,000
Contractor: ABC Construction Company
Contact: john@developer.com
Status: Under Review

WORK DESCRIPTION:
- Kitchen renovation including new appliances
- Bathroom modernization with accessibility features  
- Structural modifications to living area
- Electrical upgrades to code compliance
- Plumbing updates for new fixtures

REQUIRED INSPECTIONS:
[ ] Foundation inspection
[ ] Framing inspection  
[ ] Electrical rough-in
[ ] Plumbing rough-in
[ ] Insulation inspection
[ ] Final inspection

FEES PAID: $2,500
INSURANCE: Certificate on file
CONTRACTOR LICENSE: Verified #ABC123`;
    } else if (file.analysis.category === 'zoning_application') {
      content = `ZONING APPLICATION

Case Number: ZA-2024-5678
Property: 456 Oak Avenue, San Francisco, CA 94110
Applicant: Jane Property Owner
Request: Conditional Use Authorization for Restaurant
Zoning District: Neighborhood Commercial
Application Date: 2024-02-01
Hearing Date: 2024-03-15
Planning Commission Review Required
Environmental Review: Categorical Exemption

PROJECT DESCRIPTION:
Conversion of existing retail space to full-service restaurant.
Proposed seating capacity: 45 patrons
Operating hours: 7:00 AM - 10:00 PM
Type of service: Table service with limited takeout

ZONING ANALYSIS:
- Current zoning: NC-1 (Neighborhood Commercial)
- Proposed use: Restaurant (conditional use)
- Parking requirements: 1 space per 250 sq ft
- Available parking: 8 spaces on-site
- Compliance status: Requires conditional use permit

PUBLIC NOTIFICATION:
[ ] Property owners within 300 feet notified
[ ] Neighborhood associations contacted
[ ] Public hearing notice posted`;
    } else if (file.analysis.category === 'contract') {
      content = `CITY CONTRACT AGREEMENT

Contract Number: CT-2024-9876
Contractor: XYZ Services LLC
Department: Public Works
Service: Street Maintenance Services
Contract Amount: $500,000
Start Date: 2024-01-01
End Date: 2024-12-31
Insurance Required: $1,000,000 General Liability
Performance Bond: Required

SCOPE OF WORK:
- Pothole repair and street resurfacing
- Sidewalk maintenance and ADA compliance
- Storm drain cleaning and maintenance
- Street sweeping services
- Emergency response for weather events

PAYMENT TERMS:
Monthly invoicing based on completed work
Net 30 days payment terms
10% retention until final completion
Performance incentives for early completion

INSURANCE REQUIREMENTS:
- General Liability: $1,000,000
- Workers Compensation: As required by law
- Automobile Liability: $1,000,000
- Additional Insured: City and County of San Francisco

CONTRACT STATUS: ACTIVE`;
    } else if (file.analysis.category === 'insurance') {
      content = `INSURANCE CERTIFICATE

Policy Number: INS-2022-4567
Insured: City Contractor ABC
Insurance Company: State Insurance Co.
Coverage Type: General Liability
Coverage Amount: $2,000,000
Effective Date: 2022-01-01
Expiration Date: 2022-12-31
Additional Insured: City and County of San Francisco
Certificate Holder: Department of Public Works

STATUS: EXPIRED - REQUIRES RENEWAL

COVERAGE DETAILS:
- General Liability: $2,000,000 per occurrence
- Products/Completed Operations: $2,000,000 aggregate
- Personal & Advertising Injury: $1,000,000 per occurrence
- Medical Expenses: $10,000 per person

DEDUCTIBLES:
- General Liability: $5,000
- Property Damage: $2,500

SPECIAL CONDITIONS:
- Waiver of subrogation in favor of City
- Primary and non-contributory coverage
- 30-day cancellation notice required

RENEWAL ACTION REQUIRED:
This certificate expired on 2022-12-31.
Contact insurance provider immediately for renewal.
Work may not proceed without valid insurance.`;
    } else {
      content = `Document: ${file.filename}

Category: ${file.analysis.subcategory}
Analysis Confidence: ${(file.analysis.confidence * 100).toFixed(0)}%
Risk Level: ${file.analysis.flags.risk_level}

Summary: ${file.analysis.summary}

Key Information:
${file.analysis.key_data.dates.length > 0 ? `Dates: ${file.analysis.key_data.dates.join(', ')}` : ''}
${file.analysis.key_data.amounts.length > 0 ? `Amounts: ${file.analysis.key_data.amounts.join(', ')}` : ''}
${file.analysis.key_data.addresses.length > 0 ? `Addresses: ${file.analysis.key_data.addresses.join(', ')}` : ''}
${file.analysis.key_data.reference_numbers.length > 0 ? `Reference Numbers: ${file.analysis.key_data.reference_numbers.join(', ')}` : ''}

This document has been processed and categorized for government workflow management.`;
    }

    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Use original filename or create a clean filename
    let cleanFilename;
    if (file.metadata && file.metadata.source === 'SF Open Data') {
      // Create meaningful filename for SF Open Data results
      const datasetName = file.metadata.dataset.replace(/[^a-zA-Z0-9]/g, '_');
      const deptName = file.metadata.dept.replace(/[^a-zA-Z0-9]/g, '_');
      const titleSlug = file.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      cleanFilename = `SF_${deptName}_${datasetName}_${titleSlug}`;
    } else {
      cleanFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
    
    link.download = cleanFilename.endsWith('.txt') ? cleanFilename : `${cleanFilename}.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const addDocumentAdaptiveWidget = (widgetId: string, trigger: string, widgetIds: string[]) => {
    // Check if widget already exists
    if (dynamicWidgets.find(w => w.id === widgetId)) return;
    
    const adaptation: UIAdaptation = {
      id: generateUniqueId('doc_adapt'),
      trigger,
      action: `Auto-added ${widgetIds.join(', ')} based on document analysis`,
      timestamp: Date.now(),
      widgets_added: widgetIds,
      widgets_removed: []
    };
    
    setAdaptations(prev => [...prev, adaptation]);
    
    const newWidgets = createDocumentAdaptiveWidgets(widgetIds);
    setDynamicWidgets(prev => [...prev, ...newWidgets]);
  };

  const createDocumentAdaptiveWidgets = (widgetIds: string[]): WidgetManifest[] => {
    const widgets: WidgetManifest[] = [];
    
    if (widgetIds.includes('permit_tracker')) {
      widgets.push({
        id: 'permit_tracker',
        type: 'permit_tracker',
        title: 'Auto-Generated Permit Tracker',
        description: 'Triggered by building permit uploads',
        position: { x: 0, y: 6 },
        size: { width: 8, height: 3 },
        config: { 
          documents: uploadedDocuments.filter(d => d.analysis.category === 'building_permit'),
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('contract_monitor')) {
      widgets.push({
        id: 'contract_monitor',
        type: 'contract_monitor',
        title: 'Auto-Generated Contract Monitor',
        description: 'Triggered by contract uploads',
        position: { x: 8, y: 6 },
        size: { width: 4, height: 3 },
        config: { 
          contracts: uploadedDocuments.filter(d => d.analysis.category === 'contract'),
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('insurance_tracker')) {
      widgets.push({
        id: 'insurance_tracker',
        type: 'insurance_tracker',
        title: 'Auto-Generated Insurance Tracker',
        description: 'Triggered by insurance document uploads',
        position: { x: 0, y: 9 },
        size: { width: 6, height: 3 },
        config: { 
          insurance_docs: uploadedDocuments.filter(d => d.analysis.category === 'insurance'),
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    if (widgetIds.includes('document_alerts')) {
      widgets.push({
        id: 'document_alerts',
        type: 'document_alerts',
        title: 'Document Alert System',
        description: 'Triggered by high-risk document detection',
        position: { x: 6, y: 9 },
        size: { width: 6, height: 3 },
        config: { 
          flagged_docs: uploadedDocuments.filter(d => 
            d.analysis.flags.requires_attention || 
            d.analysis.flags.is_outdated ||
            d.analysis.flags.risk_level === 'high'
          ),
          auto_generated: true
        },
        permissions: ['read']
      });
    }
    
    return widgets;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocumentUpload(e.dataTransfer.files);
    }
  };

  // Track user actions for JIT adaptation
  const trackAction = (action: UserAction) => {
    setUserActions(prev => [...prev.slice(-9), action]); // Keep last 10 actions
    
    // Trigger immediate adaptation check
    setTimeout(() => checkForAdaptations([...userActions.slice(-9), action]), 100);
    
    // If it's a search query, also perform real search
    if (action.type === 'query' && action.content.trim()) {
      setCurrentPage(1); // Reset to first page for new search
      searchGovernmentData(action.content, 1);
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
      id: generateUniqueId('adapt'),
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
        title: 'Auto-Generated Map',
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
        title: 'Auto-Generated Timeline',
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
        title: 'Auto-Generated Code Browser',
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
        title: 'Auto-Generated Document Compare',
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
        title: 'Auto-Generated Budget Analysis',
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
      id: generateUniqueId('remove'),
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
AI Added
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
      search: "S",
      map: "M",
      timeline: "T",
      analytics: "A",
      codebrowser: "C",
      forms: "F",
      reports: "R",
      admin: "G"
    };
    return icons[type] || "W";
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPage(1);
                    searchGovernmentData(searchQuery, 1);
                  }
                }}
                placeholder={widget.config.placeholder || "Search..."}
                className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  setCurrentPage(1);
                  searchGovernmentData(searchQuery, 1);
                }}
                disabled={!searchQuery.trim() || isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#0A355C] text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
            
            {searchQuery && searchResults.length > 0 ? (
              <div className="space-y-3">
                {/* Results Header with Results Per Page Selector */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600 font-medium">
                    San Francisco Open Data ({totalResults} total results)
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Results per page:</span>
                    <select
                      value={resultsPerPage}
                      onChange={(e) => handleResultsPerPageChange(parseInt(e.target.value))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                
                {/* Search Results */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <div key={result.id || `search_${idx}`} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                      <div className="font-medium text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                           onClick={() => {
                             trackAction({ type: 'open_doc', content: result.title, timestamp: Date.now() });
                             setOpenDocuments(prev => [...prev, result.id]);
                           }}>
                        {result.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{result.content.substring(0, 100)}...</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {result.metadata.dept}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {(result.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openFilePreview(result)}
                            className="text-xs bg-[#F0F2F5] hover:bg-gray-200 text-[#0A355C] px-2 py-1 rounded transition-colors"
                            title="Preview details"
                          >
                            Preview
                          </button>
                          <button 
                            onClick={() => downloadFile(result)}
                            className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                            title="Download data"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-[#0A355C] text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage >= totalPages}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Try: "building permits", "zoning applications", or "budget 2024"
              </div>
            )}
          </div>
        );
      
      case "map":
        return (
          <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-lg h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
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
              <div className="w-16 h-16 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
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
              <span className="text-sm font-medium">Location-Based Projects</span>
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
            <div className="text-xs text-purple-600 mb-2">AI Detected Legal References</div>
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
            <div className="text-xs text-purple-600 mb-2">AI Document Comparison</div>
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
            <div className="text-sm text-purple-700">Comparing regulatory compliance...</div>
          </div>
        );

      case "adaptive_budget":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">AI Financial Analysis</div>
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
            <div className="text-sm text-purple-700">Based on your financial queries</div>
          </div>
        );

      // Document-based adaptive widgets
      case "permit_tracker":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">Permit Analysis from Uploaded Documents</div>
            {widget.config.documents?.slice(0, 3).map((doc: any, idx: number) => (
              <div key={`${doc.filename}_${idx}`} className="border border-purple-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">{doc.analysis.subcategory}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.analysis.flags.risk_level === 'high' ? 'bg-red-100 text-red-700' : 
                    doc.analysis.flags.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {doc.analysis.flags.risk_level} risk
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">{doc.filename}</div>
                <div className="text-xs text-gray-700">{doc.analysis.summary}</div>
                {doc.analysis.key_data.reference_numbers.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    Ref: {doc.analysis.key_data.reference_numbers[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "contract_monitor":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">Contract Analysis from Uploaded Documents</div>
            {widget.config.contracts?.slice(0, 2).map((doc: any, idx: number) => (
              <div key={`${doc.filename}_${idx}`} className="border border-purple-200 rounded-lg p-3">
                <div className="font-medium text-sm mb-1">{doc.analysis.subcategory}</div>
                <div className="text-xs text-gray-600 mb-2">{doc.filename}</div>
                {doc.analysis.key_data.amounts.length > 0 && (
                  <div className="text-sm font-bold text-green-600 mb-1">
                    Value: {doc.analysis.key_data.amounts[0]}
                  </div>
                )}
                {doc.analysis.flags.is_contract && (
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded inline-block">
                    Active Contract
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "insurance_tracker":
        return (
          <div className="space-y-4">
            <div className="text-xs text-purple-600 mb-2">Insurance Analysis from Uploaded Documents</div>
            {widget.config.insurance_docs?.slice(0, 2).map((doc: any, idx: number) => (
              <div key={`${doc.filename}_${idx}`} className="border border-purple-200 rounded-lg p-3">
                <div className="font-medium text-sm mb-1">{doc.analysis.subcategory}</div>
                <div className="text-xs text-gray-600 mb-2">{doc.filename}</div>
                {doc.analysis.flags.expiration_date && (
                  <div className="text-xs text-orange-600 mb-1">
                    Expires: {doc.analysis.flags.expiration_date}
                  </div>
                )}
                {doc.analysis.key_data.amounts.length > 0 && (
                  <div className="text-xs text-green-600">
                    Coverage: {doc.analysis.key_data.amounts[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "document_alerts":
        return (
          <div className="space-y-4">
            <div className="text-xs text-red-600 mb-2">High-Risk Document Alerts</div>
            {widget.config.flagged_docs?.slice(0, 3).map((doc: any, idx: number) => (
              <div key={`${doc.filename}_${idx}`} className="border border-red-200 rounded-lg p-3 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm text-red-900">{doc.analysis.subcategory}</div>
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                    {doc.analysis.flags.is_outdated ? 'OUTDATED' : 'ATTENTION'}
                  </span>
                </div>
                <div className="text-xs text-red-700 mb-1">{doc.filename}</div>
                <div className="text-xs text-red-600">{doc.analysis.summary}</div>
                {doc.analysis.flags.is_outdated && (
                  <div className="text-xs text-red-800 mt-1 font-medium">
                    Document may be outdated - review required
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm">Widget content for {widget.type}</p>
          </div>
        );
    }
  };

  // Pagination helper functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      searchGovernmentData(searchQuery, page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleResultsPerPageChange = (newLimit: number) => {
    setResultsPerPage(newLimit);
    setCurrentPage(1);
    searchGovernmentData(searchQuery, 1);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-[#0A355C]"
                >
                  G
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#0A355C]">
                    GovPal
                  </h1>
                  <p className="text-sm text-gray-600">Professional Government Interface</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A355C] bg-white text-[#0A355C]"
              >
                <option value="planner">Planner</option>
                <option value="clerk">Clerk</option>
                <option value="supervisor">Supervisor</option>
              </select>
              
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A355C] bg-white text-[#0A355C]"
              >
                <option value="public-works">Public Works</option>
                <option value="planning">Planning</option>
                <option value="finance">Finance</option>
              </select>
        </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Department Header */}
        {manifest && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl bg-[#0A355C]"
              >
                {manifest.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0A355C]">{manifest.name}</h2>
                <p className="text-gray-600">{manifest.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Role: <span className="font-medium">{selectedRole}</span> • 
                  Widgets: <span className="font-medium">{getFilteredWidgets().length}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload Interface */}
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-[#0A355C] mb-4">
            Document Analysis & Processing
          </h3>
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
              dragActive 
                ? "border-[#0A355C] bg-[#F0F2F5] scale-105" 
                : "border-gray-300 hover:border-[#0A355C] hover:bg-[#F0F2F5]"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = '.pdf,.docx,.doc,.txt';
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) handleDocumentUpload(files);
              };
              input.click();
            }}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#0A355C] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-[#0A355C]">
                Upload Government Documents
              </div>
              <div className="text-sm text-gray-600">
                Documents will be automatically categorized and processed for workflow management
              </div>
              <div className="text-xs text-gray-500">
                Supported formats: PDF, DOCX, DOC, TXT
              </div>
              {isAnalyzing && (
                <div className="flex items-center justify-center space-x-2 text-[#0A355C]">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0A355C]"></div>
                  <span>Processing documents...</span>
                </div>
              )}
            </div>
          </div>
          
          {uploadedDocuments.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-[#0A355C] mb-3">
                Document Analysis Results ({uploadedDocuments.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                {uploadedDocuments.map((doc, idx) => (
                  <div key={doc.filename || `doc_${idx}`} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-gray-900 truncate">{doc.filename}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        doc.analysis.flags.risk_level === 'high' ? 'bg-red-100 text-red-700' : 
                        doc.analysis.flags.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {doc.analysis.confidence > 0.8 ? 'High' : 'Medium'} Confidence
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Category: <span className="font-medium">{doc.analysis.subcategory}</span>
                    </div>
                    <div className="text-xs text-gray-700 mb-2">{doc.analysis.summary}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {doc.analysis.flags.is_outdated && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">OUTDATED</span>
                      )}
                      {doc.analysis.flags.is_contract && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">CONTRACT</span>
                      )}
                      {doc.analysis.flags.is_insurance && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">INSURANCE</span>
                      )}
                    </div>
                                        <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-[#0A355C]">
                        Automated widgets: {doc.analysis.recommended_widgets.slice(0, 2).join(', ')}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openFilePreview(doc)}
                          className="text-xs bg-[#F0F2F5] hover:bg-gray-200 text-[#0A355C] px-2 py-1 rounded transition-colors"
                        >
                          Preview
                        </button>
                        <button 
                          onClick={() => downloadFile(doc)}
                          className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Project Analysis Box */}
        {showProjectAnalysis && projectProposal && (
          <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
Project Analysis: {projectProposal.type}
              </h3>
              <button
                onClick={() => setShowProjectAnalysis(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Overview */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-gray-900 mb-2">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">ID:</span> {projectProposal.id}</div>
                    <div><span className="font-medium">Type:</span> {projectProposal.type}</div>
                    <div><span className="font-medium">Description:</span> {projectProposal.description}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        projectProposal.status === 'Needs Review' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {projectProposal.status}
                      </span>
                    </div>
                    <div><span className="font-medium">Risk Level:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        projectProposal.risk_assessment.level === 'high' ? 'bg-red-100 text-red-700' :
                        projectProposal.risk_assessment.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {projectProposal.risk_assessment.level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project Files by Category */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-[#0A355C] mb-3">Project Files ({projectProposal.files.total})</h4>
                  <div className="space-y-3">
                    {projectProposal.files.permits.length > 0 && (
                      <div>
                        <div className="font-medium text-sm text-[#0A355C] mb-1">Building Permits ({projectProposal.files.permits.length})</div>
                        {projectProposal.files.permits.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pl-4 py-1 hover:bg-gray-50 rounded">
                            <span 
                              className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 flex-1"
                              onClick={() => openFilePreview(file)}
                            >
                              • {file.filename}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
                              title="Download file"
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {projectProposal.files.zoning.length > 0 && (
                      <div>
                        <div className="font-medium text-sm text-[#0A355C] mb-1">Zoning Applications ({projectProposal.files.zoning.length})</div>
                        {projectProposal.files.zoning.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pl-4 py-1 hover:bg-gray-50 rounded">
                            <span 
                              className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 flex-1"
                              onClick={() => openFilePreview(file)}
                            >
                              • {file.filename}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
                              title="Download file"
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {projectProposal.files.contracts.length > 0 && (
                      <div>
                        <div className="font-medium text-sm text-[#0A355C] mb-1">Contracts ({projectProposal.files.contracts.length})</div>
                        {projectProposal.files.contracts.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pl-4 py-1 hover:bg-gray-50 rounded">
                            <span 
                              className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 flex-1"
                              onClick={() => openFilePreview(file)}
                            >
                              • {file.filename}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
                              title="Download file"
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {projectProposal.files.insurance.length > 0 && (
                      <div>
                        <div className="font-medium text-sm text-[#0A355C] mb-1">Insurance Documents ({projectProposal.files.insurance.length})</div>
                        {projectProposal.files.insurance.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pl-4 py-1 hover:bg-gray-50 rounded">
                            <span 
                              className="text-xs text-gray-600 cursor-pointer hover:text-blue-600 flex-1"
                              onClick={() => openFilePreview(file)}
                            >
                              • {file.filename}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
                              title="Download file"
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Flagged Documents & Next Steps */}
              <div className="space-y-4">
                {/* Flagged Documents */}
                {projectProposal.flagged_documents.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-900 mb-3">Flagged Documents ({projectProposal.flagged_documents.length})</h4>
                    <div className="space-y-2">
                      {projectProposal.flagged_documents.map((doc: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm text-red-900 cursor-pointer hover:text-red-700 flex-1"
                                 onClick={() => openFilePreview(doc)}>
                              {doc.filename}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(doc);
                              }}
                              className="text-xs bg-[#0A355C] hover:bg-blue-700 text-white px-2 py-1 rounded ml-2"
                              title="Download flagged file"
                            >
                              ↓
                            </button>
                          </div>
                          <div className="text-xs text-red-700 mt-1">
                            Issue: {projectProposal.risk_assessment.issues.find((i: any) => i.file === doc.filename)?.issue}
                          </div>
                          <div className="text-xs text-red-600 mt-1">{doc.analysis.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-[#0A355C] mb-3">Recommended Next Steps</h4>
                  <div className="space-y-2">
                    {projectProposal.next_steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-0.5">{idx + 1}.</span>
                        <span className="text-sm text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-[#0A355C] mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 bg-[#0A355C] text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            onClick={() => window.alert('Project tracking initiated!')}>
                      Start Project Tracking
                    </button>
                    {projectProposal.flagged_documents.length > 0 && (
                      <button className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              onClick={() => window.alert('Compliance review requested!')}>
                        Request Compliance Review
                      </button>
                    )}
                    <button className="w-full px-3 py-2 bg-[#F0F2F5] text-[#0A355C] rounded text-sm hover:bg-gray-300 transition-colors"
                            onClick={() => window.alert('Report generated!')}>
                      Generate Project Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MorphLLM Interface */}
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-[#0A355C] mb-4">
            UI Configuration Management
          </h3>
          <div className="space-y-4">
            <textarea
              value={morphPrompt}
              onChange={(e) => setMorphPrompt(e.target.value)}
              placeholder="Describe how you want to modify the UI... (e.g., 'Add a budget widget for finance department' or 'Show permit status dashboard')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A355C] resize-none"
              rows={3}
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Current context: {manifest?.name} department, {selectedRole} role
              </div>
              <button
                onClick={generateDynamicUI}
                disabled={isGenerating || !morphPrompt.trim()}
                className="bg-[#0A355C] text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? "Processing..." : "Update Configuration"}
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
                      <div className="text-green-600">Success: {JSON.stringify(executionResult, null, 2)}</div>
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
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0A355C] mb-4">Automated UI Adaptation Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  trackAction({ type: 'query', content: '123 Main Street permits', timestamp: Date.now() });
                  setTimeout(() => trackAction({ type: 'query', content: '456 Oak Avenue zoning', timestamp: Date.now() }), 500);
                }}
                className="bg-white p-4 rounded-lg border border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="w-12 h-12 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-3m3 3l3-3" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 bg-[#0A355C] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-sm font-medium">Trigger Budget Widget</div>
                <div className="text-xs text-gray-600">Ask financial questions</div>
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              These buttons simulate user behavior patterns that trigger automatic UI adaptations.
            </div>
          </div>

          {/* Adaptation Log */}
          {adaptations.length > 0 && (
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0A355C] mb-4">UI Adaptation Log</h3>
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
                        Added: {adaptation.widgets_added.join(', ')}
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
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0A355C] mb-4">Role-Based Access Control</h3>
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
Switch roles above to see how the UI adapts dynamically. Try the demo buttons to see automated just-in-time adaptations!
            </div>
          </div>
        </div>
      </main>

      {/* File Preview Modal */}
      {showFilePreview && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-[#0A355C]">Document Preview</h3>
                <p className="text-sm text-gray-600">{previewFile.filename}</p>
              </div>
              <button
                onClick={closeFilePreview}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Analysis - Only show if analysis exists */}
                {previewFile.analysis && (
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-[#0A355C] mb-2">Analysis Results</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Category:</span>
                          <div className="text-blue-600">{previewFile.analysis.subcategory}</div>
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span>
                          <div className="text-green-600">{(previewFile.analysis.confidence * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Risk Level:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            previewFile.analysis.flags.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                            previewFile.analysis.flags.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {previewFile.analysis.flags.risk_level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flags */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-[#0A355C] mb-2">Document Flags</h4>
                      <div className="space-y-1">
                        {previewFile.analysis.flags.is_outdated && (
                          <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">OUTDATED</div>
                        )}
                        {previewFile.analysis.flags.is_contract && (
                          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">CONTRACT</div>
                        )}
                        {previewFile.analysis.flags.is_insurance && (
                          <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">INSURANCE</div>
                        )}
                        {previewFile.analysis.flags.requires_attention && (
                          <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">NEEDS ATTENTION</div>
                        )}
                      </div>
                    </div>

                    {/* Key Data */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-[#0A355C] mb-2">Extracted Data</h4>
                      <div className="space-y-2 text-xs">
                        {previewFile.analysis.key_data.dates.length > 0 && (
                          <div>
                            <span className="font-medium">Dates:</span>
                            <div className="text-gray-600">
                              {previewFile.analysis.key_data.dates.slice(0, 3).join(', ')}
                            </div>
                          </div>
                        )}
                        {previewFile.analysis.key_data.amounts.length > 0 && (
                          <div>
                            <span className="font-medium">Amounts:</span>
                            <div className="text-gray-600">
                              {previewFile.analysis.key_data.amounts.slice(0, 3).join(', ')}
                            </div>
                          </div>
                        )}
                        {previewFile.analysis.key_data.addresses.length > 0 && (
                          <div>
                            <span className="font-medium">Addresses:</span>
                            <div className="text-gray-600">
                              {previewFile.analysis.key_data.addresses.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        )}
                        {previewFile.analysis.key_data.reference_numbers.length > 0 && (
                          <div>
                            <span className="font-medium">Reference #:</span>
                            <div className="text-blue-600">
                              {previewFile.analysis.key_data.reference_numbers.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SF Open Data Info - Show when no analysis exists */}
                {!previewFile.analysis && previewFile.metadata && previewFile.metadata.source === 'SF Open Data' && (
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-[#0A355C] mb-2">Dataset Information</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Dataset:</span>
                          <div className="text-blue-600">{previewFile.metadata.dataset}</div>
                        </div>
                        <div>
                          <span className="font-medium">Department:</span>
                          <div className="text-green-600">{previewFile.metadata.dept}</div>
                        </div>
                        <div>
                          <span className="font-medium">Last Updated:</span>
                          <div className="text-gray-600">{previewFile.metadata.last_updated}</div>
                        </div>
                        <div>
                          <span className="font-medium">Relevance Score:</span>
                          <div className="text-purple-600">{(previewFile.score * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-[#0A355C] mb-2">Source Information</h4>
                      <div className="text-sm text-gray-600">
                        This data was retrieved from the San Francisco Open Data Portal.
                        <br />
                        <a 
                          href={previewFile.path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                        >
                          View original source →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Content */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-[#0A355C] mb-2">Document Content</h4>
                    <div className="bg-white p-4 rounded border border-gray-200 font-mono text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {/* Simulate document content based on analysis */}
                      {previewFile.analysis && previewFile.analysis.category === 'building_permit' && (
                        `BUILDING PERMIT APPLICATION

Application Number: BP-2024-1234
Property Address: 123 Main Street, San Francisco, CA 94102
Applicant: John Developer
Project Description: Single family residence renovation
Permit Type: Building Permit
Application Date: 2024-01-15
Estimated Cost: $150,000
Contractor: ABC Construction Company
Contact: john@developer.com
Status: Under Review

WORK DESCRIPTION:
- Kitchen renovation including new appliances
- Bathroom modernization with accessibility features  
- Structural modifications to living area
- Electrical upgrades to code compliance
- Plumbing updates for new fixtures

REQUIRED INSPECTIONS:
[ ] Foundation inspection
[ ] Framing inspection  
[ ] Electrical rough-in
[ ] Plumbing rough-in
[ ] Insulation inspection
[ ] Final inspection

FEES PAID: $2,500
INSURANCE: Certificate on file
CONTRACTOR LICENSE: Verified #ABC123`
                      )}
                      
                      {previewFile.analysis && previewFile.analysis.category === 'zoning_application' && (
                        `ZONING APPLICATION

Case Number: ZA-2024-5678
Property: 456 Oak Avenue, San Francisco, CA 94110
Applicant: Jane Property Owner
Request: Conditional Use Authorization for Restaurant
Zoning District: Neighborhood Commercial
Application Date: 2024-02-01
Hearing Date: 2024-03-15
Planning Commission Review Required
Environmental Review: Categorical Exemption

PROJECT DESCRIPTION:
Conversion of existing retail space to full-service restaurant.
Proposed seating capacity: 45 patrons
Operating hours: 7:00 AM - 10:00 PM
Type of service: Table service with limited takeout

ZONING ANALYSIS:
- Current zoning: NC-1 (Neighborhood Commercial)
- Proposed use: Restaurant (conditional use)
- Parking requirements: 1 space per 250 sq ft
- Available parking: 8 spaces on-site
- Compliance status: Requires conditional use permit

PUBLIC NOTIFICATION:
[ ] Property owners within 300 feet notified
[ ] Neighborhood associations contacted
[ ] Public hearing notice posted`
                      )}
                      
                      {previewFile.analysis && previewFile.analysis.category === 'contract' && (
                        `CITY CONTRACT AGREEMENT

Contract Number: CT-2024-9876
Contractor: XYZ Services LLC
Department: Public Works
Service: Street Maintenance Services
Contract Amount: $500,000
Start Date: 2024-01-01
End Date: 2024-12-31
Insurance Required: $1,000,000 General Liability
Performance Bond: Required

SCOPE OF WORK:
- Pothole repair and street resurfacing
- Sidewalk maintenance and ADA compliance
- Storm drain cleaning and maintenance
- Street sweeping services
- Emergency response for weather events

PAYMENT TERMS:
Monthly invoicing based on completed work
Net 30 days payment terms
10% retention until final completion
Performance incentives for early completion

INSURANCE REQUIREMENTS:
- General Liability: $1,000,000
- Workers Compensation: As required by law
- Automobile Liability: $1,000,000
- Additional Insured: City and County of San Francisco

CONTRACT STATUS: ACTIVE`
                      )}
                      
                      {previewFile.analysis && previewFile.analysis.category === 'insurance' && (
                        `INSURANCE CERTIFICATE

Policy Number: INS-2022-4567
Insured: City Contractor ABC
Insurance Company: State Insurance Co.
Coverage Type: General Liability
Coverage Amount: $2,000,000
Effective Date: 2022-01-01
Expiration Date: 2022-12-31
Additional Insured: City and County of San Francisco
Certificate Holder: Department of Public Works

STATUS: EXPIRED - REQUIRES RENEWAL

COVERAGE DETAILS:
- General Liability: $2,000,000 per occurrence
- Products/Completed Operations: $2,000,000 aggregate
- Personal & Advertising Injury: $1,000,000 per occurrence
- Medical Expenses: $10,000 per person

DEDUCTIBLES:
- General Liability: $5,000
- Property Damage: $2,500

SPECIAL CONDITIONS:
- Waiver of subrogation in favor of City
- Primary and non-contributory coverage
- 30-day cancellation notice required

RENEWAL ACTION REQUIRED:
This certificate expired on 2022-12-31.
Contact insurance provider immediately for renewal.
Work may not proceed without valid insurance.`
                      )}
                      
                      {previewFile.metadata && previewFile.metadata.source === 'SF Open Data' ? (
                        `SAN FRANCISCO OPEN DATA RECORD

Title: ${previewFile.title}
Dataset: ${previewFile.metadata.dataset}
Department: ${previewFile.metadata.dept}
Source: ${previewFile.metadata.source}
Last Updated: ${previewFile.metadata.last_updated}
Relevance Score: ${previewFile.score * 100}%

RECORD DETAILS:
${previewFile.content}

RAW DATA:
${JSON.stringify(previewFile.raw_data, null, 2)}

This data was retrieved from the San Francisco Open Data Portal.
For more information, visit: ${previewFile.path}`
                      ) : !previewFile.analysis || !['building_permit', 'zoning_application', 'contract', 'insurance'].includes(previewFile.analysis.category || '') ? (
                        `Document content for ${previewFile.filename}

This is a government document that has been analyzed by our AI system.

Category: ${previewFile.analysis?.subcategory || 'Unknown'}
Analysis confidence: ${(previewFile.analysis?.confidence * 100).toFixed(0) || 0}%

Summary: ${previewFile.analysis?.summary || 'No summary available'}

Key information extracted:
${previewFile.analysis?.key_data?.dates?.length > 0 ? `- Dates found: ${previewFile.analysis.key_data.dates.join(', ')}` : ''}
${previewFile.analysis?.key_data?.amounts?.length > 0 ? `- Amounts found: ${previewFile.analysis.key_data.amounts.join(', ')}` : ''}
${previewFile.analysis?.key_data?.addresses?.length > 0 ? `- Addresses found: ${previewFile.analysis.key_data.addresses.join(', ')}` : ''}

This document has been processed and categorized for government workflow management.`
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {previewFile.metadata && previewFile.metadata.source === 'SF Open Data' 
                  ? `Dataset: ${previewFile.metadata.dataset} | Department: ${previewFile.metadata.dept}`
                  : `Analysis Summary: ${previewFile.analysis?.summary || 'No summary available'}`
                }
              </div>
              <div className="space-x-2">
                <button
                  onClick={closeFilePreview}
                  className="px-4 py-2 bg-[#F0F2F5] text-[#0A355C] rounded hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadFile(previewFile)}
                  className="px-4 py-2 bg-[#0A355C] text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}