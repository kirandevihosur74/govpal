# GovPal Demo Script - Just-in-Time UI Adaptation

## Live Demo Walkthrough (5 minutes)

### 1. **Opening Hook** (30s)
"Welcome to GovPal - where AI doesn't just respond to prompts, it watches how you work and adapts the interface automatically. No buttons to press, no prompts needed - just pure intelligent adaptation."

### 2. **Just-in-Time UI Magic** (2 minutes)
1. **Address Query Demo**:
   - Type in search: "123 Main Street permits"
   - Then: "456 Oak Avenue zoning"
   - "Watch this - the AI detected address patterns and auto-injected a map widget!"
   - Point out purple border and "AI Added" badge

2. **Legal Reference Trigger**:
   - Type: "section 15.2 zoning code"
   - "Legal reference detected - code browser appears automatically"
   - "The UI is learning from your work patterns"

3. **Document Analysis**:
   - Click "Trigger Diff Panel" button
   - "Multiple documents opened - comparison tool auto-appears"
   - "No prompts, no requests - just intelligent adaptation"

### 3. **Adaptation Logging** (45s)
- Scroll to adaptation log
- "Every auto-adaptation is logged and timestamped"
- "Judges can see exactly when and why the UI changed"
- "Full transparency in AI decision-making"

### 4. **Role-Based Foundation** (60s)
1. **Switch to Clerk**: "Base permissions still apply - clerks can't see sensitive widgets"
2. **Switch to Supervisor**: "Full access restored, plus any adaptive widgets"
3. **Department Change**: "Context shifts, but adaptations persist until no longer relevant"

### 5. **MorphLLM for Persistent Changes** (45s)
- Show MorphLLM interface: "This is for permanent config changes"
- Type: "Add budget oversight widget for supervisors"
- "MorphLLM modifies the base manifest - like a code PR"
- "Separates live adaptation from structural changes"

### 6. **Demo Button Showcase** (30s)
- Rapid-fire click demo buttons
- "Each simulates real user behavior patterns"
- "Address queries → Map, Legal refs → Code browser, Multiple docs → Diff panel"
- "This is government UI that thinks ahead"

### 7. **Closing** (30s)
"This is just-in-time government technology - AI that anticipates needs and adapts interfaces in real-time. The future of responsive, intelligent government systems!"

---

## Key Demo Points

### Role Switching Impact:
- **Planner → Clerk**: Map disappears (security/simplicity)
- **Clerk → Supervisor**: All widgets appear (full oversight)
- **Any Role → Department Change**: Complete theme/widget transformation

### MorphLLM Prompts That Work:
✅ "Add a budget widget for finance department"
✅ "Show permit status dashboard" 
✅ "Create analytics chart for response times"
✅ "Display work order management system"

### Visual Cues to Highlight:
- Theme colors changing (green → purple → red)
- Icon changes (PW → P → F)
- Widget count badges updating
- Generated code appearing in real-time
- Execution results showing immediately

### Audience Reactions to Watch For:
- Amazement at instant role switching
- Interest in natural language → code generation
- Questions about security/permissions (great transition to technical details)
- Requests for specific government use cases

---

## 🔧 Technical Deep Dive (if requested)

### Architecture Highlights:
```typescript
// Manifest-driven widgets
interface WidgetManifest {
  roleOverrides: Record<string, Partial<WidgetManifest>>;
  permissions: string[];
}

// Real-time code generation
const response = await fetch('/api/morph', {
  body: JSON.stringify({ prompt, context })
});
```

### Freestyle Integration:
- Serverless code execution (<150ms average)
- Arbitrary npm packages supported
- Secure sandbox environment
- Perfect for government compliance

### Scalability Points:
- Each department can have custom manifests
- Widgets are composable and reusable
- Role permissions scale to any complexity
- AI generation improves with usage

---

## Backup Demo Ideas

If technical issues arise:

1. **Static Role Demo**: Pre-switch between saved states
2. **Code Walkthrough**: Show the manifest JSON files
3. **Future Vision**: Discuss real MorphLLM integration plans
4. **Q&A Pivot**: Turn technical issues into architecture discussion

## 🏆 Success Metrics

Demo is successful if audience:
- Understands role-based UI adaptation
- Sees value in AI-generated government interfaces  
- Asks about implementation/deployment
- Requests specific use case demonstrations
- Wants to try the prompts themselves
