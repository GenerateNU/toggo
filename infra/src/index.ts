import * as pulumi from "@pulumi/pulumi";
import { createAWSInfrastructure } from "./aws";

const S3_BUCKET_NAMES: string[] = ["testt"]

function createInfrastructure() {
    const config = new pulumi.Config();

    const awsInfra = createAWSInfrastructure(S3_BUCKET_NAMES, config);

    return {
        awsInfra,
    };
}

const infrastructure= createInfrastructure();
export const awsInfra = pulumi.output(infrastructure).apply(i => i.awsInfra);