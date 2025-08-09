# San Francisco Open Data API Integration Setup

## Overview
This application integrates with San Francisco's Open Data Portal to provide real-time access to government data including building permits, planning applications, business registrations, and more.

## Features
- **Real-time data**: Live access to SF government datasets
- **Smart search**: Full-text search across multiple datasets
- **Department filtering**: Results filtered by selected department
- **Fallback data**: Graceful degradation when API is unavailable
- **Relevance scoring**: Intelligent ranking of search results

## Datasets Available

### Building & Planning
- **Building Permits** (`cuks-n6tp`): Construction permits, renovations, new buildings
- **Planning Applications** (`i98e-djp9`): Zoning changes, development projects, land use

### Business & Finance  
- **Business Registrations** (`w6wa-wi6i`): New businesses, DBA filings, business types
- **City Budget** (`vw6y-z8j6`): Department budgets, funding allocations, fiscal data

### Transportation & Infrastructure
- **Municipal Transportation** (`rqzj-sfat`): Transit routes, stops, schedules

## API Configuration

### 1. Get Your API Key
1. Visit [Socrata Developer Portal](https://dev.socrata.com/register)
2. Create a free account
3. Register your application
4. Copy your API key

### 2. Environment Setup
Create a `.env.local` file in the `apps/web/` directory:

```bash
# San Francisco Open Data API Configuration
NEXT_PUBLIC_SODA_DOMAIN=https://data.sfgov.org
NEXT_PUBLIC_SODA_API_KEY=your_api_key_here
```

### 3. Rate Limits
- **Free tier**: 1,000 requests per day
- **Paid tiers**: Available for higher volume needs
- **Best practices**: Implement caching for frequently accessed data

## Usage Examples

### Search for Building Permits
```
GET /api/government-data?q=building permits&dept=planning&limit=10
```

### Search for Business Registrations
```
GET /api/government-data?q=restaurant&dept=finance&limit=5
```

### Get Recent Planning Applications
```
GET /api/government-data?q=&dept=planning&limit=20
```

## Response Format

```json
{
  "query": "building permits",
  "results": [
    {
      "id": "sf_cuks-n6tp_0_1234567890",
      "title": "Building Permit: BP-2024-1234",
      "content": "Address: 123 Main Street, San Francisco. Status: Under Review...",
      "score": 0.95,
      "metadata": {
        "source": "SF Open Data",
        "dataset": "cuks-n6tp",
        "year": 2024,
        "dept": "planning",
        "tags": ["building", "permit", "residential"]
      }
    }
  ],
  "total": 1,
  "source": "San Francisco Open Data",
  "datasets_queried": ["cuks-n6tp", "i98e-djp9"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

The API includes robust error handling:
- **API failures**: Automatically falls back to realistic sample data
- **Network issues**: Graceful degradation with cached/fallback results
- **Rate limiting**: Respects API limits and provides helpful error messages

## Development Notes

### Testing
- Use the search interface in the GovPal application
- Check browser console for API request logs
- Monitor network tab for actual API calls

### Debugging
- API responses are logged to console
- Fallback data is clearly marked in responses
- Check environment variables are properly set

### Performance
- Results are sorted by relevance score
- Limited to reasonable result counts per request
- Consider implementing client-side caching for better UX

## Support

For API-related issues:
- Check [Socrata Documentation](https://dev.socrata.com/docs/)
- Review [SF Open Data Portal](https://data.sfgov.org/)
- Contact SF Data Team for dataset-specific questions

For application issues:
- Check the application logs
- Verify environment configuration
- Test with simple queries first
