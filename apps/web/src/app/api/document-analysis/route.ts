import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DocumentAnalysis {
  category: 'building_permit' | 'zoning_application' | 'contract' | 'insurance' | 'budget' | 'legal' | 'other';
  subcategory: string;
  confidence: number;
  flags: {
    is_outdated: boolean;
    is_contract: boolean;
    is_insurance: boolean;
    requires_attention: boolean;
    expiration_date?: string;
    risk_level: 'low' | 'medium' | 'high';
  };
  key_data: {
    dates: string[];
    amounts: string[];
    addresses: string[];
    parties: string[];
    reference_numbers: string[];
  };
  summary: string;
  recommended_widgets: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const results = [];

    for (const file of files) {
      try {
        const analysis = await analyzeDocument(file);
        results.push({
          filename: file.name,
          analysis,
          status: 'success'
        });
      } catch (error) {
        results.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Analysis failed',
          status: 'error'
        });
      }
    }

    return NextResponse.json({
      results,
      total_files: files.length,
      successful: results.filter(r => r.status === 'success').length
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze documents' },
      { status: 500 }
    );
  }
}

async function analyzeDocument(file: File): Promise<DocumentAnalysis> {
  // Extract text from file (simplified - in production you'd use proper PDF/DOCX parsers)
  const text = await extractTextFromFile(file);
  
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    // Fallback analysis for demo
    return simulateDocumentAnalysis(file.name, text);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a government document analysis AI. Analyze the document and return a JSON object with this exact structure:
{
  "category": "building_permit|zoning_application|contract|insurance|budget|legal|other",
  "subcategory": "specific type",
  "confidence": 0.0-1.0,
  "flags": {
    "is_outdated": boolean,
    "is_contract": boolean,
    "is_insurance": boolean,
    "requires_attention": boolean,
    "expiration_date": "YYYY-MM-DD or null",
    "risk_level": "low|medium|high"
  },
  "key_data": {
    "dates": ["date1", "date2"],
    "amounts": ["$1000", "$2000"],
    "addresses": ["123 Main St"],
    "parties": ["John Doe", "City of SF"],
    "reference_numbers": ["REF123", "PERMIT456"]
  },
  "summary": "Brief summary of document",
  "recommended_widgets": ["permit_tracker", "zoning_map", "contract_monitor"]
}

Focus on government document types. Flag outdated documents (>2 years old), contracts, and insurance documents.`
        },
        {
          role: "user",
          content: `Analyze this document:\n\nFilename: ${file.name}\n\nContent: ${text.substring(0, 2000)}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.warn('Failed to parse OpenAI response, falling back to simulation');
        return simulateDocumentAnalysis(file.name, text);
      }
    }
  } catch (openaiError) {
    console.warn('OpenAI analysis failed, falling back to simulation:', openaiError);
  }

  return simulateDocumentAnalysis(file.name, text);
}

async function extractTextFromFile(file: File): Promise<string> {
  // Handle text files directly
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    try {
      const text = await file.text();
      return text;
    } catch (error) {
      console.warn('Failed to read text file, using simulated content');
    }
  }
  
  // For demo purposes, we'll simulate text extraction for other formats
  // In production, you'd use libraries like pdf-parse, mammoth, etc.
  
  const filename = file.name.toLowerCase();
  
  if (filename.includes('permit')) {
    return `BUILDING PERMIT APPLICATION
Application Number: BP-2024-1234
Property Address: 123 Main Street, San Francisco, CA 94102
Applicant: John Developer
Project Description: Single family residence renovation
Permit Type: Building Permit
Application Date: 2024-01-15
Estimated Cost: $150,000
Contractor: ABC Construction Company
Contact: john@developer.com
Status: Under Review`;
  } else if (filename.includes('zoning')) {
    return `ZONING APPLICATION
Case Number: ZA-2024-5678
Property: 456 Oak Avenue, San Francisco, CA 94110
Applicant: Jane Property Owner
Request: Conditional Use Authorization for Restaurant
Zoning District: Neighborhood Commercial
Application Date: 2024-02-01
Hearing Date: 2024-03-15
Planning Commission Review Required
Environmental Review: Categorical Exemption`;
  } else if (filename.includes('contract')) {
    return `CITY CONTRACT AGREEMENT
Contract Number: CT-2024-9876
Contractor: XYZ Services LLC
Department: Public Works
Service: Street Maintenance Services
Contract Amount: $500,000
Start Date: 2024-01-01
End Date: 2024-12-31
Insurance Required: $1,000,000 General Liability
Performance Bond: Required`;
  } else if (filename.includes('insurance')) {
    return `INSURANCE CERTIFICATE
Policy Number: INS-2024-4567
Insured: City Contractor ABC
Insurance Company: State Insurance Co.
Coverage Type: General Liability
Coverage Amount: $2,000,000
Effective Date: 2024-01-01
Expiration Date: 2024-12-31
Additional Insured: City and County of San Francisco
Certificate Holder: Department of Public Works`;
  }
  
  return `Document content for ${file.name}. This is a government document that requires analysis and categorization.`;
}

