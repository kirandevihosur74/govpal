import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const dept = searchParams.get('dept') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const apiKey = process.env.NEXT_PUBLIC_SODA_API_KEY;
    const domain = process.env.NEXT_PUBLIC_SODA_DOMAIN;

    if (!apiKey || !domain) {
      throw new Error('Government data API not configured');
    }

    // Fetch real San Francisco government data
    const datasets = await fetchGovernmentDatasets(query, dept, limit, apiKey, domain);

    return NextResponse.json({
      query,
      results: datasets,
      total: datasets.length,
      source: 'San Francisco Open Data'
    });

  } catch (error) {
    console.error('Government data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch government data' },
      { status: 500 }
    );
  }
}

async function fetchGovernmentDatasets(
  query: string, 
  dept: string, 
  limit: number, 
  apiKey: string, 
  domain: string
) {
  try {
    // Search across multiple SF datasets
    const endpoints = [
      'cuks-n6tp', // Building Permits
      'i98e-djp9', // Planning Applications  
      'w6wa-wi6i', // Business Registrations
      'vw6y-z8j6', // City Budget
      'rqzj-sfat'  // Municipal Transportation Agency
    ];

    const results = [];

    for (const endpoint of endpoints.slice(0, 3)) { // Limit to 3 endpoints for demo
      try {
        const url = `${domain}/resource/${endpoint}.json?$$app_token=${apiKey}&$limit=${Math.ceil(limit/3)}`;
        
        // Add search filter if query exists
        let searchUrl = url;
        if (query.trim()) {
          // Simple text search across common fields
          searchUrl += `&$q=${encodeURIComponent(query)}`;
        }

        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          
          // Transform data to our format
          const transformedData = data.slice(0, Math.ceil(limit/3)).map((item: any, index: number) => ({
            id: `sf_${endpoint}_${index}`,
            title: getRecordTitle(item, endpoint),
            content: getRecordContent(item, endpoint),
            score: 0.85 + (Math.random() * 0.15), // Simulate relevance score
            metadata: {
              source: 'SF Open Data',
              dataset: endpoint,
              year: extractYear(item),
              dept: mapDatasetToDept(endpoint),
              tags: extractTags(item, endpoint)
            },
            path: `${domain}/resource/${endpoint}`,
            raw_data: item
          }));

          results.push(...transformedData);
        }
      } catch (endpointError) {
        console.warn(`Failed to fetch from ${endpoint}:`, endpointError);
      }
    }

    return results.slice(0, limit);

  } catch (error) {
    console.error('Error fetching datasets:', error);
    return [];
  }
}

function getRecordTitle(item: any, endpoint: string): string {
  switch (endpoint) {
    case 'cuks-n6tp': // Building Permits
      return `Building Permit: ${item.permit_number || item.application_number || 'N/A'}`;
    case 'i98e-djp9': // Planning Applications
      return `Planning Application: ${item.case_number || item.application_number || 'N/A'}`;
    case 'w6wa-wi6i': // Business Registration
      return `Business: ${item.dba_name || item.business_name || 'N/A'}`;
    case 'vw6y-z8j6': // Budget
      return `Budget Item: ${item.department_name || item.budget_line || 'N/A'}`;
    case 'rqzj-sfat': // Transportation
      return `Transit: ${item.route || item.stop_name || item.location || 'N/A'}`;
    default:
      return `Government Record: ${item.title || item.name || 'Untitled'}`;
  }
}

function getRecordContent(item: any, endpoint: string): string {
  switch (endpoint) {
    case 'cuks-n6tp': // Building Permits
      return `Address: ${item.location || item.block_lot || 'N/A'}. 
              Status: ${item.current_status || 'Unknown'}. 
              Description: ${item.description || item.proposed_construction_type || 'No description'}`;
    case 'i98e-djp9': // Planning Applications
      return `Location: ${item.location || item.block_lot || 'N/A'}. 
              Project: ${item.project_description || item.description || 'No description'}. 
              Status: ${item.current_status || 'Unknown'}`;
    case 'w6wa-wi6i': // Business Registration
      return `Business Type: ${item.business_type || 'N/A'}. 
              Location: ${item.business_location || item.location || 'N/A'}. 
              Start Date: ${item.location_start_date || 'Unknown'}`;
    case 'vw6y-z8j6': // Budget
      return `Department: ${item.department_name || 'N/A'}. 
              Amount: $${item.amount || item.budget_amount || 'N/A'}. 
              Category: ${item.category || item.fund_type || 'General'}`;
    case 'rqzj-sfat': // Transportation
      return `Route: ${item.route || 'N/A'}. 
              Stop: ${item.stop_name || 'N/A'}. 
              Schedule: ${item.direction || item.wheelchair_boarding || 'N/A'}`;
    default:
      return JSON.stringify(item).substring(0, 200) + '...';
  }
}

function extractYear(item: any): number {
  // Try to extract year from various date fields
  const dateFields = ['date_created', 'created_date', 'application_date', 'permit_date', 'start_date'];
  
  for (const field of dateFields) {
    if (item[field]) {
      const year = new Date(item[field]).getFullYear();
      if (year > 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }
  
  return new Date().getFullYear(); // Default to current year
}

function mapDatasetToDept(endpoint: string): string {
  const mapping: Record<string, string> = {
    'cuks-n6tp': 'planning',
    'i98e-djp9': 'planning', 
    'w6wa-wi6i': 'finance',
    'vw6y-z8j6': 'finance',
    'rqzj-sfat': 'public-works'
  };
  
  return mapping[endpoint] || 'general';
}

function extractTags(item: any, endpoint: string): string[] {
  const tags = [];
  
  switch (endpoint) {
    case 'cuks-n6tp':
      if (item.permit_type) tags.push(item.permit_type.toLowerCase());
      if (item.current_status) tags.push(item.current_status.toLowerCase());
      break;
    case 'i98e-djp9':
      if (item.case_type) tags.push(item.case_type.toLowerCase());
      if (item.project_description) tags.push('development');
      break;
    case 'w6wa-wi6i':
      if (item.business_type) tags.push(item.business_type.toLowerCase());
      tags.push('business');
      break;
    case 'vw6y-z8j6':
      tags.push('budget', 'finance');
      if (item.fund_type) tags.push(item.fund_type.toLowerCase());
      break;
    case 'rqzj-sfat':
      tags.push('transportation', 'transit');
      if (item.route) tags.push('route');
      break;
  }
  
  return tags.filter(tag => tag && tag.length > 0);
}
