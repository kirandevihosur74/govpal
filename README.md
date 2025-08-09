# GovPal - Dynamic Government UI Platform

A cutting-edge government platform showcasing **MorphLLM-powered dynamic UI generation** with **Freestyle code execution**. Experience how AI can dynamically modify government interfaces based on user roles, departments, and real-time needs.

## Key Features

### 🧠 MorphLLM Integration
- **AI-Powered UI Generation**: Natural language prompts generate functional UI components
- **Real-time Code Execution**: Generated code runs instantly via Freestyle serverless platform
- **Context-Aware**: AI understands department context, user roles, and current interface state

### Dynamic Role-Based UI
- **Adaptive Layouts**: Interface transforms based on user role (Planner, Clerk, Supervisor)
- **Manifest-Driven Architecture**: JSON manifests define department-specific widget configurations
- **Smart Permission System**: Widgets automatically hide/show based on role permissions

### Department-Specific Interfaces
- **Public Works**: Infrastructure maps, project timelines, work order management
- **Planning**: Zoning maps, permit applications, code browser
- **Finance**: Budget dashboards, approval workflows, financial analytics

### ⚡ Live Demo Scenarios
- Switch roles instantly to see UI adapt in real-time
- Generate new widgets with natural language prompts
- Experience government workflow optimization

## 🚀 Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **AI Integration**: MorphLLM (simulated), Freestyle Sandboxes
- **Backend**: Node.js API routes
- **Architecture**: Manifest-driven, serverless-first

## Getting Started

### Prerequisites
- Node.js 20 (see `.nvmrc`)
- pnpm package manager

### Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository>
   cd govpal
   pnpm install
   ```

2. **Start Development**:
   ```bash
   pnpm web:dev
   ```

3. **Open Browser**: Navigate to http://localhost:3000

### 🎮 Demo Walkthrough

1. **Role Switching Demo**:
   - Switch from "Planner" to "Clerk" - watch the map disappear
   - Switch to "Supervisor" - see all widgets appear

2. **Department Context**:
   - Change from "Public Works" to "Planning" - see widgets adapt
   - Notice theme colors and icons change automatically

3. **MorphLLM in Action**:
   - Try prompt: "Add a budget widget for finance department"
   - Try prompt: "Show permit status dashboard"
   - Try prompt: "Create analytics chart for response times"

## Architecture

### Manifest-Driven UI
```typescript
interface DepartmentManifest {
  name: string;
  widgets: WidgetManifest[];
  roles: Record<string, string[]>;
  theme: { primary: string; secondary: string; icon: string };
}
```

### MorphLLM Flow
1. **User Input**: Natural language prompt describing desired UI change
2. **Code Generation**: AI generates executable TypeScript code
3. **Freestyle Execution**: Code runs in secure serverless environment
4. **Dynamic Update**: UI updates with generated components

### API Endpoints
- `POST /api/morph` - Generate UI code from natural language
- `POST /api/execute` - Execute generated code via Freestyle
- `GET /api/manifest/[dept]` - Load department configuration

## Future Roadmap

- **Real MorphLLM Integration**: Connect to actual MorphLLM service
- **Freestyle Production Setup**: Full Freestyle API integration
- **Advanced Permissions**: Fine-grained role-based access control
- **Real-time Collaboration**: Multiple users editing interfaces simultaneously
- **Widget Marketplace**: Community-contributed government widgets

## 🏆 Demo Value

This platform demonstrates:
- **AI-First Government Tech**: How AI can revolutionize government interfaces
- **Adaptive User Experiences**: Interfaces that mold to user needs
- **Rapid Prototyping**: Generate functional UI components instantly
- **Modern Government Architecture**: Serverless, manifest-driven design

Perfect for showcasing the future of government technology at hackathons, demos, and proof-of-concepts!