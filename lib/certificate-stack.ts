import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { EnvironmentConfig } from '../deployment/config';

export interface CertificateStackProps extends cdk.StackProps {
    environmentConfig: EnvironmentConfig;
}

export class CertificateStack extends cdk.Stack {
    public readonly frontendCertificate: acm.ICertificate;
    public readonly backendCertificate: acm.ICertificate;
    public readonly frontendCertificateArn: string;
    public readonly backendCertificateArn: string;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        const { environmentConfig } = props;

        // Create frontend domain certificate
        const frontendDomain = `${environmentConfig.frontend?.subdomain}.${environmentConfig.frontend?.domain}`;
        console.log(`Creating frontend certificate for ${frontendDomain} with email validation`);
        
        this.frontendCertificate = new acm.Certificate(this, 'FrontendCertificate', {
            domainName: frontendDomain,
            validation: acm.CertificateValidation.fromEmail(),
        });

        this.frontendCertificateArn = this.frontendCertificate.certificateArn;

        // Create backend domain certificate
        const backendDomain = `${environmentConfig.api?.subdomain}.${environmentConfig.api?.domain}`;
        console.log(`Creating backend certificate for ${backendDomain} with email validation`);
        
        this.backendCertificate = new acm.Certificate(this, 'BackendCertificate', {
            domainName: backendDomain,
            validation: acm.CertificateValidation.fromEmail(),
        });

        this.backendCertificateArn = this.backendCertificate.certificateArn;

        // Outputs
        new cdk.CfnOutput(this, 'FrontendDomain', {
            value: frontendDomain,
            description: 'Frontend domain name',
            exportName: `FrontendDomain-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'BackendDomain', {
            value: backendDomain,
            description: 'Backend domain name',
            exportName: `BackendDomain-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'FrontendCertificateArn', {
            value: this.frontendCertificateArn,
            description: 'Frontend certificate ARN',
            exportName: `FrontendCertificateArn-${environmentConfig.name}`,
        });

        new cdk.CfnOutput(this, 'BackendCertificateArn', {
            value: this.backendCertificateArn,
            description: 'Backend certificate ARN',
            exportName: `BackendCertificateArn-${environmentConfig.name}`,
        });
    }
} 