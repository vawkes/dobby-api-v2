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

export interface ReactFrontendStackProps extends cdk.StackProps {
    domainName?: string;
    subDomain?: string;
    certificateArn?: string;
    apiUrl?: string; // URL of the API for environment configuration
}

export class ReactFrontendStack extends cdk.Stack {
    public readonly bucketName: string;
    public readonly distributionId: string;
    public readonly url: string;

    constructor(scope: Construct, id: string, props?: ReactFrontendStackProps) {
        super(scope, id, props);

        // Create an S3 bucket for the website
        const siteBucket = new s3.Bucket(this, 'ReactSiteBucket', {
            bucketName: props?.domainName
                ? `${props.subDomain || 'app'}.${props.domainName}`
                : undefined,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN, // RETAIN for production to prevent accidental deletion
            autoDeleteObjects: false, // Set to false for production
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
        });

        this.bucketName = siteBucket.bucketName;

        // CloudFront distribution configuration
        let distributionConfig: cloudfront.DistributionProps = {
            defaultBehavior: {
                origin: new origins.S3Origin(siteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
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
        };

        // Add certificate and custom domain if provided
        if (props?.domainName && props?.subDomain && props?.certificateArn) {
            const certificate = acm.Certificate.fromCertificateArn(
                this, 'Certificate', props.certificateArn
            );

            distributionConfig = {
                ...distributionConfig,
                certificate,
                domainNames: [`${props.subDomain}.${props.domainName}`],
            };
        }

        // Create CloudFront distribution
        const distribution = new cloudfront.Distribution(
            this, 'ReactSiteDistribution', distributionConfig
        );

        this.distributionId = distribution.distributionId;
        this.url = `https://${distribution.distributionDomainName}`;

        // Set up DNS if domain details provided
        if (props?.domainName && props?.subDomain && props?.certificateArn) {
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

        // Create a JSON config file with environment variables
        const envConfigPath = path.join(__dirname, '../frontend-react/build/env-config.json');

        // Create a deployment to the S3 bucket (only after the frontend is built)
        // This will be done through the deploy-to-aws.js script instead of here

        // Outputs
        new cdk.CfnOutput(this, 'ReactBucketName', {
            value: siteBucket.bucketName,
            description: 'S3 Bucket Name for React frontend',
            exportName: 'ReactFrontendBucketName',
        });

        new cdk.CfnOutput(this, 'ReactDistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront Distribution ID for React frontend',
            exportName: 'ReactFrontendDistributionId',
        });

        new cdk.CfnOutput(this, 'ReactWebsiteURL', {
            value: this.url,
            description: 'React Website URL',
            exportName: 'ReactFrontendURL',
        });

        if (props?.apiUrl) {
            new cdk.CfnOutput(this, 'ApiEndpoint', {
                value: props.apiUrl,
                description: 'API Gateway endpoint URL',
                exportName: 'ApiEndpointUrl',
            });
        }
    }
} 