#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
TERRAFORM_DIR="${REPO_ROOT}/terraform"

command -v aws >/dev/null 2>&1 || { echo "aws CLI is required" >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "terraform is required" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 1; }

AWS_PROFILE=${AWS_PROFILE:-default}
AWS_REGION=${AWS_REGION:-$(aws configure get region --profile "${AWS_PROFILE}" 2>/dev/null || echo "us-east-1")}
TF_WORKSPACE=${TF_WORKSPACE:-default}
IMAGE_TAG=${LUMINA_IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}

export AWS_PROFILE AWS_REGION TF_VAR_frontend_image_tag="${IMAGE_TAG}" TF_VAR_backend_image_tag="${IMAGE_TAG}"

pushd "${TERRAFORM_DIR}" >/dev/null

terraform init -input=false
terraform workspace select "${TF_WORKSPACE}" >/dev/null 2>&1 || terraform workspace new "${TF_WORKSPACE}"

echo "[1/5] Ensuring ECR repositories exist..."
terraform apply -input=false -auto-approve -target=module.ecr

FRONTEND_REPO=$(terraform output -raw frontend_ecr_repository_url)
BACKEND_REPO=$(terraform output -raw backend_ecr_repository_url)

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [[ -z "${ACCOUNT_ID}" ]]; then
  echo "Unable to determine AWS account ID" >&2
  exit 1
fi

echo "[2/5] Logging into Amazon ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "[3/5] Building Docker images with tag ${IMAGE_TAG}..."
docker build -t "${FRONTEND_REPO}:${IMAGE_TAG}" "${REPO_ROOT}/client"
docker build -t "${BACKEND_REPO}:${IMAGE_TAG}" "${REPO_ROOT}/server"

echo "[4/5] Pushing images to Amazon ECR..."
docker push "${FRONTEND_REPO}:${IMAGE_TAG}"
docker push "${BACKEND_REPO}:${IMAGE_TAG}"

echo "[5/5] Applying Terraform stack..."
terraform apply -input=false -auto-approve

popd >/dev/null

echo "Deployment complete. Active image tag: ${IMAGE_TAG}"
