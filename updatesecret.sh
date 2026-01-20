# 1. Get the address from the logs
NEW_ADDR=$(kubectl logs job/zk-deployer | grep "ROLLUP_ADDRESS=" | cut -d'=' -f2)

# 2. Check if we actually got an address
if [ -z "$NEW_ADDR" ]; then
  echo "❌ Could not find address in logs. Check job output."
else
  echo "✅ Found New Address: $NEW_ADDR"
  
  # 3. Update the Secret (Patching just the one key)
  kubectl patch secret backend-secrets -p "{\"data\":{\"ROLLUP_ADDRESS\":\"$(echo -n $NEW_ADDR | base64)\"}}"
  
  echo "🔄 Secret Updated. Restarting Backend..."
  
  # 4. Restart the Backend Pod to pick up the change
  kubectl rollout restart deployment/zk-backend
  
  echo "🚀 Done! System should be live."
fi