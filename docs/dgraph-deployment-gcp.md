🎉 Hypermode Agents Beta: natural language agent creation, 2,000+ integrations, export to code [Try Agents now! →](https://hypermode.com/login)

[Hypermode home page![light logo](https://mintcdn.com/hypermode/KxRLwu8b3AQQ03et/images/logo/light.svg?fit=max&auto=format&n=KxRLwu8b3AQQ03et&q=85&s=cbf249051f5830b6b3a36f9397c8c1cd)![dark logo](https://mintcdn.com/hypermode/KxRLwu8b3AQQ03et/images/logo/dark.svg?fit=max&auto=format&n=KxRLwu8b3AQQ03et&q=85&s=ec9b5c357dcbd3f26eb8dc9adbfd6ed4)](https://docs.hypermode.com/)

Search...

Ctrl K

Search...

Navigation

Dgraph Self-Managed

Deploying Dgraph on Google Cloud Run

[Hypermode](https://docs.hypermode.com/introduction) [Modus](https://docs.hypermode.com/modus/overview) [Dgraph](https://docs.hypermode.com/dgraph/overview) [Badger](https://docs.hypermode.com/badger/overview)

# [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#deploying-dgraph-on-google-cloud-run)  Deploying Dgraph on Google Cloud Run

This guide walks you through deploying Dgraph, a distributed graph database, on Google Cloud Run.

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#prerequisites)  Prerequisites

- Google Cloud Platform account with billing enabled
- Google Cloud SDK ( `gcloud`) installed and configured
- Docker installed locally

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#architecture-overview)  Architecture Overview

Dgraph consists of three main components:

- **Alpha nodes**: Store and serve data
- **Zero nodes**: Manage cluster metadata and coordinate transactions
- **Ratel**: Web UI for database administration (optional)

This example uses the Dgraph standalone Docker image which includes both the alpha and zero nodes in a single container.

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#step-1%3A-project-setup)  Step 1: Project Setup

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/cloud-run-dashboard.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=7c68a672701cfa39c0811a5376f372f4)First, set up your Google Cloud project and enable necessary APIs:

Copy

Ask AI

```
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable file.googleapis.com
gcloud services enable vpcaccess.googleapis.com

```

Create a Filestore instance for persistent data:

Copy

Ask AI

```
gcloud filestore instances create dgraph-data \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=dgraph,capacity=1GB \
  --network=name=default

```

Create VPC connector for private network access (this is required for the Filestore volume)

Copy

Ask AI

```
# Create VPC connector for private network access
gcloud compute networks vpc-access connectors create dgraph-connector \
  --network default \
  --region us-central1 \
  --range 10.8.0.0/28 \
  --min-instances 2 \
  --max-instances 3

```

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#step-2%3A-create-dgraph-configuration)  Step 2: Create Dgraph Configuration

Create a directory for your Dgraph deployment:

Copy

Ask AI

```
mkdir dgraph-cloudrun
cd dgraph-cloudrun

```

Create a `Dockerfile`:

Copy

Ask AI

```
FROM dgraph/standalone:latest

# Create directories for data and config
RUN mkdir -p /dgraph/data /dgraph/config

# Copy configuration files
COPY dgraph-config.yml /dgraph/config

# Set working directory
WORKDIR /dgraph

# Expose the Dgraph ports
EXPOSE 8080 9080 8000

# Start Dgraph in standalone mode
ADD start.sh /
RUN chmod +x /start.sh

CMD ["/start.sh"]

```

Create `dgraph-config.yml`:

Copy

Ask AI

```
# Dgraph configuration for standalone deployment

datadir: /dgraph/data
bindall: true

# HTTP & GRPC ports
port_offset: 0
grpc_port: 9080
http_port: 8080

# Alpha configuration
alpha:
  lru_mb: 1024

# Security settings (adjust as needed)
whitelist: 0.0.0.0/0

# Logging
logtostderr: true
v: 2

# Performance tuning for cloud deployment
badger:
  compression: snappy
  numgoroutines: 8

```

Create `start.sh`:

Copy

Ask AI

```
#!/bin/bash

# Start Dgraph Zero
dgraph zero --tls use-system-ca=true --config /dgraph/config/dgraph-config.yml &

# Start Dgraph Alpha
dgraph alpha --tls use-system-ca=true --config /dgraph/config/dgraph-config.yml &

# Wait for all processes to finish
wait

```

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#step-3%3A-build-and-push-container-image)  Step 3: Build and Push Container Image

Build your Docker image and push it to Google Container Registry.You’ll first need to authorize `docker` to use the `gcloud` credentials:

Copy

Ask AI

```
gcloud auth configure-docker

```

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/auth-docker.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=4175778d395951fe34f04e8adb9892b2)

Note the use of `--platform linux/amd64` flag, this is important when building the image on an Apple Silicon Mac.

Copy

Ask AI

```
# Build the image
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/dgraph-cr .

```

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/docker-build.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=8a9e2071aff2ece8c42ededdcc423b9c)Push the container to Google Container Registry

Copy

Ask AI

```
# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/dgraph-cr

```

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#step-4%3A-deploy-to-cloud-run)  Step 4: Deploy to Cloud Run

Deploy Dgraph Alpha to Cloud Run:

Copy

Ask AI

```
gcloud run deploy dgraph-cr \
  --image gcr.io/$PROJECT_ID/dgraph-cr \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --vpc-connector dgraph-connector \
  --add-volume name=dgraph-storage,type=nfs,location=$FILESTORE_IP:/dgraph \
  --add-volume-mount volume=dgraph-storage,mount-path=/dgraph/data

```

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/cloud-run-deployed.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=0efa1eb62aaabdd07e0ddeebbf5349fb)Our Dgraph instance is now available at `https://dgraph-cr-<REVISION_ID>.us-central1.run.app`

