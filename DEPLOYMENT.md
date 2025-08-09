# GovPal Deployment Guide

## Deploying to Vercel

This guide will walk you through deploying the GovPal application to Vercel.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. **Node.js**: Version 18 or higher

### Project Structure

GovPal is a monorepo with the following structure:
```
govpal/
├── apps/
│   └── web/          # Next.js application (main app to deploy)
├── services/          # Python API services
├── config/            # Configuration files
└── vercel.json        # Vercel configuration
```

### Deployment Steps

#### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Select the repository containing GovPal

#### 2. Configure Build Settings

Vercel will automatically detect this is a Next.js project. Use these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### 3. Environment Variables (Optional)

If you need to configure any environment variables:

- Go to Project Settings → Environment Variables
- Add any required variables (e.g., API keys, database URLs)

#### 4. Deploy

1. Click "Deploy"
2. Vercel will automatically:
   - Install dependencies
   - Build the Next.js application
   - Deploy to a production URL

### Vercel Configuration

The `vercel.json` file in the root directory configures the deployment:

```json
{
  "version": 2,
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rootDirectory": "apps/web"
}
```

### API Routes

The following API routes will be available after deployment:

- `/api/government-data` - Search government data
- `/api/manifest/[dept]` - Department manifests
- `/api/document-analysis` - Document analysis
- `/api/execute` - Code execution
- `/api/morph` - Data transformation

### Post-Deployment

1. **Test the Application**: Visit your Vercel URL and test all functionality
2. **Monitor Performance**: Use Vercel Analytics to monitor performance
3. **Set up Custom Domain** (Optional): Configure a custom domain in Vercel settings

### Troubleshooting

#### Build Failures

If the build fails:

1. Check the build logs in Vercel
2. Ensure all dependencies are properly installed
3. Verify the TypeScript compilation passes locally

#### API Route Issues

If API routes don't work:

1. Check that the routes are properly exported
2. Verify the API endpoints are accessible
3. Check Vercel function logs for errors

#### Performance Issues

1. Enable Vercel Analytics
2. Monitor Core Web Vitals
3. Optimize images and assets

### Local Development vs Production

- **Local**: Uses `npm run dev` for development server
- **Production**: Vercel automatically builds and serves the optimized production build

### Continuous Deployment

Vercel automatically deploys on every push to your main branch. You can:

1. Set up preview deployments for pull requests
2. Configure branch-specific deployments
3. Set up automatic testing before deployment

### Support

For deployment issues:
1. Check Vercel documentation
2. Review build logs
3. Contact Vercel support if needed

---

**Note**: The Python API services in the `services/` directory are not deployed to Vercel. They would need to be deployed separately to a platform that supports Python (e.g., Railway, Heroku, or AWS).
