import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export class FlowerBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ================= DynamoDB =================
    const table = new dynamodb.Table(this, "FlowerTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // ================= Lambda API =================
    // const api = new lambda.Function(this, "ApiLambda", {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   architecture: lambda.Architecture.ARM_64,
    //   handler: "index.handler",
    //   code: lambda.Code.fromAsset("lib/lambda/api"),
    //   timeout: cdk.Duration.seconds(10),
    //   memorySize: 256,
    //   environment: {
    //     TABLE_NAME: table.tableName,
    //   },
    // });

    const api = new NodejsFunction(this, "ApiLambda", {
      entry: path.join(__dirname, "../lib/lambda/api/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(api);

    // ================= Function URL =================
    const fnUrl = api.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
      },
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: fnUrl.url,
    });
  }
}