Note that we are binding Dgraph’s HTTP port 8080 to port 80

Verify deployment:

Copy

Ask AI

```
curl https://dgraph-cr-588562224274.us-central1.run.app/health

```

Expected response:

Copy

Ask AI

```
[{"instance":"alpha","address":"localhost:7080","status":"healthy","group":"1","version":"v24.1.4","uptime":1258,"lastEcho":1756412281,"ongoing":["opRollup"],"ee_features":["backup_restore","cdc"],"max_assigned":8}]

```

Ratel web UI can be run locally using `docker run -it -p 8000:8000 dgraph/ratel:latest`

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/ratel-setup.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=113bfe8ff8d15415608638e4abb821a1)![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/ratel-web-ui.png?fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=260c76a4f8055aae939bc086922f42a2)

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#dgraph-cloud-migration-steps)  Dgraph Cloud Migration Steps

To migrate from Dgraph Cloud to your self-hosted Cloud Run instance, follow these steps:

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#migration-data)  Migration Data

We’ve now downloaded the following files from Dgraph Cloud:

- `gql_schema.gz` \- your GraphQL schema exported from Dgraph Cloud
- `schema.gz` \- your Dgraph schema export from Dgraph Cloud
- `rdf.gz` \- your RDF data export from Dgraph Cloud

We’ll now migrate this data to our Dgraph instance running in Cloud Run.

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#prepare-migration-environment)  Prepare Migration Environment

Create a local directory for migration files:

Copy

Ask AI

```
mkdir dgraph-migration
cd dgraph-migration

# Extract the compressed files
gunzip gql_schema.gz
gunzip schema.gz
gunzip rdf.gz

# Verify file contents
head -20 gql_schema
head -20 schema
head -20 rdf

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#schema-migration)  Schema Migration

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#option-a%3A-load-schema-via-live-loader)  Option A: Load Schema Via Live Loader

Copy

Ask AI

```
dgraph live --schema schema \
  --alpha https://api.yourdomain.com:443 \
  --zero http://api.yourdomain.com:443

```

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#option-b%3A-load-schema-via-http-api)  Option B: Load Schema Via HTTP API

Copy

Ask AI

```
curl -X POST https://api.yourdomain.com/admin/schema \
  -H "Content-Type: application/rdf" \
  --data-binary @schema

