#!/bin/bash

# Dobby API v2 - CDK Bootstrap Script
# This script bootstraps CDK for both develop and production environments

set -e

echo "🚀 Dobby API v2 - CDK Bootstrap Script"
echo "======================================"

# Function to check if AWS profile exists
check_profile() {
    local profile=$1
    if aws configure list-profiles | grep -q "^$profile$"; then
        echo "✅ AWS profile '$profile' found"
        return 0
    else
        echo "❌ AWS profile '$profile' not found"
        return 1
    fi
}

# Function to bootstrap CDK for a profile
bootstrap_cdk() {
    local profile=$1
    local env_name=$2
    
    echo ""
    echo "🔧 Bootstrapping CDK for $env_name environment..."
    echo "   Profile: $profile"
    
    # Get account ID and region
    local account_id=$(aws sts get-caller-identity --profile $profile --query Account --output text)
    local region=$(aws configure get region --profile $profile || echo "us-east-1")
    
    echo "   Account: $account_id"
    echo "   Region: $region"
    
    # Bootstrap CDK
    npx cdk bootstrap aws://$account_id/$region --profile $profile
    
    echo "✅ CDK bootstrap completed for $env_name environment"
}

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "⚠️  CDK CLI not found. Installing globally..."
    npm install -g aws-cdk
fi

echo "📋 CDK Version: $(cdk --version)"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "   Visit: https://aws.amazon.com/cli/"
    exit 1
fi

echo ""
echo "🔍 Checking AWS profiles..."

# Check if profiles exist
develop_profile_exists=false
production_profile_exists=false

if check_profile "dobby_develop"; then
    develop_profile_exists=true
fi

if check_profile "dobby_production"; then
    production_profile_exists=true
fi

if [ "$develop_profile_exists" = false ] && [ "$production_profile_exists" = false ]; then
    echo ""
    echo "❌ Neither AWS profile found!"
    echo "   Please configure your AWS profiles first:"
    echo ""
    echo "   aws configure --profile dobby_develop"
    echo "   aws configure --profile dobby_production"
    echo ""
    exit 1
fi

echo ""
echo "🎯 Starting CDK bootstrap process..."

# Bootstrap develop environment
if [ "$develop_profile_exists" = true ]; then
    bootstrap_cdk "dobby_develop" "develop"
else
    echo "⚠️  Skipping develop environment (profile not found)"
fi

# Bootstrap production environment
if [ "$production_profile_exists" = true ]; then
    bootstrap_cdk "dobby_production" "production"
else
    echo "⚠️  Skipping production environment (profile not found)"
fi

echo ""
echo "🎉 CDK bootstrap completed!"
echo ""
echo "Next steps:"
echo "1. Update deployment/config.ts with your specific settings"
echo "2. Run 'npm run deploy:develop' to deploy to development"
echo "3. Run 'npm run deploy:production' to deploy to production"
echo ""
echo "For more information, see DEPLOYMENT.md" 