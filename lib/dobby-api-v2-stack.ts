import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'

export class DobbyApiV2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const infoTable = dynamodb.Table.fromTableName(this, 'DobbyInfoTable', 'DobbyInfo')
    const eventTable = dynamodb.Table.fromTableName(this, 'DobbyEventTable', 'DobbyEvent')

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
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    })

    infoTable.grantFullAccess(fn)
    eventTable.grantFullAccess(fn)

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "iotwireless:SendDataToWirelessDevice",
      ],
      resources: ["*"],
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
        allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'Authorization'],
      },
    });

    // Create an unauthenticated route for public endpoints (like login, docs, etc.)
    const publicResource = api.root.addResource('public');
    publicResource.addMethod('GET', new apigw.LambdaIntegration(fn), {
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