```

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#option-c%3A-load-graphql-schema-if-using-graphql)  Option C: Load GraphQL Schema (if using GraphQL)

Copy

Ask AI

```
curl -X POST https://api.yourdomain.com/admin/schema/graphql \
  -H "Content-Type: text/plain" \
  --data-binary @gql_schema

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#data-migration)  Data Migration

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#option-a%3A-data-migration-using-live-loader)  Option A: Data Migration Using Live Loader

For large datasets, use the live loader for optimal performance:

Copy

Ask AI

```
dgraph live --files rdf \
  --alpha https://api.yourdomain.com:443 \
  --zero https://api.yourdomain.com:443 \
  --batch 1000 \
  --conc 10

```

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#option-b%3A-data-migration-using-bulk-loader-offline)  Option B: Data Migration Using Bulk Loader (Offline)

For very large datasets, consider using the Dgraph bulk loader. This requires temporarily scaling down your Cloud Run instance:**Create Bulk Loader Container**Create `bulk-loader.Dockerfile`:

Copy

Ask AI

```
FROM dgraph/dgraph:latest

# Copy TLS certs and data
COPY tls/ /dgraph/tls
COPY rdf /data/rdf
COPY schema /data/schema

# Create output directory
RUN mkdir -p /data/out

WORKDIR /data

# Run bulk loader
CMD ["dgraph", "bulk", \\
  "--files", "/data/rdf", \\
  "--schema", "/data/schema", \\
  "--out", "/data/out", \\
  "--zero", "localhost:5080"]

```

**Run Bulk Load Process**

Copy

Ask AI

```
# Build bulk loader image
docker build -f bulk-loader.Dockerfile -t gcr.io/$PROJECT_ID/dgraph-bulk-loader .
docker push gcr.io/$PROJECT_ID/dgraph-bulk-loader

# Scale down current Dgraph instance
gcloud run services update dgraph-alpha --min-instances=0 --max-instances=0 --region us-central1

# Run bulk loader as a job (this will process data offline)
gcloud run jobs create dgraph-bulk-load \
  --image gcr.io/$PROJECT_ID/dgraph-bulk-loader \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --max-retries 1 \
  --parallelism 1 \
  --task-timeout 7200

# Execute the bulk load job
gcloud run jobs execute dgraph-bulk-load --region us-central1

```

**Copy Bulk Load Results To Filestore**

Copy

Ask AI

```
# Create a temporary VM to copy data
gcloud compute instances create dgraph-migration-vm \
  --zone us-central1-a \
  --machine-type n1-standard-2 \
  --image-family debian-11 \
  --image-project debian-cloud

# SSH into the VM and mount Filestore
gcloud compute ssh dgraph-migration-vm --zone us-central1-a

# On the VM:
sudo apt update && sudo apt install nfs-common -y
sudo mkdir -p /mnt/dgraph
sudo mount -t nfs $FILESTORE_IP:/dgraph /mnt/dgraph

# Copy bulk load output to Filestore
# (You'll need to copy the output from the bulk loader job)
sudo cp -r /path/to/bulk/output/* /mnt/dgraph/

# Restart Dgraph service
gcloud run services update dgraph-alpha --min-instances=1 --max-instances=3 --region us-central1

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#validation-and-testing)  Validation and Testing

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#schema-validation)  Schema Validation

Copy

Ask AI

```
curl -X POST https://api.yourdomain.com/query \
-H "Content-Type: application/json" \
-d '{"query": "schema {}"}'

```

#### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#data-validation)  Data Validation

Copy

Ask AI

```
# Check data counts
curl -X POST https://api.yourdomain.com/query \
  --cert tls/client.clientuser.crt \
  --key tls/client.clientuser.key \
  --cacert tls/ca.crt \
  -H "Content-Type: application/json" \
  -d '{"query": "{ nodeCount(func: has(dgraph.type)) }"}'

# Validate specific data samples
curl -X POST https://api.yourdomain.com/query \
  --cert tls/client.clientuser.crt \
  --key tls/client.clientuser.key \
  --cacert tls/ca.crt \
  -H "Content-Type: application/json" \
  -d '{"query": "{ sample(func: has(dgraph.type), first: 10) { uid expand(_all_) } }"}'

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#migration-cleanup)  Migration Cleanup

