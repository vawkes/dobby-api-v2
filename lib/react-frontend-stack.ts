import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EnvironmentConfig } from '../deployment/config';

export interface ReactFrontendStackProps extends cdk.StackProps {
    domainName?: string;
    subDomain?: string;
    certificate?: acm.ICertificate;
    apiUrl?: string;
    environmentConfig: EnvironmentConfig;
    // Cross-account DNS configuration
    dnsAccountId?: string;
    dnsProfile?: string;
}

export class ReactFrontendStack extends cdk.Stack {
    public readonly bucketName: string;
    public readonly distributionId: string;
    public readonly url: string;

    constructor(scope: Construct, id: string, props: ReactFrontendStackProps) {
        super(scope, id, props);

        const { environmentConfig } = props;
        const envSuffix = environmentConfig.name === 'production' ? '' : `-${environmentConfig.name}`;

        // Create an S3 bucket for the website content with environment-specific naming
        const siteBucket = new s3.Bucket(this, 'ReactSiteBucket', {
            bucketName: props.domainName
                ? `${props.subDomain || 'app'}.${props.domainName}${envSuffix}`
                : `dobby-frontend${envSuffix}`,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: environmentConfig.name === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: environmentConfig.name !== 'production',
        });

        this.bucketName = siteBucket.bucketName;

        // Create Origin Access Identity for CloudFront
        const cloudFrontOAI = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOAI', {
            comment: `OAI for ${id}`,
        });

        // Grant read permissions to CloudFront OAI
        siteBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [siteBucket.arnForObjects('*')],
            principals: [new iam.CanonicalUserPrincipal(cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        }));

        // Create a custom response headers policy for CORS with environment-specific name
        const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'CorsHeadersPolicy', {
            responseHeadersPolicyName: `CorsHeadersPolicy${envSuffix}`,
            corsBehavior: {
                accessControlAllowOrigins: [
                    'https://d1dz25mfg0xsp8.cloudfront.net',
                    'http://localhost:3000',
                    'https://localhost:3000',
                    'https://*.vawkes.com'
                ],
                accessControlAllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
                accessControlAllowHeaders: [
                    'Authorization',
                    'Content-Type',
                    'Origin',
                    'Accept',
                    'X-Requested-With',
                    'X-HTTP-Method-Override',
                    'X-CSRF-Token',
                    'X-Api-Key',
                    'Access-Control-Request-Method',
                    'Access-Control-Request-Headers'
                ],
                accessControlAllowCredentials: true,
                originOverride: true,
            },
            securityHeadersBehavior: {
                contentSecurityPolicy: {
                    contentSecurityPolicy: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;",
                    override: true,
                },
                frameOptions: {
                    frameOption: cloudfront.HeadersFrameOption.DENY,
                    override: true,
                },
                strictTransportSecurity: {
                    accessControlMaxAge: cdk.Duration.days(2 * 365),
                    includeSubdomains: true,
                    preload: true,
                    override: true,
                },
            },
        });

        // API Gateway origin for proxy requests
        // Note: Using default API Gateway domain since API URL is configured at runtime
        // const stageName = environmentConfig.api.stageName;
        const apiGatewayDomain = 'tzdokra5yf.execute-api.us-east-1.amazonaws.com';

        // Create API Gateway origin
        const apiGatewayOrigin = new origins.HttpOrigin(apiGatewayDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });

        // Create CloudFront distribution
        const distribution = new cloudfront.Distribution(this, 'ReactSiteDistribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
                    originAccessIdentity: cloudFrontOAI
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
                responseHeadersPolicy: corsHeadersPolicy,
                compress: true,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(10),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(10),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            enabled: true,
            enableIpv6: true,
        });

        this.distributionId = distribution.distributionId;
        this.url = props?.domainName && props?.subDomain
            ? `https://${props.subDomain}.${props.domainName}`
            : `https://${distribution.distributionDomainName}`;

        // Deploy the React app
        new s3deploy.BucketDeployment(this, 'DeployReactApp', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend-react/build'))],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // Set up DNS if domain details provided
        if (props?.domainName && props?.subDomain && props?.certificate) {
            const certificate = props.certificate;

            const domainName = `${props.subDomain}.${props.domainName}`;

            // Create custom domain for CloudFront
            const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
            if (cfnDistribution.distributionConfig) {
                cfnDistribution.addPropertyOverride('DistributionConfig.Aliases', [domainName]);
                cfnDistribution.addPropertyOverride('DistributionConfig.ViewerCertificate', {
                    AcmCertificateArn: certificate.certificateArn,
                    SslSupportMethod: 'sni-only',
                    MinimumProtocolVersion: 'TLSv1.2_2021'
                });
            }

            new cdk.CfnOutput(this, 'Route53Instructions', {
                value: `In AWS account ${props.dnsAccountId}, create CNAME: ${domainName} pointing to ${distribution.distributionDomainName}`,
                description: 'Route53 setup instructions for DNS account',
            });
            
            // Output DNS setup information for manual configuration
            new cdk.CfnOutput(this, 'CustomDomainName', {
                value: domainName,
                description: 'Custom domain name for the frontend',
                exportName: `ReactFrontendCustomDomain-${environmentConfig.name}`,
            });
        }

        // Outputs with environment-specific export names
        new cdk.CfnOutput(this, 'ReactBucketName', {
            value: siteBucket.bucketName,
            description: 'S3 Bucket Name for React frontend',
            exportName: `ReactFrontendBucketName-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'ReactDistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront Distribution ID for React frontend',
            exportName: `ReactFrontendDistributionId-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'ReactDistributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name for DNS setup',
            exportName: `ReactFrontendDistributionDomainName-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'ReactFrontendURL', {
            value: this.url,
            description: 'Frontend URL (custom domain or CloudFront)',
            exportName: `ReactFrontendURL-${environmentConfig.name}`,
        });
    }
} 