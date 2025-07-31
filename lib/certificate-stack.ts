import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { EnvironmentConfig } from '../deployment/config';

export interface CertificateStackProps extends cdk.StackProps {
    environmentConfig: EnvironmentConfig;
}

export class CertificateStack extends cdk.Stack {
    public readonly certificate: acm.ICertificate;
    public readonly certificateArn: string;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        const { environmentConfig } = props;

        // Create a single wildcard certificate for the entire domain
        const domainName = "vawkes.com"
        
        // For cross-account DNS, we'll use email validation instead of DNS validation
        console.log(`Creating certificate for ${domainName} with email validation (cross-account DNS)`);
        
        // Create certificate with email validation
        this.certificate = new acm.Certificate(this, 'DomainCertificate', {
            domainName: `*.${domainName}`,
            validation: acm.CertificateValidation.fromEmail(), // Use email validation instead
        });

        this.certificateArn = this.certificate.certificateArn;

        // Outputs
        new cdk.CfnOutput(this, 'DomainName', {
            value: domainName,
            description: 'Domain name',
            exportName: `DomainName-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'CertificateArn', {
            value: this.certificateArn,
            description: 'Certificate ARN for the entire domain',
            exportName: `CertificateArn-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'WildcardDomain', {
            value: `*.${domainName}`,
            description: 'Wildcard domain pattern',
            exportName: `WildcardDomain-${environmentConfig.name}`,
        });
    }
} 