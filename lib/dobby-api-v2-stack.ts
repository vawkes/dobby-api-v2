import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'

export class DobbyApiV2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const infoTable = dynamodb.Table.fromTableName(this, 'DobbyInfoTable', 'DobbyInfo')
    const eventTable = dynamodb.Table.fromTableName(this, 'DobbyEventTable', 'DobbyEvent')

    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
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

    new apigw.LambdaRestApi(this, 'myapi', {
      handler: fn,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    })
  }
}