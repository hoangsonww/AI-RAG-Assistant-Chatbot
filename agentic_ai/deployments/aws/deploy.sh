#!/bin/bash
# AWS Deployment Script for Agentic AI Pipeline

set -e

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="${ENVIRONMENT}-agentic-ai-pipeline"
ECR_REPOSITORY_NAME="${ENVIRONMENT}-agentic-ai-pipeline"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Agentic AI Pipeline - AWS Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "\n${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"

# Build and push Docker image
echo -e "\n${YELLOW}Building Docker image...${NC}"
docker build -t ${ECR_REPOSITORY_NAME}:latest -f deployments/aws/Dockerfile ../..

# Create ECR repository if it doesn't exist
echo -e "\n${YELLOW}Creating ECR repository (if not exists)...${NC}"
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION}

# Login to ECR
echo -e "\n${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push image
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:latest"
echo -e "\n${YELLOW}Tagging image: ${ECR_IMAGE}${NC}"
docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_IMAGE}

echo -e "\n${YELLOW}Pushing image to ECR...${NC}"
docker push ${ECR_IMAGE}

echo -e "${GREEN}✓ Docker image pushed successfully${NC}"

# Deploy CloudFormation stack
echo -e "\n${YELLOW}Deploying CloudFormation stack...${NC}"

# Check if stack exists
if aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} 2>/dev/null; then
    echo -e "${YELLOW}Updating existing stack...${NC}"
    OPERATION="update-stack"
else
    echo -e "${YELLOW}Creating new stack...${NC}"
    OPERATION="create-stack"
fi

aws cloudformation ${OPERATION} \
    --stack-name ${STACK_NAME} \
    --template-body file://deployments/aws/cloudformation.yaml \
    --parameters \
        ParameterKey=EnvironmentName,ParameterValue=${ENVIRONMENT} \
        ParameterKey=ContainerImage,ParameterValue=${ECR_IMAGE} \
        ParameterKey=OpenAIApiKey,ParameterValue=${OPENAI_API_KEY} \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION}

echo -e "\n${YELLOW}Waiting for stack operation to complete...${NC}"
aws cloudformation wait stack-${OPERATION//-stack/}-complete \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION}

# Get outputs
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Get Load Balancer URL
LB_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
    --output text)

echo -e "\n${GREEN}Application URL: http://${LB_URL}${NC}"
echo -e "${YELLOW}Note: It may take a few minutes for the service to become available.${NC}"
