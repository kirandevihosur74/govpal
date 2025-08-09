import { NextRequest, NextResponse } from 'next/server';
import { SF_OPEN_DATA_CONFIG, buildSearchURL, getDatasetsForDepartment } from '@/config/sf-open-data';

// Define interfaces for better type safety
interface SFDataItem {
  [key: string]: any; // Dynamic properties from SF Open Data
  permit_creation_date?: string;
  requested_datetime?: string;
  received?: string;
  file_date?: string;
  date_created?: string;
  created_date?: string;
  applicant?: string;
  facilitytype?: string;
  address?: string;
  fooditems?: string;
  status?: string;
  city?: string;
  state?: string;
  zip?: string;
  non_payment?: boolean;
  breach?: boolean;
  nuisance?: boolean;
  permit_number?: string;
  description?: string;
  street_name?: string;
  block?: string;
  lot?: string;
  service_name?: string;
  service_subtype?: string;
  service_details?: string;
  permit_type?: string;
  permit_type_definition?: string;
  estimated_cost?: string;
  revised_cost?: string;
  zipcode?: string;
  street_number?: string;
  street_suffix?: string;
  status_description?: string;
}

interface TransformedRecord {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: {
    source: string;
    dataset: string;
    year: number;
    dept: string;
    tags: string[];
    last_updated: string;
  };
  path: string;
  raw_data: SFDataItem;
}

interface SearchResponse {
  data: TransformedRecord[];
  total: number;
}

export async function GET(request: NextRequest) {
  // Declare variables at the top so they're accessible in catch block
  let query = '';
  let dept = '';
  let limit = 10;
  let page = 1;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    query = searchParams.get('q') || '';
    dept = searchParams.get('dept') || '';
    limit = parseInt(searchParams.get('limit') || '10');
    page = parseInt(searchParams.get('page') || '1');

    // Get datasets relevant to the selected department
    const datasets = getDatasetsForDepartment(dept);
    
    // Fetch real San Francisco government data with pagination
    const results = await fetchGovernmentDatasets(query, datasets, limit, page);

    return NextResponse.json({
      query,
      results: results.data,
      total: results.total,
      page,
      limit,
      totalPages: Math.ceil(results.total / limit),
      hasNextPage: page < Math.ceil(results.total / limit),
      hasPrevPage: page > 1,
      source: 'San Francisco Open Data',
      datasets_queried: datasets,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Government data API error:', error);
    
    // Return fallback data instead of error
    const fallbackResults = generateFallbackResults(query, dept, limit);
    
    return NextResponse.json({
      query,
      results: fallbackResults,
      total: fallbackResults.length,
      page,
      limit,
      totalPages: Math.ceil(fallbackResults.length / limit),
      hasNextPage: false,
      hasPrevPage: false,
      source: 'San Francisco Open Data (Fallback)',
      warning: 'Using fallback data due to API error',
      timestamp: new Date().toISOString()
    });
  }
}

async function fetchGovernmentDatasets(
  query: string, 
  datasets: string[], 
  limit: number,
  page: number
): Promise<SearchResponse> {
  console.log(`🔍 Fetching datasets: ${datasets.join(', ')} for query: "${query}" (page ${page}, limit ${limit})`);
  const results: TransformedRecord[] = [];
  const failedDatasets: string[] = [];
  // Fetch more data per dataset to support pagination
  const resultsPerDataset = Math.max(limit * 2, 20); // Fetch at least 20 per dataset for pagination

  for (const dataset of datasets) {
    try {
      const searchUrl = buildSearchURL(dataset, query, resultsPerDataset);
      console.log(`📡 Fetching from ${dataset}: ${searchUrl}`);
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'GovPal/1.0 (Government Interface Application)',
          'Accept': 'application/json'
        }
      });

      console.log(`📊 Response status: ${response.status} for ${dataset}`);

      if (response.ok) {
        const data: SFDataItem[] = await response.json();
        console.log(`📋 Raw data from ${dataset}: ${data.length} records`);
        
        // Transform data to our format
        const transformedData = data.map((item: SFDataItem, index: number) => ({
          id: `sf_${dataset}_${index}_${Date.now()}`,
          title: getRecordTitle(item, dataset),
          content: getRecordContent(item, dataset),
          score: calculateRelevanceScore(item, query, dataset),
          metadata: {
            source: 'SF Open Data',
            dataset: dataset,
            year: extractYear(item),
            dept: mapDatasetToDept(dataset),
            tags: extractTags(item, dataset),
            last_updated: item.permit_creation_date || item.requested_datetime || item.received || item.file_date || new Date().toISOString()
          },
          path: `${SF_OPEN_DATA_CONFIG.BASE_URL}/resource/${dataset}`,
          raw_data: item
        }));

        console.log(`✨ Transformed ${transformedData.length} records from ${dataset}`);
        results.push(...transformedData);
      } else {
        console.warn(`❌ Failed to fetch from ${dataset}: ${response.status} ${response.statusText}`);
        failedDatasets.push(dataset);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          console.warn(`📝 Error details for ${dataset}:`, errorData);
        } catch {
          // Ignore error parsing errors
        }
      }
    } catch (endpointError) {
      console.error(`💥 Error fetching from ${dataset}:`, endpointError);
      failedDatasets.push(dataset);
    }
  }

  // Log summary of results
  if (failedDatasets.length > 0) {
    console.warn(`⚠️ Failed to fetch from ${failedDatasets.length} datasets: ${failedDatasets.join(', ')}`);
  }
  
  console.log(`🎯 Total results before sorting: ${results.length}`);
  
  // Sort by relevance score
  const sortedResults = results.sort((a, b) => b.score - a.score);
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);
  
  console.log(`🏆 Final results: ${paginatedResults.length} (page ${page}, showing ${startIndex + 1}-${Math.min(endIndex, sortedResults.length)} of ${sortedResults.length})`);
  
  return { 
    data: paginatedResults, 
    total: sortedResults.length 
  };
}

