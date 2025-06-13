import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iot from 'aws-cdk-lib/aws-iot'

export class DobbyApiV2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create DynamoDB tables instead of referencing existing ones
    const infoTable = new dynamodb.Table(this, 'DobbyInfoTable', {
      tableName: 'DobbyInfo',
      partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const eventTable = new dynamodb.Table(this, 'DobbyEventTable', {
      tableName: 'DobbyEvent',
      partitionKey: { name: 'event_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Add GSI for querying events by device_id
    eventTable.addGlobalSecondaryIndex({
      indexName: 'device_id-index',
      partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    })

    const dataTable = new dynamodb.Table(this, 'ShiftedDataTable', {
      tableName: 'ShiftedData',
      partitionKey: { name: 'device_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

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
      },
    })

    // Create the IoT Lambda function
    const iotLambda = new NodejsFunction(this, 'GridCubeIoTLambda', {
      entry: 'lambda/iot/gridCubeHandler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      description: 'Processes IoT data from Grid Cube devices',
    });

    // Grant permissions to the IoT Lambda
    infoTable.grantReadWriteData(iotLambda);
    dataTable.grantWriteData(iotLambda);

    // Add permissions for Timestream and IoT Wireless
    iotLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "timestream:WriteRecords",
        "timestream:DescribeEndpoints"
      ],
      resources: ["*"],
    }));

    iotLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "iotwireless:SendDataToWirelessDevice"
      ],
      resources: ["*"],
    }));

    // Create the IoT Core rule to trigger the Lambda
    const iotRule = new iot.CfnTopicRule(this, 'GridCubeIoTRule', {
      ruleName: 'GridCubeDataProcessingRule',
      topicRulePayload: {
        sql: "SELECT * FROM 'iot/topic/+/uplink'",
        actions: [
          {
            lambda: {
              functionArn: iotLambda.functionArn,
            },
          },
        ],
        description: 'Process incoming data from Grid Cube wireless devices',
        ruleDisabled: false,
      },
    });

    // Grant IoT Core permission to invoke the Lambda function
    iotLambda.addPermission('AllowIotInvoke', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: iotRule.attrArn,
    });

    infoTable.grantFullAccess(fn)
    eventTable.grantFullAccess(fn)
    dataTable.grantFullAccess(fn)

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "iotwireless:SendDataToWirelessDevice",
      ],
      resources: ["*"],
    }));

    // Add explicit permission for querying the GSI on DobbyEvent table
    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "dynamodb:Query",
      ],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/DobbyEvent/index/device_id-index`
      ],
    }));

    // Create the Cognito User Pool Authorizer
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'DobbyAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // Create API with the authorizer
    const api = new apigw.LambdaRestApi(this, 'myapi', {
      handler: fn,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'Authorization', 'Content-Type'],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
      },
    });

    // Create an unauthenticated route for public endpoints (like login, docs, etc.)
    const publicResource = api.root.addResource('public');
    publicResource.addMethod('GET', new apigw.LambdaIntegration(fn), {
      authorizationType: apigw.AuthorizationType.NONE,
    });

    // Add an auth resource under public for login/registration
    const authResource = publicResource.addResource('auth');

    // Add specific resources for auth operations with explicit CORS configuration
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', new apigw.LambdaIntegration(fn), {
      authorizationType: apigw.AuthorizationType.NONE,
    });

    // Add a proxy at /public/* to handle all public routes
    publicResource.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(fn),
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: apigw.AuthorizationType.NONE,
      }
    });

    // Add a proxy resource for all other API paths that require authentication
    const protectedProxy = api.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(fn),
      anyMethod: true,
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    });
  }
}