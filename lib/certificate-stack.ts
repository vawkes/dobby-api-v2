import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { EnvironmentConfig } from '../deployment/config';

export interface CertificateStackProps extends cdk.StackProps {
    domainName: string;
    subdomainName: string;
    environmentConfig: EnvironmentConfig;
    // Cross-account Route53 configuration
    dnsAccountId: string;
    dnsProfile: string;
}

export class CertificateStack extends cdk.Stack {
    public readonly certificate: acm.ICertificate;
    public readonly certificateArn: string;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        const { domainName, subdomainName, environmentConfig, dnsAccountId } = props;
        const fullDomainName = `${subdomainName}.${domainName}`;

        // For cross-account Route53, we'll use the manual validation method
        // and output the required DNS records for manual setup
        const useManualValidation = dnsAccountId !== environmentConfig.account;

        if (useManualValidation) {
            // Create certificate with DNS validation but don't auto-create records
            this.certificate = new acm.Certificate(this, 'Certificate', {
                domainName: fullDomainName,
                validation: acm.CertificateValidation.fromDns(),
                certificateName: `${environmentConfig.name}-${subdomainName}-cert`,
            });

            // Output the DNS validation records for manual setup
            new cdk.CfnOutput(this, 'CertificateValidationInstructions', {
                value: `Certificate created but requires DNS validation. Check ACM console for validation records.`,
                description: 'Instructions for certificate validation',
            });

        } else {
            // Same-account validation - can auto-create DNS records
            const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName: domainName,
            });

            this.certificate = new acm.Certificate(this, 'Certificate', {
                domainName: fullDomainName,
                validation: acm.CertificateValidation.fromDns(hostedZone),
                certificateName: `${environmentConfig.name}-${subdomainName}-cert`,
            });
        }

        this.certificateArn = this.certificate.certificateArn;

        // Outputs
        new cdk.CfnOutput(this, 'CertificateArn', {
            value: this.certificateArn,
            description: `SSL Certificate ARN for ${fullDomainName}`,
            exportName: `CertificateArn-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'DomainName', {
            value: fullDomainName,
            description: `Domain name for ${environmentConfig.name}`,
            exportName: `DomainName-${environmentConfig.name}`,
        });

        // Add tags
        cdk.Tags.of(this).add('Environment', environmentConfig.name);
        cdk.Tags.of(this).add('Purpose', 'SSL-Certificate');
        cdk.Tags.of(this).add('Domain', fullDomainName);
    }
} 