function calculateRelevanceScore(item: SFDataItem, query: string, dataset: string): number {
  let score = 0.5; // Base score
  
  if (!query.trim()) return score;
  
  const queryLower = query.toLowerCase();
  const searchFields = SF_OPEN_DATA_CONFIG.SEARCH_FIELDS[dataset as keyof typeof SF_OPEN_DATA_CONFIG.SEARCH_FIELDS] || [];
  
  // Check if query matches any search fields
  for (const field of searchFields) {
    if (item[field]) {
      const fieldValue = String(item[field]).toLowerCase();
      if (fieldValue.includes(queryLower)) {
        score += 0.3; // Field match bonus
      }
    }
  }
  
  // Check for exact matches in title and content
  const title = getRecordTitle(item, dataset).toLowerCase();
  const content = getRecordContent(item, dataset).toLowerCase();
  
  if (title.includes(queryLower)) score += 0.2;
  if (content.includes(queryLower)) score += 0.1;
  
  // Recency bonus (newer items get higher scores)
  if (item.date_created || item.created_date) {
    const dateValue = item.date_created || item.created_date;
    if (dateValue) {
      const daysOld = (Date.now() - new Date(dateValue).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) score += 0.1; // Recent items get bonus
    }
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

function generateFallbackResults(query: string, dept: string, limit: number): TransformedRecord[] {
  // Generate realistic fallback data when API fails
  const fallbackData: TransformedRecord[] = [
    {
      id: 'fallback_1',
      title: `Building Permit: BP-2024-${Math.floor(Math.random() * 9999)}`,
      content: `Address: ${Math.floor(Math.random() * 9999)} Main Street, San Francisco. Status: Under Review. Description: Residential renovation project.`,
      score: 0.85,
      metadata: {
        source: 'SF Open Data (Fallback)',
        dataset: 'cuks-n6tp',
        year: 2024,
        dept: dept || 'planning',
        tags: ['building', 'permit', 'residential'],
        last_updated: new Date().toISOString()
      },
      path: '/fallback',
      raw_data: {} as SFDataItem
    },
    {
      id: 'fallback_2',
      title: `Planning Application: PA-2024-${Math.floor(Math.random() * 9999)}`,
      content: `Location: ${Math.floor(Math.random() * 9999)} Oak Avenue, San Francisco. Project: Commercial development. Status: Pending Review.`,
      score: 0.82,
      metadata: {
        source: 'SF Open Data (Fallback)',
        dataset: 'i98e-djp9',
        year: 2024,
        dept: dept || 'planning',
        tags: ['planning', 'commercial', 'development'],
        last_updated: new Date().toISOString()
      },
      path: '/fallback',
      raw_data: {} as SFDataItem
    }
  ];
  
  return fallbackData.slice(0, limit);
}

function getRecordTitle(item: SFDataItem, endpoint: string): string {
  switch (endpoint) {
    case 'i98e-djp9': // Building Permits
      return `Building Permit: ${item.permit_number || 'N/A'}`;
    case 'vw6y-z8j6': // Service Requests
      return `Service Request: ${item.service_name || 'N/A'} - ${item.service_subtype || 'N/A'}`;
    case 'rqzj-sfat': // Food Facilities (was incorrectly labeled as transportation)
      return `Food Facility: ${item.applicant || 'N/A'} - ${item.facilitytype || 'N/A'}`;
    case '5cei-gny5': // Evictions
      return `Eviction Notice: ${item.address || 'N/A'} - ${item.file_date ? new Date(item.file_date).toLocaleDateString() : 'N/A'}`;
    default:
      return `Government Record: ${item.title || item.name || 'Untitled'}`;
  }
}

function getRecordContent(item: SFDataItem, endpoint: string): string {
  switch (endpoint) {
    case 'i98e-djp9': // Building Permits
      return `Address: ${item.street_number || ''} ${item.street_name || ''} ${item.street_suffix || ''}, ${item.zipcode || 'N/A'}. 
              Status: ${item.status || 'Unknown'}. 
              Description: ${item.description || 'No description'}. 
              Type: ${item.permit_type_definition || 'N/A'}. 
              Cost: $${item.estimated_cost || item.revised_cost || 'N/A'}`;
    case 'vw6y-z8j6': // Service Requests
      return `Service: ${item.service_name || 'N/A'}. 
              Type: ${item.service_subtype || 'N/A'}. 
              Details: ${item.service_details || 'No details'}. 
              Address: ${item.address || 'N/A'}. 
              Status: ${item.status_description || 'Unknown'}`;
    case 'rqzj-sfat': // Food Facilities
      return `Applicant: ${item.applicant || 'N/A'}. 
              Facility Type: ${item.facilitytype || 'N/A'}. 
              Address: ${item.address || 'N/A'}. 
              Food Items: ${item.fooditems || 'N/A'}. 
              Status: ${item.status || 'Unknown'}`;
    case '5cei-gny5': // Evictions
      return `Address: ${item.address || 'N/A'}, ${item.city || 'N/A'}, ${item.state || 'N/A'} ${item.zip || 'N/A'}. 
              File Date: ${item.file_date ? new Date(item.file_date).toLocaleDateString() : 'N/A'}. 
              Non-payment: ${item.non_payment ? 'Yes' : 'No'}. 
              Breach: ${item.breach ? 'Yes' : 'No'}`;
    default:
      return JSON.stringify(item).substring(0, 200) + '...';
  }
}

function extractYear(item: SFDataItem): number {
  // Try to extract year from various date fields
  const dateFields = ['permit_creation_date', 'requested_datetime', 'created_date', 'application_date', 'permit_date', 'start_date'];
  
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
    'i98e-djp9': 'planning',
    'vw6y-z8j6': 'public-works', 
    'rqzj-sfat': 'public-works',
    '5cei-gny5': 'planning'
  };
  
  return mapping[endpoint] || 'general';
}

function extractTags(item: SFDataItem, endpoint: string): string[] {
  const tags = [];
  
  switch (endpoint) {
    case 'i98e-djp9':
      if (item.permit_type) tags.push(item.permit_type.toLowerCase());
      if (item.status) tags.push(item.status.toLowerCase());
      if (item.permit_type_definition) tags.push(item.permit_type_definition.toLowerCase());
      break;
    case 'vw6y-z8j6':
      if (item.service_name) tags.push(item.service_name.toLowerCase());
      if (item.service_subtype) tags.push(item.service_subtype.toLowerCase());
      tags.push('service', 'maintenance');
      break;
    case 'rqzj-sfat':
      tags.push('food', 'facility', 'permit');
      if (item.facilitytype) tags.push(item.facilitytype.toLowerCase());
      if (item.status) tags.push(item.status.toLowerCase());
      break;
    case '5cei-gny5':
      tags.push('eviction', 'housing', 'legal');
      if (item.non_payment) tags.push('non-payment');
      if (item.breach) tags.push('breach');
      if (item.nuisance) tags.push('nuisance');
      break;
  }
  
  return tags.filter(tag => tag && tag.length > 0);
}
