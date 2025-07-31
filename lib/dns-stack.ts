import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { EnvironmentConfig } from '../deployment/config';


export interface DnsStackProps extends cdk.StackProps {
    environmentConfig: EnvironmentConfig;
    frontendDistributionDomainName: string;
    apiGatewayDomainName: string;
}

export class DnsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: DnsStackProps) {
        super(scope, id, props);

        const { environmentConfig, frontendDistributionDomainName, apiGatewayDomainName } = props;

        // Get the domain name
        const domainName = environmentConfig.frontend?.domain || environmentConfig.api?.domain;
        
        if (!domainName) {
            throw new Error('No domain configured in environment config');
        }

        // Look up the hosted zone
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: domainName,
        });

        // Create DNS records for frontend if we have the distribution domain
        if (environmentConfig.frontend && frontendDistributionDomainName) {
            const frontendSubdomain = environmentConfig.frontend.subdomain;
            const frontendDomain = `${frontendSubdomain}.${domainName}`;

            // Create CNAME record for frontend
            new route53.CnameRecord(this, 'FrontendCNAME', {
                zone: hostedZone,
                recordName: frontendSubdomain,
                domainName: frontendDistributionDomainName,
                ttl: cdk.Duration.minutes(5),
                comment: `CNAME for ${environmentConfig.name} frontend`,
            });

            new cdk.CfnOutput(this, 'FrontendDomain', {
                value: frontendDomain,
                description: 'Frontend domain name',
                exportName: `FrontendDomain-${environmentConfig.name}`,
            });
        }

        // Create DNS records for API if we have the API Gateway domain
        if (environmentConfig.api && apiGatewayDomainName) {
            const apiSubdomain = environmentConfig.api.subdomain;
            const apiDomain = `${apiSubdomain}.${domainName}`;

            // Create A record for API Gateway
            // Note: Using a simple CNAME for now, can be updated to A record with alias later
            new route53.CnameRecord(this, 'ApiCNAME', {
                zone: hostedZone,
                recordName: apiSubdomain,
                domainName: apiGatewayDomainName,
                ttl: cdk.Duration.minutes(5),
                comment: `CNAME for ${environmentConfig.name} API`,
            });

            new cdk.CfnOutput(this, 'ApiDomain', {
                value: apiDomain,
                description: 'API domain name',
                exportName: `ApiDomain-${environmentConfig.name}`,
            });
        }

        // Output the hosted zone ID for reference
        new cdk.CfnOutput(this, 'HostedZoneId', {
            value: hostedZone.hostedZoneId,
            description: 'Hosted Zone ID',
            exportName: `HostedZoneId-${environmentConfig.name}`,
        });

        // Add environment-specific tags
        Object.entries(environmentConfig.tags).forEach(([key, value]) => {
            cdk.Tags.of(this).add(key, value);
        });
    }
} 