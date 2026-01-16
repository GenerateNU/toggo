import * as aws from "@pulumi/aws";

export function attachAWSPermissionsToUser(user: aws.iam.User) {
    const s3Policy = new aws.iam.Policy("doppler-user", {
        description: "AWS access only to Pulumi-managed resources",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "s3:ListBucket",
                    ],
                    Resource: "arn:aws:s3:::*",
                    Condition: {
                        StringEquals: {
                            "s3:ResourceTag/ManagedBy": "Pulumi",
                        },
                    },
                },
                {
                    Effect: "Allow",
                    Action: [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:DeleteObject",
                        "s3:ListMultipartUploadParts",
                        "s3:AbortMultipartUpload",
                    ],
                    Resource: "arn:aws:s3:::*/*",
                    Condition: {
                        StringEqualsIfExists: {
                            "s3:ResourceTag/ManagedBy": "Pulumi",
                        },
                    },
                },
            ],
        }),
    });

    new aws.iam.UserPolicyAttachment("doppler-user-attach", {
        user: user.name,
        policyArn: s3Policy.arn,
    });
}