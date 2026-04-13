const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const replacementBlock = `async function startServer(port = PORT) {
  // Connect to MongoDB
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('⚠️  Server starting without database — auth will not work');
  }

  const ollamaStatus = process.env.OLLAMA_URL ? '✅ Configured' : '❌ Not configured';

  console.log('Starting server on port:', port);
  const server = app.listen(port, () => {
    console.log(\`
  ╔═══════════════════════════════════════════════════════╗
  ║   🤖 RAG Interview Platform v5.0 Running             ║
  ║   Auth:    Email OTP + Google OAuth                   ║
  ║   DB:      MongoDB \${dbConnected ? '✅ Connected' : '❌ Offline'}                      ║
  ║   Ollama:  \${ollamaStatus.padEnd(34)}║
  ║   LLM:     Local Ollama Mistral / LLaMA              ║
  ║   Local:   http://localhost:\${port}                     ║
  ╚═══════════════════════════════════════════════════════╝
    \`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(\`Port \${port} is busy, trying \${port + 1}\`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}`;

// Using a resilient trick to replace the whole block since it ends with startServer();
const rx = /async function startServer\(\) \{[\s\S]*?startServer\(\);/;

if (rx.test(code)) {
  code = code.replace(rx, replacementBlock + '\n\nstartServer();');
  fs.writeFileSync('server.js', code);
  console.log('Successfully applied EADDRINUSE robust start patch.');
} else {
  console.log('Could not find the target block.');
}