Copy

Ask AI

```
# Clean up migration files
rm -rf dgraph-migration/

# Remove temporary bulk loader resources
gcloud run jobs delete dgraph-bulk-load --region us-central1

# Delete migration VM (if used)
gcloud compute instances delete dgraph-migration-vm --zone us-central1-a

# Update DNS to point to new instance (if needed)
# Update your application configuration to use new endpoint

```

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#optional-configurations)  Optional Configurations

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#optimize-cloud-run-configuration)  Optimize Cloud Run Configuration

Copy

Ask AI

```
# Adjust resource allocation based on migrated data size
gcloud run services update dgraph-alpha \
  --memory 8Gi \
  --cpu 4 \
  --max-instances 5 \
  --region us-central1

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#set-up-iam-and-security)  Set up IAM and Security

Create a service account for Dgraph:

Copy

Ask AI

```
gcloud iam service-accounts create dgraph-service-account

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:dgraph-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#configure-health-checks)  Configure Health Checks

Create a health check endpoint by modifying your container to include a health check script:

Copy

Ask AI

```
# Add to your Dockerfile
COPY healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

```

Create `healthcheck.sh`:

Copy

Ask AI

```
#!/bin/bash
curl -f http://localhost:8080/health || exit 1

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#testing-your-deployment)  Testing Your Deployment

Once deployed, test your Dgraph instance:

Copy

Ask AI

```
# Get the Cloud Run service URL
SERVICE_URL=$(gcloud run services describe dgraph-cr --platform managed --region us-central1 --format 'value(status.url)')

# Test the health endpoint
curl $SERVICE_URL/health

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#set-up-monitoring-and-logging)  Set Up Monitoring and Logging

Enable Cloud Monitoring for your Cloud Run service:

Copy

Ask AI

```
# Create an alert policy
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml

```

Create `alert-policy.yaml`:

Copy

Ask AI

```
displayName: "Dgraph High Memory Usage"
conditions:
  - displayName: "Memory utilization"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" resource.label.service_name="dgraph-alpha"'
      comparison: COMPARISON_GT
      thresholdValue: 0.8

```

### [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#multi-region-deployment)  Multi-Region Deployment

For high availability, deploy across multiple regions:

Copy

Ask AI

```
# Deploy to multiple regions
for region in us-central1 us-east1 europe-west1; do
  gcloud run deploy dgraph-rc-$region \
    --image gcr.io/$PROJECT_ID/dgraph-alpha \
    --platform managed \
    --region $region \
    --allow-unauthenticated
done

```

## [​](https://docs.hypermode.com/dgraph/self-managed/cloud-run\#troubleshooting)  Troubleshooting

Common issues and solutions:

1. **Container startup fails**: Check logs with `gcloud run services logs read dgraph-alpha`
2. **Memory issues**: Increase memory allocation or optimize queries
3. **Network connectivity**: Verify VPC connector configuration
4. **Data persistence**: Ensure proper volume mounting and permissions

Was this page helpful?

YesNo

[Suggest edits](https://github.com/hypermodeinc/docs/edit/main/dgraph/self-managed/cloud-run.mdx)

[Self Hosting Guide](https://docs.hypermode.com/dgraph/self-hosted) [Render](https://docs.hypermode.com/dgraph/self-managed/render)

Assistant

Responses are generated using AI and may contain mistakes.

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/cloud-run-dashboard.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=937dbf065cb1383b8e5ee2997c9f76e2)

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/auth-docker.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=b31805abcf6dd0ca008be794481b9055)

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/docker-build.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=ac3882d36e7e0fec9c84a7bdbefeb7c4)

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/cloud-run-deployed.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=256bd906ba3e73b3ac30ff4e22894380)

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/ratel-setup.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=4cc964c1a503025e7eb0d7c702208c3e)

![](https://mintcdn.com/hypermode/Bh8TudK94wxY1WpI/images/dgraph/guides/cloud-run/ratel-web-ui.png?w=840&fit=max&auto=format&n=Bh8TudK94wxY1WpI&q=85&s=ecc0c63738d0997c81c8dd4f9b7a05c2)