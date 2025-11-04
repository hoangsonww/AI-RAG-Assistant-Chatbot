#!/bin/bash
# Azure Deployment Script for Agentic AI Pipeline

set -e

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AZURE_LOCATION=${AZURE_LOCATION:-eastus}
RESOURCE_GROUP="${ENVIRONMENT}-agentic-ai-rg"
DEPLOYMENT_NAME="${ENVIRONMENT}-agentic-ai-deployment"
ACR_NAME="${ENVIRONMENT}agenticaiacr"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Agentic AI Pipeline - Azure Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install it first.${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Get Azure subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "\n${YELLOW}Azure Subscription ID: ${SUBSCRIPTION_ID}${NC}"

# Create resource group
echo -e "\n${YELLOW}Creating resource group...${NC}"
az group create \
    --name ${RESOURCE_GROUP} \
    --location ${AZURE_LOCATION}

echo -e "${GREEN}✓ Resource group created${NC}"

# Create Azure Container Registry
echo -e "\n${YELLOW}Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group ${RESOURCE_GROUP} \
    --name ${ACR_NAME} \
    --sku Standard \
    --admin-enabled true \
    || echo "ACR already exists"

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show \
    --name ${ACR_NAME} \
    --resource-group ${RESOURCE_GROUP} \
    --query loginServer \
    -o tsv)

echo -e "${GREEN}✓ ACR created: ${ACR_LOGIN_SERVER}${NC}"

# Build and push Docker image
echo -e "\n${YELLOW}Building Docker image...${NC}"
cd ../..
docker build -t ${ACR_NAME}.azurecr.io/agentic-ai:latest -f deployments/azure/Dockerfile .

echo -e "\n${YELLOW}Logging in to ACR...${NC}"
az acr login --name ${ACR_NAME}

echo -e "\n${YELLOW}Pushing image to ACR...${NC}"
docker push ${ACR_NAME}.azurecr.io/agentic-ai:latest

echo -e "${GREEN}✓ Docker image pushed successfully${NC}"

# Deploy ARM template
echo -e "\n${YELLOW}Deploying ARM template...${NC}"

CONTAINER_IMAGE="${ACR_LOGIN_SERVER}/agentic-ai:latest"

az deployment group create \
    --resource-group ${RESOURCE_GROUP} \
    --name ${DEPLOYMENT_NAME} \
    --template-file deployments/azure/arm-template.json \
    --parameters \
        environmentName=${ENVIRONMENT} \
        location=${AZURE_LOCATION} \
        containerImage=${CONTAINER_IMAGE} \
        openAIApiKey=${OPENAI_API_KEY} \
    --mode Incremental

echo -e "${GREEN}✓ ARM template deployed successfully${NC}"

# Get Container App identity
echo -e "\n${YELLOW}Configuring Container App identity...${NC}"
CONTAINER_APP_NAME="${ENVIRONMENT}-agentic-ai-app"
PRINCIPAL_ID=$(az containerapp show \
    --name ${CONTAINER_APP_NAME} \
    --resource-group ${RESOURCE_GROUP} \
    --query identity.principalId \
    -o tsv)

# Grant ACR pull permission to Container App
az role assignment create \
    --assignee ${PRINCIPAL_ID} \
    --role AcrPull \
    --scope /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ContainerRegistry/registries/${ACR_NAME}

# Grant Key Vault access to Container App
KEY_VAULT_NAME="${ENVIRONMENT}-agentic-kv"
az role assignment create \
    --assignee ${PRINCIPAL_ID} \
    --role "Key Vault Secrets User" \
    --scope /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT_NAME}

echo -e "${GREEN}✓ Identity and permissions configured${NC}"

# Get outputs
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Deployment Outputs:${NC}"
az deployment group show \
    --resource-group ${RESOURCE_GROUP} \
    --name ${DEPLOYMENT_NAME} \
    --query properties.outputs \
    -o table

# Get Container App FQDN
FQDN=$(az deployment group show \
    --resource-group ${RESOURCE_GROUP} \
    --name ${DEPLOYMENT_NAME} \
    --query properties.outputs.containerAppFQDN.value \
    -o tsv)

echo -e "\n${GREEN}Application URL: https://${FQDN}${NC}"
echo -e "${YELLOW}Note: It may take a few minutes for the service to become available.${NC}"
