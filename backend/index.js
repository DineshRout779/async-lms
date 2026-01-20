require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSocket = require('./socket');
const path = require('path');
require('./config/pg');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()}: ${req.method} - ${req.originalUrl}`
  );
  next();
});

app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/editor', require('./routes/editor.routes'));
app.use('/api/v1/onboarding', require('./routes/onboarding.routes'));
app.use('/api/v1/colleges', require('./routes/college.routes'));
app.use('/api/v1/subjects', require('./routes/subject.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/content', express.static(path.join(__dirname, 'data', 'content')));

//  404 Catch-all (Place this at the very bottom)
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const io = new Server(server, {
  cors: { origin: '*' },
});

setupSocket(io);

server.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
