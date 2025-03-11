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

export interface StaticSiteProps extends cdk.StackProps {
    domainName?: string;
    subDomain?: string;
    certificateArn?: string;
}

export class StaticSiteStack extends cdk.Stack {
    public readonly bucketName: string;
    public readonly distributionId: string;
    public readonly url: string;

    constructor(scope: Construct, id: string, props?: StaticSiteProps) {
        super(scope, id, props);

        // Create an S3 bucket for the website
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            bucketName: props?.domainName
                ? `${props.subDomain || 'app'}.${props.domainName}`
                : undefined,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For non-production
            autoDeleteObjects: true, // For non-production
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
            this, 'SiteDistribution', distributionConfig
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

        // Outputs
        new cdk.CfnOutput(this, 'BucketName', {
            value: siteBucket.bucketName,
            description: 'S3 Bucket Name',
        });

        new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront Distribution ID',
        });

        new cdk.CfnOutput(this, 'WebsiteURL', {
            value: this.url,
            description: 'Website URL',
        });
    }
} 