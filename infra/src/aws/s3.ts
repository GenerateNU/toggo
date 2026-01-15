import * as aws from "@pulumi/aws";

export function createS3Buckets(
    bucketNames: string[],
    environment: string
) {
    return bucketNames.map((name) => {
        const bucketName = `toggo-${environment}-${name}`;

        const bucket = new aws.s3.Bucket(`${name}-bucket`, {
            bucket: bucketName,
            tags: { Environment: environment, ManagedBy: "Pulumi" },
        });

        new aws.s3.BucketServerSideEncryptionConfiguration(`${name}-bucket-sse`, {
            bucket: bucket.id,
            rules: [
                {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256",
                    },
                },
            ],
        });

        // restrict public access
        new aws.s3.BucketVersioning(`${name}-bucket-versioning`, {
            bucket: bucket.id,
            versioningConfiguration: {
                status: "Enabled",
            },
        });

        new aws.s3.BucketPublicAccessBlock(`${name}-public-access-block`, {
            bucket: bucket.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        });

        return { name: bucket.id, arn: bucket.arn };
    });
}