const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Cloud IDE API is Running!');
});

app.get('/api/status', (req, res) => {
  res.json({
    phase: 'Phase 1 MVP',
    goal: 'Real Cloud IDE Foundation',
    status: 'Active',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

/* 🔴 THIS IS THE MISSING PART */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('Another process is still running.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
