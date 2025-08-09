import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();

    // Use OpenAI for enhanced code generation
    let generatedCode;
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      generatedCode = await generateWithOpenAI(prompt, context);
    } else {
      // Fallback to simulated generation
      generatedCode = generateUICode(prompt, context);
    }

    return NextResponse.json({
      code: generatedCode,
      explanation: `Generated UI modification based on: "${prompt}"`
    });
  } catch (error) {
    console.error('MorphLLM API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate UI code' },
      { status: 500 }
    );
  }
}

async function generateWithOpenAI(prompt: string, context: any): Promise<string> {
  try {
    const systemPrompt = `You are MorphLLM, an AI that generates TypeScript code for government UI widgets.

Context:
- Department: ${context.department}
- Role: ${context.role}
- Current widgets: ${context.manifest?.widgets?.map((w: any) => w.type).join(', ') || 'none'}

Generate executable TypeScript code that returns a widget configuration object.
The code should export a default function that returns an object with:
- type: widget type
- title: human readable title
- data: relevant data for the widget
- message: success message

Focus on government/municipal use cases. Make the data realistic for ${context.department} department.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    let generatedCode = completion.choices[0]?.message?.content || '';
    
    // Ensure the code is wrapped in a proper export default function
    if (!generatedCode.includes('export default')) {
      generatedCode = `export default () => {\n${generatedCode}\n};`;
    }

    return generatedCode;
  } catch (error) {
    console.error('OpenAI generation error:', error);
    // Fallback to simulated generation
    return generateUICode(prompt, { department: context.department, role: context.role });
  }
}

function generateUICode(prompt: string, context: any): string {
  // Simple code generation based on prompt keywords
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes('budget') || lowercasePrompt.includes('financial')) {
    return `
export default () => {
  const budgetData = {
    total: 2500000,
    spent: 1750000,
    remaining: 750000,
    categories: [
      { name: 'Infrastructure', amount: 1200000, color: '#3B82F6' },
      { name: 'Personnel', amount: 800000, color: '#10B981' },
      { name: 'Equipment', amount: 300000, color: '#F59E0B' },
      { name: 'Emergency', amount: 200000, color: '#EF4444' }
    ]
  };
  
  return {
    type: 'budget_widget',
    title: 'Budget Overview',
    data: budgetData,
    message: 'Dynamic budget widget generated successfully!'
  };
};`;
  }
  
  if (lowercasePrompt.includes('permit') || lowercasePrompt.includes('application')) {
    return `
export default () => {
  const permitData = {
    pending: 23,
    approved: 45,
    rejected: 7,
    recent: [
      { id: 'P2024-001', type: 'Building', status: 'approved', date: '2024-01-15' },
      { id: 'P2024-002', type: 'Zoning', status: 'pending', date: '2024-01-14' },
      { id: 'P2024-003', type: 'Electrical', status: 'approved', date: '2024-01-13' }
    ]
  };
  
  return {
    type: 'permit_dashboard',
    title: 'Permit Status Dashboard',
    data: permitData,
    message: 'Permit tracking widget created!'
  };
};`;
  }
  
  if (lowercasePrompt.includes('chart') || lowercasePrompt.includes('graph') || lowercasePrompt.includes('analytic')) {
    return `
export default () => {
  const analyticsData = {
    metrics: {
      satisfaction: 87,
      efficiency: 92,
      responseTime: '2.4 hours'
    },
    trends: [
      { month: 'Jan', value: 85 },
      { month: 'Feb', value: 88 },
      { month: 'Mar', value: 91 },
      { month: 'Apr', value: 87 }
    ]
  };
  
  return {
    type: 'analytics_widget',
    title: 'Performance Analytics',
    data: analyticsData,
    message: 'Analytics dashboard generated!'
  };
};`;
  }
  
  // Default response for unrecognized prompts
  return `
export default () => {
  const currentTime = new Date().toLocaleString();
  const userPrompt = "${prompt}";
  const department = "${context.department}";
  const role = "${context.role}";
  
  return {
    type: 'custom_widget',
    title: 'Custom Generated Widget',
    data: {
      prompt: userPrompt,
      department: department,
      role: role,
      generatedAt: currentTime,
      features: [
        'Dynamic UI generation',
        'Role-based permissions',
        'Real-time updates',
        'Custom styling'
      ]
    },
    message: 'Custom widget generated based on your request!'
  };
};`;
}
