import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iotwireless from 'aws-cdk-lib/aws-iotwireless'
import * as iot from 'aws-cdk-lib/aws-iot'
import * as path from 'node:path'
import { EnvironmentConfig } from '../deployment/config'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'

export interface DobbyApiV2StackProps extends cdk.StackProps {
  environmentConfig: EnvironmentConfig;
  certificateArn?: string;
}

export class DobbyApiV2Stack extends cdk.Stack {
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: DobbyApiV2StackProps) {
    super(scope, id, props)

    const { environmentConfig } = props;
    const envSuffix = environmentConfig.name === 'production' ? '' : `-${environmentConfig.name}`;
    const iotSuffix = environmentConfig.name === 'production' ? '' : `_${environmentConfig.name}`;

    // Get existing DynamoDB tables - Used when importing existing tables. 
    const infoTable = dynamodb.Table.fromTableName(this, 'DobbyInfoTable', 'DobbyInfo');
    const eventTable = dynamodb.Table.fromTableName(this, 'DobbyEventTable', 'DobbyEvent');
    const dataTable = dynamodb.Table.fromTableName(this, 'DobbyDataTable', 'DobbyData');
    const productionLineTable = dynamodb.Table.fromTableName(this, 'ProductionLineTable', 'ProductionLine');

    // Create company-related DynamoDB tables
    const companiesTable = new dynamodb.Table(this, 'CompaniesTable', {
      tableName: 'Companies',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const companyUsersTable = new dynamodb.Table(this, 'CompanyUsersTable', {
      tableName: 'CompanyUsers',
      partitionKey: { name: 'company_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for user_id queries on CompanyUsers table
    companyUsersTable.addGlobalSecondaryIndex({
      indexName: 'user_id-index',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'company_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const companyDevicesTable = new dynamodb.Table(this, 'CompanyDevicesTable', {
      tableName: 'CompanyDevices',
      partitionKey: { name: 'company_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for device_id queries on CompanyDevices table
    companyDevicesTable.addGlobalSecondaryIndex({
      indexName: 'device_id-index',
      partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'company_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create DynamoDB tables
    // const infoTable = new dynamodb.Table(this, 'DobbyInfoTable', {
    //   tableName: 'DobbyInfo', 
    //   partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    //   removalPolicy: cdk.RemovalPolicy.RETAIN,
    // });
    
    // const eventTable = new dynamodb.Table(this, 'DobbyEventTable', {
    //   tableName: 'DobbyEvent',
    //   partitionKey: { name: 'event_id', type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    //   removalPolicy: cdk.RemovalPolicy.RETAIN,
    // });

    // // Add GSI for device_id queries
    // eventTable.addGlobalSecondaryIndex({
    //   indexName: 'device_id-index',
    //   partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // const dataTable = new dynamodb.Table(this, 'DobbyDataTable', {
    //   tableName: 'DobbyData',
    //   partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    //   removalPolicy: cdk.RemovalPolicy.RETAIN,
    // });

    // Create the production line table
    // const productionLineTable = new dynamodb.Table(this, 'ProductionLineTable', {
    //   tableName: 'ProductionLine',
    //   partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    //   removalPolicy: cdk.RemovalPolicy.RETAIN,
    // });

    // Create Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'DobbyUserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create App Client
    const userPoolClient = new cognito.UserPoolClient(this, 'DobbyUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // Output the User Pool ID and App Client ID
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });

    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        PRODUCTION_LINE_TABLE: productionLineTable.tableName,
      }
    })

    infoTable.grantFullAccess(fn)
    eventTable.grantFullAccess(fn)
    dataTable.grantFullAccess(fn)
    productionLineTable.grantFullAccess(fn)
    companiesTable.grantFullAccess(fn)
    companyUsersTable.grantFullAccess(fn)
    companyDevicesTable.grantFullAccess(fn)

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "iotwireless:SendDataToWirelessDevice",
      ],
      resources: [
        `arn:aws:iotwireless:${this.region}:${this.account}:WirelessDevice/*`
      ],
    }));

    // Add explicit permission for querying the GSI on DobbyEvent table
    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "dynamodb:Query",
      ],
      resources: [
        `${eventTable.tableArn}/index/device_id-index`
      ],
    }));

    // Create the Cognito User Pool Authorizer
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'DobbyAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // Create API with custom domain and environment-specific stage
    const api = new apigw.LambdaRestApi(this, 'dobbyapi', {
      handler: fn,
      proxy: false,
      deployOptions: {
        stageName: environmentConfig.apiStage.stageName,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'http://localhost:3000',
          'https://localhost:3000',
          'http://localhost:3001',  // Additional localhost port
          'https://d1dz25mfg0xsp8.cloudfront.net', // Development CloudFront
          'https://d2996moha39e78.cloudfront.net',
          'https://d-dncsqj6zw0.execute-api.us-east-1.amazonaws.com', // Production CloudFront (actual)
          'https://api.gridcube.dev.vawkes.com', // Development API domain
          'https://api.gridcube.vawkes.com', // Production API domain
          'https://*.vawkes.com',      // Fallback for other subdomains
        ],
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'Authorization', 'Content-Type'],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
      },
    });

    // Add custom domain for API if configured
    let apiDomainName: string | undefined;
    let customDomain: apigw.DomainName | undefined;
    
    if (environmentConfig.api && props.certificateArn) {
      apiDomainName = `${environmentConfig.api.subdomain}.${environmentConfig.api.domain}`;

      // Create custom domain for API Gateway
      customDomain = new apigw.DomainName(this, 'ApiCustomDomain', {
        domainName: apiDomainName,
        certificate: acm.Certificate.fromCertificateArn(this, 'ApiCertificate', props.certificateArn)
      });

      // Create base path mapping for the custom domain
      new apigw.BasePathMapping(this, 'ApiBasePathMapping', {
        domainName: customDomain,
        restApi: api,
        stage: api.deploymentStage,
      });
    }
    
    // Create public routes (NO AUTH)
    const publicResource = api.root.addResource('public');
    publicResource.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(fn),
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: apigw.AuthorizationType.NONE,
      }
    });

    // Add an auth resource under public for login/registration
    const authResource = publicResource.addResource('auth');

    // Add specific resources for auth operations with explicit CORS configuration
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', new apigw.LambdaIntegration(fn), {
      authorizationType: apigw.AuthorizationType.NONE,
    });

    // Add a proxy resource for all other API paths that require authentication
    api.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(fn),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    });


    // Create the data handler Lambda function
    const dataHandlerFn = new NodejsFunction(this, 'DataHandlerFunction', {
      entry: path.join(__dirname, '../data-handler-ts/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PRODUCTION_LINE_TABLE: productionLineTable.tableName,
      }
    });

    // Grant necessary permissions to the data handler
    productionLineTable.grantReadWriteData(dataHandlerFn);
    infoTable.grantReadWriteData(dataHandlerFn);
    eventTable.grantReadWriteData(dataHandlerFn);
    dataTable.grantReadWriteData(dataHandlerFn);

    // Add IoT Wireless permissions
    dataHandlerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'iotwireless:SendDataToWirelessDevice',
        'iotwireless:GetWirelessDevice',
        'iotwireless:ListWirelessDevices'
      ],
      resources: ['*']  // IoT Wireless doesn't support resource-level permissions yet
    }));

    // Add explicit DynamoDB permissions
    dataHandlerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan'
      ],
      resources: [
        productionLineTable.tableArn,
        infoTable.tableArn,
        eventTable.tableArn,
        dataTable.tableArn,
        `${productionLineTable.tableArn}/index/*`,
        `${infoTable.tableArn}/index/*`,
        `${eventTable.tableArn}/index/*`,
        `${dataTable.tableArn}/index/*`
      ]
    }));

    // Create IoT rule for Sidewalk app data with environment-specific name
    const sidewalkRule = new iot.CfnTopicRule(this, 'SidewalkAppDataRule', {
      ruleName: `sidewalk_data_rule${iotSuffix}`,
      topicRulePayload: {
        sql: 'SELECT * FROM "sidewalk/app_data"',
        ruleDisabled: false,
        awsIotSqlVersion: '2016-03-23',
        actions: [
          {
            lambda: {
              functionArn: dataHandlerFn.functionArn
            }
          }
        ]
      }
    });

    // Grant IoT permission to invoke the Lambda function
    dataHandlerFn.addPermission('AllowIoTRuleInvoke', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: sidewalkRule.attrArn
    });

    // Create the main Sidewalk destination with environment-specific names
    const sidewalkDestination = new iotwireless.CfnDestination(this, 'SidewalkDestination', {
      name: `SidewalkDataDestination${envSuffix}`,
      description: `Main destination for Sidewalk device data processing - ${environmentConfig.name}`,
      expression: `sidewalk_data_rule${iotSuffix}`,
      expressionType: 'RuleName',
      roleArn: new iam.Role(this, 'SidewalkDestinationRole', {
        assumedBy: new iam.ServicePrincipal('iotwireless.amazonaws.com'),
        inlinePolicies: {
          'AllowLambdaInvoke': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                resources: [dataHandlerFn.functionArn],
              }),
            ],
          }),
        },
      }).roleArn,
      tags: [
        {
          key: 'Environment',
          value: environmentConfig.name
        },
        {
          key: 'Service',
          value: 'Sidewalk'
        }
      ]
    });

    // Add permission for IoT Wireless to invoke the Lambda function
    dataHandlerFn.addPermission('AllowIoTWirelessInvoke', {
      principal: new iam.ServicePrincipal('iotwireless.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: sidewalkDestination.attrArn,
    });

    // Add Sidewalk-specific permissions to the data handler Lambda
    dataHandlerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'iotwireless:GetWirelessDevice',
        'iotwireless:GetWirelessDeviceStatistics',
        'iotwireless:ListWirelessDevices',
        'iotwireless:UpdateWirelessDevice',
      ],
      resources: ['*'],
    }));

    // Export the API endpoint
    this.apiEndpoint = api.url as string;

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.apiEndpoint,
      description: 'API Gateway endpoint URL',
      exportName: `${environmentConfig.name}-ApiEndpoint`,
    });

    // Output the API domain
    if (apiDomainName) {
      new cdk.CfnOutput(this, 'ApiDomainName', {
        value: apiDomainName,
        description: 'API Gateway custom domain',
        exportName: `ApiGatewayDomainName-${environmentConfig.name}`,
      });
    }

    // Output the API Gateway regional domain for DNS setup
    if (customDomain) {
      new cdk.CfnOutput(this, 'ApiGatewayRegionalDomain', {
        value: customDomain.domainName,
        description: 'API Gateway custom domain name',
        exportName: `ApiGatewayRegionalDomain-${environmentConfig.name}`,
      });
    }

    // Output the API Gateway hosted zone ID for DNS setup
    new cdk.CfnOutput(this, 'ApiGatewayHostedZoneId', {
      value: 'Z1UJRXOUMOOFQ8', // API Gateway regional hosted zone ID (static)
      description: 'API Gateway hosted zone ID for DNS A record',
      exportName: `ApiGatewayHostedZoneId-${environmentConfig.name}`,
    });
    
  }
}