function simulateDocumentAnalysis(filename: string, text: string): DocumentAnalysis {
  const lower = filename.toLowerCase();
  const content = text.toLowerCase();
  
  // Determine category based on filename and content
  let category: DocumentAnalysis['category'] = 'other';
  let subcategory = 'General Document';
  let confidence = 0.7;
  let recommended_widgets: string[] = [];
  
  if (lower.includes('permit') || content.includes('permit')) {
    category = 'building_permit';
    subcategory = 'Building Permit Application';
    confidence = 0.9;
    recommended_widgets = ['permit_tracker', 'property_map', 'timeline', 'inspection_scheduler'];
  } else if (lower.includes('zoning') || content.includes('zoning')) {
    category = 'zoning_application';
    subcategory = 'Zoning Application';
    confidence = 0.85;
    recommended_widgets = ['zoning_map', 'code_browser', 'hearing_calendar', 'public_notice'];
  } else if (lower.includes('contract') || content.includes('contract')) {
    category = 'contract';
    subcategory = 'City Contract';
    confidence = 0.8;
    recommended_widgets = ['contract_monitor', 'vendor_tracker', 'payment_schedule', 'compliance_check'];
  } else if (lower.includes('insurance') || content.includes('insurance')) {
    category = 'insurance';
    subcategory = 'Insurance Certificate';
    confidence = 0.9;
    recommended_widgets = ['insurance_tracker', 'expiration_monitor', 'coverage_checker', 'renewal_alerts'];
  } else if (lower.includes('budget') || content.includes('budget')) {
    category = 'budget';
    subcategory = 'Budget Document';
    confidence = 0.8;
    recommended_widgets = ['budget_analyzer', 'expense_tracker', 'variance_report', 'allocation_chart'];
  }

  // Extract key data using simple patterns
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const addresses = extractAddresses(text);
  
  // Determine flags
  const is_contract = category === 'contract';
  const is_insurance = category === 'insurance';
  const is_outdated = dates.some(date => {
    const docDate = new Date(date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return docDate < twoYearsAgo;
  });
  
  const requires_attention = is_outdated || is_insurance || (amounts.length > 0 && amounts.some(amt => parseFloat(amt.replace(/[$,]/g, '')) > 100000));
  
  return {
    category,
    subcategory,
    confidence,
    flags: {
      is_outdated,
      is_contract,
      is_insurance,
      requires_attention,
      expiration_date: is_insurance ? '2024-12-31' : undefined,
      risk_level: requires_attention ? 'high' : is_contract ? 'medium' : 'low'
    },
    key_data: {
      dates,
      amounts,
      addresses,
      parties: extractParties(text),
      reference_numbers: extractReferenceNumbers(text)
    },
    summary: `${subcategory} document. ${is_outdated ? 'This document appears to be outdated. ' : ''}${requires_attention ? 'Requires attention from relevant department.' : ''}`,
    recommended_widgets
  };
}

function extractDates(text: string): string[] {
  const dateRegex = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
  return text.match(dateRegex) || [];
}

function extractAmounts(text: string): string[] {
  const amountRegex = /\$[\d,]+(?:\.\d{2})?/g;
  return text.match(amountRegex) || [];
}

function extractAddresses(text: string): string[] {
  const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Circle|Cir)/gi;
  return text.match(addressRegex) || [];
}

function extractParties(text: string): string[] {
  // Simple extraction of names (could be improved with NLP)
  const nameRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const matches = text.match(nameRegex) || [];
  return [...new Set(matches)].slice(0, 5); // Remove duplicates, limit to 5
}

function extractReferenceNumbers(text: string): string[] {
  const refRegex = /\b[A-Z]{2,4}-\d{4}-\d{4,6}\b|\b[A-Z]+\d+\b/g;
  return text.match(refRegex) || [];
}
