import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface DopplerRotationArgs {
    dopplerAccountId: string;
    dopplerWorkspaceSlug: string;
    dopplerUserName?: string;
    userPath?: string;
    extraRoleActions?: aws.iam.PolicyStatement[];
}

export interface DopplerRotationResult {
    user: aws.iam.User;
    rotationPolicy: aws.iam.Policy;
    role: aws.iam.Role;
}

export function createDopplerRotation(args: DopplerRotationArgs): DopplerRotationResult {
    const userName = args.dopplerUserName || "doppler-rotate-user";
    const path = args.userPath || "/doppler/rotate/";

    const user = new aws.iam.User(userName, { path });

    const rotationPolicyStatements: aws.iam.PolicyStatement[] = [
        {
            Effect: "Allow",
            Action: [
                "iam:DeleteAccessKey",
                "iam:CreateAccessKey",
                "iam:ListAccessKeys",
            ],
            Resource: `arn:aws:iam::*:user${path}*`,
        },
    ];

    const rotationPolicy = new aws.iam.Policy("doppler-rotation-policy", {
        description: "Policy for Doppler to rotate IAM user keys",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: rotationPolicyStatements,
        }),
    });

    const role = new aws.iam.Role("doppler-rotation-role", {
        assumeRolePolicy: pulumi
            .all([args.dopplerAccountId, args.dopplerWorkspaceSlug])
            .apply(([accountId, workspaceSlug]) =>
                JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: { AWS: `arn:aws:iam::${accountId}:root` },
                            Action: "sts:AssumeRole",
                            Condition: { StringEquals: { "sts:ExternalId": workspaceSlug } },
                        },
                    ],
                })
            ),
    });

    new aws.iam.RolePolicyAttachment("doppler-role-policy-attach", {
        role: role.name,
        policyArn: rotationPolicy.arn,
    });

    return { user, rotationPolicy, role };
}