#!/bin/bash
# DevMentor Deployment Script
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

REGION="us-east-1"
STACK_NAME="devmentor-stack"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="devmentor-frontend-${ACCOUNT_ID}"

echo "🚀 Deploying DevMentor to AWS..."
echo "Region: $REGION | Account: $ACCOUNT_ID"

# ── Step 1: Deploy CloudFormation stack ─────────────────────────────
echo ""
echo "📦 Step 1: Deploying infrastructure via CloudFormation..."
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION

LAMBDA_ROLE=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaRoleArn'].OutputValue" \
  --output text --region $REGION)
echo "✅ Infrastructure deployed. Lambda role: $LAMBDA_ROLE"

# ── Step 2: Package and deploy Lambda functions ──────────────────────
echo ""
echo "⚡ Step 2: Deploying Lambda functions..."

for agent in teacher-agent code-reviewer debugger-agent; do
  echo "  Deploying $agent..."
  cd aws-lambda/$agent
  
  # Install dependencies
  npm install --production --silent
  
  # Create zip
  zip -r ../..//tmp/${agent}.zip . -x "*.md" > /dev/null
  
  cd ../..
  
  # Get function name
  case $agent in
    "teacher-agent") FUNC_NAME="devmentor-teacher-agent" ;;
    "code-reviewer") FUNC_NAME="devmentor-code-reviewer" ;;
    "debugger-agent") FUNC_NAME="devmentor-debugger-agent" ;;
  esac
  
  aws lambda update-function-code \
    --function-name $FUNC_NAME \
    --zip-file fileb:///tmp/${agent}.zip \
    --region $REGION > /dev/null
  
  echo "  ✅ $FUNC_NAME deployed"
done

# ── Step 3: Create API Gateway ───────────────────────────────────────
echo ""
echo "🌐 Step 3: Setting up API Gateway..."

API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='DevMentorAPI'].id" \
  --output text --region $REGION)

if [ -z "$API_ID" ]; then
  echo "  Creating new API Gateway..."
  API_ID=$(aws apigateway create-rest-api \
    --name DevMentorAPI \
    --query id --output text --region $REGION)
fi

ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/'].id" \
  --output text --region $REGION)

# Create /chat endpoint
create_endpoint() {
  local path=$1
  local func_name=$2
  
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part $path \
    --query id --output text --region $REGION 2>/dev/null || \
    aws apigateway get-resources \
      --rest-api-id $API_ID \
      --query "items[?pathPart=='$path'].id" \
      --output text --region $REGION)
  
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION > /dev/null 2>&1 || true

  LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${func_name}"
  
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION > /dev/null
  
  echo "  ✅ /$path endpoint configured"
}

create_endpoint "chat" "devmentor-teacher-agent"
create_endpoint "review" "devmentor-code-reviewer"
create_endpoint "debug" "devmentor-debugger-agent"

# Deploy API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION > /dev/null

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
echo "  ✅ API deployed: $API_URL"

# ── Step 4: Build and deploy frontend ───────────────────────────────
echo ""
echo "🎨 Step 4: Building and deploying frontend..."

echo "VITE_API_URL=$API_URL" > .env.production

npm install --silent
npm run build

aws s3 sync dist/ s3://$BUCKET_NAME --delete --region $REGION > /dev/null

WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo "  ✅ Frontend deployed: $WEBSITE_URL"

# ── Done! ─────────────────────────────────────────────────────────────
echo ""
echo "🎉 DevMentor deployed successfully!"
echo ""
echo "  🌐 Frontend: $WEBSITE_URL"
echo "  🔌 API:      $API_URL"
echo ""
echo "Next: Update src/config.js with your API URL if needed"