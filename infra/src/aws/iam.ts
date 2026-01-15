import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface IAMRoleResult {
    role: aws.iam.Role;
    policy: aws.iam.RolePolicy;
    roleArn: pulumi.Output<string>;
}

export function createServiceRole(
    roleName: string,
    policyStatements: aws.iam.PolicyStatement[]
): IAMRoleResult {
    const role = new aws.iam.Role(roleName, {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: { AWS: "*" },
                Action: "sts:AssumeRole",
            }],
        }),
    });

    const policy = new aws.iam.RolePolicy(`${roleName}-policy`, {
        role: role.id,
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: policyStatements,
        }),
    });

    return { role, policy, roleArn: pulumi.secret(role.arn) };
}