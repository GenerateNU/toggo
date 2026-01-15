import { Config } from "@pulumi/pulumi";
import { createServiceRole } from "./iam";
import { createDopplerRotation } from "./key-rotation";
import { attachAWSPermissionsToUser } from "./permission";
import { createS3Buckets } from "./s3";

export function createAWSInfrastructure(bucketNames: string[], config: Config) {
    // create Doppler rotation IAM resources
    const dopplerRotation = createDopplerRotation({
        dopplerAccountId: "299900769157",
        dopplerWorkspaceSlug: config.require("dopplerWorkspaceSlug"),
    });

    // attach necessary permissions to the Doppler rotation user
    attachAWSPermissionsToUser(dopplerRotation.user);

    // set up S3 infrastructure
    const s3Infra = createS3Infrastructure(bucketNames, config);
    return {
        s3Infra,
        dopplerRotation
    };
}

function createS3Infrastructure(bucketNames: string[], config: Config) {
    const s3Role = createServiceRole("infra-s3-role", [
        {
            Effect: "Allow",
            Action: [
                "s3:CreateBucket",
                "s3:DeleteBucket",
            ],
            Resource: "arn:aws:s3:::*",
        },
    ]);

    const s3Buckets = createS3Buckets(bucketNames, config.require("environment"));

    return {
        s3RoleArn: s3Role.roleArn,
        buckets: s3Buckets,
    };
}