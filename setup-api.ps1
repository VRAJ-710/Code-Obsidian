$ACCOUNT_ID = "013579168807"
$REGION = "us-east-1"

# Delete old APIs
Write-Host "Cleaning up..."
aws apigateway delete-rest-api --rest-api-id j8gusfegm5 --region $REGION 2>$null

# Create API
Write-Host "Creating API..."
$API_ID = aws apigateway create-rest-api `
  --name devmentor-api `
  --region $REGION `
  --query 'id' `
  --output text
Write-Host "API_ID=$API_ID"

$ROOT_ID = aws apigateway get-resources `
  --rest-api-id $API_ID `
  --region $REGION `
  --query 'items[0].id' `
  --output text
Write-Host "ROOT_ID=$ROOT_ID"

function Create-Endpoint {
  param($PATH_NAME, $LAMBDA_NAME)
  Write-Host ""
  Write-Host "Setting up /$PATH_NAME..."

  $RESOURCE_ID = aws apigateway create-resource `
    --rest-api-id $API_ID `
    --parent-id $ROOT_ID `
    --path-part $PATH_NAME `
    --region $REGION `
    --query 'id' `
    --output text
  Write-Host "  Resource ID: $RESOURCE_ID"

  # POST method
  aws apigateway put-method `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method POST `
    --authorization-type NONE `
    --region $REGION | Out-Null

  # POST integration
  aws apigateway put-integration `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method POST `
    --type AWS_PROXY `
    --integration-http-method POST `
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}/invocations" `
    --region $REGION | Out-Null
  Write-Host "  POST done"

  # OPTIONS method
  aws apigateway put-method `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --authorization-type NONE `
    --region $REGION | Out-Null

  # Write request template to file
  $reqTemplate = '{"application/json":"{\"statusCode\":200}"}'
  [System.IO.File]::WriteAllText("$PWD\req-template.json", $reqTemplate)

  aws apigateway put-integration `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --type MOCK `
    --request-templates file://req-template.json `
    --passthrough-behavior WHEN_NO_MATCH `
    --region $REGION | Out-Null
  Write-Host "  OPTIONS integration done"

  # Write method response params to file
  $methodResponseParams = '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}'
  [System.IO.File]::WriteAllText("$PWD\method-params.json", $methodResponseParams)

  $responseModels = '{"application/json":"Empty"}'
  [System.IO.File]::WriteAllText("$PWD\response-models.json", $responseModels)

  aws apigateway put-method-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --response-models file://response-models.json `
    --response-parameters file://method-params.json `
    --region $REGION | Out-Null
  Write-Host "  OPTIONS method response done"

  # Write integration response params to file
  $integrationResponseParams = '{"method.response.header.Access-Control-Allow-Headers":"''Content-Type,Authorization''","method.response.header.Access-Control-Allow-Methods":"''POST,OPTIONS''","method.response.header.Access-Control-Allow-Origin":"''*''"}'
  [System.IO.File]::WriteAllText("$PWD\integration-params.json", $integrationResponseParams)

  aws apigateway put-integration-response `
    --rest-api-id $API_ID `
    --resource-id $RESOURCE_ID `
    --http-method OPTIONS `
    --status-code 200 `
    --response-parameters file://integration-params.json `
    --region $REGION | Out-Null
  Write-Host "  OPTIONS integration response done"

  # Lambda permission
  aws lambda remove-permission `
    --function-name $LAMBDA_NAME `
    --statement-id "apigw-$PATH_NAME" `
    --region $REGION 2>$null

  aws lambda add-permission `
    --function-name $LAMBDA_NAME `
    --statement-id "apigw-$PATH_NAME" `
    --action lambda:InvokeFunction `
    --principal apigateway.amazonaws.com `
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/POST/${PATH_NAME}" `
    --region $REGION | Out-Null
  Write-Host "  Lambda permission done"

  Write-Host "  ✅ /$PATH_NAME complete"
}

Create-Endpoint "chat"   "devmentor-teacher"
Create-Endpoint "review" "devmentor-reviewer"
Create-Endpoint "debug"  "devmentor-debugger"

# Cleanup temp files
Remove-Item -Force req-template.json, method-params.json, response-models.json, integration-params.json 2>$null

# Deploy
Write-Host ""
Write-Host "Deploying to prod..."
$DEPLOYMENT_ID = aws apigateway create-deployment `
  --rest-api-id $API_ID `
  --region $REGION `
  --query 'id' `
  --output text
Write-Host "Deployment ID: $DEPLOYMENT_ID"

aws apigateway create-stage `
  --rest-api-id $API_ID `
  --stage-name prod `
  --deployment-id $DEPLOYMENT_ID `
  --region $REGION | Out-Null

$NEW_URL = "https://$API_ID.execute-api.$REGION.amazonaws.com/prod"
Write-Host ""
Write-Host "✅ ALL DONE!"
Write-Host "Your new API URL:"
Write-Host $NEW_URL
Write-Host ""
Write-Host "Update your .env:"
Write-Host "VITE_API_URL=$NEW_URL"