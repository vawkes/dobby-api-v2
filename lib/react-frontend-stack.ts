import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EnvironmentConfig } from '../deployment/config';

export interface ReactFrontendStackProps extends cdk.StackProps {
    domainName?: string;
    subDomain?: string;
    certificateArn?: string;
    apiUrl?: string;
    environmentConfig: EnvironmentConfig;
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
                    'https://localhost:3000'
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
        const stageName = environmentConfig.api.stageName;
        const apiGatewayDomain = 'tzdokra5yf.execute-api.us-east-1.amazonaws.com';

        // Create API Gateway origin
        const apiGatewayOrigin = new origins.HttpOrigin(apiGatewayDomain, {
            originPath: `/${stageName}`, // Use environment-specific stage name
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
            additionalBehaviors: {
                // Add a behavior for /api/* to proxy to API Gateway
                '/api/*': {
                    origin: apiGatewayOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                    responseHeadersPolicy: corsHeadersPolicy,
                },
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
        this.url = `https://${distribution.distributionDomainName}`;

        // Deploy the React app
        new s3deploy.BucketDeployment(this, 'DeployReactApp', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend-react/build'))],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // Set up DNS if domain details provided
        if (props?.domainName && props?.subDomain && props?.certificateArn) {
            const certificate = acm.Certificate.fromCertificateArn(
                this, 'Certificate', props.certificateArn
            );

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

            const zone = route53.HostedZone.fromLookup(this, 'Zone', {
                domainName: props.domainName,
            });

            new route53.ARecord(this, 'SiteAliasRecord', {
                recordName: props.subDomain,
                zone,
                target: route53.RecordTarget.fromAlias(
                    new targets.CloudFrontTarget(distribution)
                ),
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

        new cdk.CfnOutput(this, 'ReactWebsiteURL', {
            value: this.url,
            description: 'React Website URL',
            exportName: `ReactFrontendURL-${environmentConfig.name}`,
        });

        if (props?.apiUrl) {
            new cdk.CfnOutput(this, 'ApiEndpoint', {
                value: props.apiUrl,
                description: 'API Gateway endpoint URL',
                exportName: `ApiEndpointUrl-${environmentConfig.name}`,
            });
        }
    }
} 