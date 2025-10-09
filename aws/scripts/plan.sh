#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
TERRAFORM_DIR="${REPO_ROOT}/terraform"

command -v aws >/dev/null 2>&1 || { echo "aws CLI is required" >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "terraform is required" >&2; exit 1; }

AWS_PROFILE=${AWS_PROFILE:-default}
AWS_REGION=${AWS_REGION:-$(aws configure get region --profile "${AWS_PROFILE}" 2>/dev/null || echo "us-east-1")}
TF_WORKSPACE=${TF_WORKSPACE:-default}

export AWS_PROFILE AWS_REGION

if [[ "${TF_WORKSPACE}" == "production" ]]; then
  read -r -p "You are about to run terraform plan against production. Continue? [y/N] " confirm
  if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
    echo "Aborting plan against production." >&2
    exit 1
  fi
fi

pushd "${TERRAFORM_DIR}" >/dev/null

terraform init -input=false
terraform workspace select "${TF_WORKSPACE}" >/dev/null 2>&1 || terraform workspace new "${TF_WORKSPACE}"
terraform plan "$@"

popd >/dev/null
