import { NextRequest, NextResponse } from 'next/server';
import { FreestyleSandboxes } from 'freestyle-sandboxes';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // Initialize Freestyle client
    const api = new FreestyleSandboxes({
      apiKey: process.env.FREESTYLE_API_KEY || 'demo_key', // Use demo for now
    });

    // For demo purposes, we'll simulate code execution
    // In production, you would use the actual Freestyle API
    const result = simulateExecution(code);

    return NextResponse.json({
      success: true,
      result: result,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Code execution error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        result: null
      },
      { status: 500 }
    );
  }
}

function simulateExecution(code: string) {
  try {
    // Extract the function body and simulate execution
    // This is a simplified simulation for demo purposes
    
    if (code.includes('budgetData')) {
      return {
        type: 'budget_widget',
        title: 'Budget Overview',
        data: {
          total: 2500000,
          spent: 1750000,
          remaining: 750000,
          categories: [
            { name: 'Infrastructure', amount: 1200000, color: '#3B82F6' },
            { name: 'Personnel', amount: 800000, color: '#10B981' },
            { name: 'Equipment', amount: 300000, color: '#F59E0B' },
            { name: 'Emergency', amount: 200000, color: '#EF4444' }
          ]
        },
        message: 'Dynamic budget widget generated successfully!'
      };
    }
    
    if (code.includes('permitData')) {
      return {
        type: 'permit_dashboard',
        title: 'Permit Status Dashboard',
        data: {
          pending: 23,
          approved: 45,
          rejected: 7,
          recent: [
            { id: 'P2024-001', type: 'Building', status: 'approved', date: '2024-01-15' },
            { id: 'P2024-002', type: 'Zoning', status: 'pending', date: '2024-01-14' },
            { id: 'P2024-003', type: 'Electrical', status: 'approved', date: '2024-01-13' }
          ]
        },
        message: 'Permit tracking widget created!'
      };
    }
    
    if (code.includes('analyticsData')) {
      return {
        type: 'analytics_widget',
        title: 'Performance Analytics',
        data: {
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
        },
        message: 'Analytics dashboard generated!'
      };
    }
    
    // Default custom widget
    return {
      type: 'custom_widget',
      title: 'Custom Generated Widget',
      data: {
        generatedAt: new Date().toLocaleString(),
        features: [
          'Dynamic UI generation',
          'Role-based permissions',
          'Real-time updates',
          'Custom styling'
        ]
      },
      message: 'Custom widget generated based on your request!'
    };
    
  } catch (error) {
    throw new Error(`Code execution failed: ${error}`);
  }
}
