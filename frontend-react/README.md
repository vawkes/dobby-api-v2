# Dobby API React Frontend

This is a React-based frontend for the Dobby API, written in TypeScript. It's designed to be deployed to AWS using S3 and CloudFront for a serverless architecture.

## Technology Stack

- React 19
- TypeScript
- AWS CDK for infrastructure
- AWS S3 for hosting
- AWS CloudFront for content delivery
- React Router (planned for future)
- React Hook Form with Zod validation
- React Toastify for notifications

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally (optional)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Deployment

The application is designed to be deployed to AWS using the CDK stack defined in the root project. The deployment process:

1. Sets up an S3 bucket for hosting
2. Configures CloudFront for content delivery
3. Sets up proper security policies
4. Uploads the built React application
5. Invalidates the CloudFront cache

### Deploying to AWS

```bash
# From the frontend-react directory
npm run deploy
```

This will:
1. Deploy the CDK stack for infrastructure
2. Build the React application
3. Create a runtime configuration file
4. Upload the built files to S3
5. Invalidate the CloudFront cache

### Environment Variables

You can configure the following environment variables for deployment:

- `DOMAIN_NAME`: Your domain name (optional)
- `SUB_DOMAIN`: Subdomain for the frontend (default: 'app')
- `CERTIFICATE_ARN`: ARN of your ACM certificate (required for custom domain)
- `AWS_PROFILE`: AWS profile to use (default: 'dobby_develop')
- `AWS_REGION`: AWS region to deploy to (default: from AWS config)
- `API_URL`: URL of the backend API

## Project Structure

```
frontend-react/
├── public/             # Static assets
├── src/                # Source code
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   ├── hooks/          # Custom React hooks
│   ├── context/        # React context providers
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main App component
│   └── index.tsx       # Entry point
└── deploy-to-aws.js    # Deployment script
```

## Best Practices

This project follows these best practices:

1. **TypeScript** for type safety
2. **Environment configuration** for different deployment environments
3. **AWS best practices** for S3 and CloudFront:
   - Proper caching strategies
   - CloudFront invalidation
   - S3 bucket policies
4. **Security**:
   - No public bucket access
   - HTTPS enforced via CloudFront
   - Content security policies

## License

Private - All rights reserved
