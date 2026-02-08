#!/bin/bash
# MCP Server Test Script

TEMPLATE_PATH="$(dirname "$0")/../../../packages/@aurochs-cli/pptx-cli/spec/verify-cases/templates/blank.pptx"
OUTPUT_PATH="/tmp/mcp-test-output.pptx"

echo "=== MCP Server Test ==="
echo ""

# Start the server in background with a named pipe for communication
FIFO=$(mktemp -u)
mkfifo "$FIFO"

bun src/index.ts < "$FIFO" &
SERVER_PID=$!

# Give server time to start
sleep 1

# Open the pipe for writing
exec 3>"$FIFO"

echo "1. Creating presentation..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pptx_create_presentation","arguments":{"template_path":"'"$TEMPLATE_PATH"'","title":"MCP Test Presentation"}}}' >&3
sleep 1

echo "2. Adding shape..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"pptx_add_shape","arguments":{"slide_number":1,"shape":{"type":"rect","x":100,"y":100,"width":300,"height":150,"fill":{"type":"solid","color":"#3498DB"}}}}}' >&3
sleep 1

echo "3. Adding text box..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"pptx_add_text_box","arguments":{"slide_number":1,"text":"Hello from MCP!","x":100,"y":300,"width":400,"height":50}}}' >&3
sleep 1

echo "4. Setting transition..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"pptx_set_transition","arguments":{"slide_number":1,"transition":{"type":"fade","duration":500}}}}' >&3
sleep 1

echo "5. Exporting..."
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"pptx_export","arguments":{"output_path":"'"$OUTPUT_PATH"'"}}}' >&3
sleep 1

# Close the pipe and wait for server
exec 3>&-
sleep 1
kill $SERVER_PID 2>/dev/null

# Cleanup
rm -f "$FIFO"

echo ""
echo "=== Test Complete ==="

if [ -f "$OUTPUT_PATH" ]; then
  echo "Output file created: $OUTPUT_PATH"
  ls -la "$OUTPUT_PATH"
else
  echo "ERROR: Output file not created"
  exit 1
fi
