// San Francisco Open Data API Configuration
export const SF_OPEN_DATA_CONFIG = {
  // Base URL for San Francisco Open Data Portal
  BASE_URL: 'https://data.sfgov.org',
  
  // API endpoints for different datasets - only verified working ones
  DATASETS: {
    BUILDING_PERMITS: 'i98e-djp9', // Building permits and planning - VERIFIED WORKING
    PLANNING_APPLICATIONS: 'i98e-djp9', // Same dataset for planning
    SERVICE_REQUESTS: 'vw6y-z8j6', // Street cleaning, maintenance requests - VERIFIED WORKING
    FOOD_FACILITIES: 'rqzj-sfat', // Food facility permits - VERIFIED WORKING (was incorrectly labeled as transportation)
    EVICTIONS: '5cei-gny5', // Eviction notices - VERIFIED WORKING
    // Removed broken datasets: jqjq-uumm, 8vca-4q4k, gz4e-qzq6, vuw6-95ab
  },
  
  // Department mappings - updated with working datasets only
  DEPARTMENT_MAPPING: {
    'planning': ['i98e-djp9', '5cei-gny5'], // Building permits, evictions
    'public-works': ['vw6y-z8j6', 'i98e-djp9', 'rqzj-sfat'], // Service requests, building permits, food facilities
    'finance': ['5cei-gny5', 'vw6y-z8j6'], // Evictions and service requests
    'general': ['i98e-djp9', 'vw6y-z8j6', 'rqzj-sfat', '5cei-gny5'] // All working datasets
  },
  
  // Search field mappings for different datasets - updated for working datasets
  SEARCH_FIELDS: {
    'i98e-djp9': ['permit_number', 'description', 'street_name', 'block', 'lot'],
    'vw6y-z8j6': ['service_name', 'service_subtype', 'service_details', 'address'],
    'rqzj-sfat': ['applicant', 'facilitytype', 'address', 'fooditems'],
    '5cei-gny5': ['address', 'city', 'zip', 'file_date']
  },
  
  // Default limit for search results
  DEFAULT_LIMIT: 10,
  
  // Cache duration in milliseconds (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000
};

// Helper function to build search URLs
export function buildSearchURL(dataset: string, query: string, limit: number = 10): string {
  const baseURL = `${SF_OPEN_DATA_CONFIG.BASE_URL}/resource/${dataset}.json`;
  
  // Use dataset-specific ordering fields
  let orderField = 'permit_creation_date DESC'; // Default for building permits
  if (dataset === 'vw6y-z8j6') {
    orderField = 'requested_datetime DESC'; // Service requests
  } else if (dataset === 'rqzj-sfat') {
    orderField = 'received DESC'; // Food facilities
  } else if (dataset === '5cei-gny5') {
    orderField = 'file_date DESC'; // Evictions
  }
  
  const params = new URLSearchParams({
    '$limit': limit.toString(),
    '$order': orderField
  });
  
  // Add search query if provided
  if (query.trim()) {
    // Use SODA's full-text search
    params.append('$q', query.trim());
  }
  
  return `${baseURL}?${params.toString()}`;
}

// Helper function to get relevant datasets for a department
export function getDatasetsForDepartment(dept: string): string[] {
  return SF_OPEN_DATA_CONFIG.DEPARTMENT_MAPPING[dept as keyof typeof SF_OPEN_DATA_CONFIG.DEPARTMENT_MAPPING] || 
         Object.values(SF_OPEN_DATA_CONFIG.DATASETS);
}
