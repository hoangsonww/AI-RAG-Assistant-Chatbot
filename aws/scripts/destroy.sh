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

if [[ "${TF_WORKSPACE}" == "production" && "${ALLOW_PRODUCTION_DESTROY:-0}" != "1" ]]; then
  echo "Destruction of the production workspace is blocked. Set ALLOW_PRODUCTION_DESTROY=1 to override." >&2
  exit 1
fi

read -r -p "This will destroy all resources for workspace '${TF_WORKSPACE}'. Continue? [y/N] " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
  echo "Destroy cancelled." >&2
  exit 1
fi

read -r -p "Type '${TF_WORKSPACE}' to confirm: " typed
if [[ "${typed}" != "${TF_WORKSPACE}" ]]; then
  echo "Workspace confirmation did not match. Aborting." >&2
  exit 1
fi

pushd "${TERRAFORM_DIR}" >/dev/null

terraform init -input=false
terraform workspace select "${TF_WORKSPACE}" >/dev/null 2>&1 || { echo "Workspace '${TF_WORKSPACE}' does not exist." >&2; exit 1; }
terraform destroy -input=false "$@"

popd >/dev/null
