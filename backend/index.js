require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSocket = require('./socket');
require('./config/pg');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

app.use('/api/v1/auth', require('./routes/auth'));
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()}: ${req.method} - ${req.originalUrl}`
  );
});
const io = new Server(server, {
  cors: { origin: '*' },
});

setupSocket(io);

server.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
