require('dotenv').config();
const express = require('express');
const http = require('http');
const net = require('net');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { registerWorker, heartbeat, deregisterWorker, releaseWorkspace, getStatus } = require('./services/workerRegistry');
require('./config/pg');
const evaluationRoutes = require("./routes/evaluationRoutes");

const compression = require('compression');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiter for auth routes — 20 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const server = http.createServer(app);

app.use('/api/v1/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/students', require('./routes/student.routes'));
app.use('/api/v1/editor', require('./routes/editor.routes'));
app.use('/api/v1/onboarding', require('./routes/onboarding.routes'));
app.use('/api/v1/colleges', require('./routes/college.routes'));
app.use('/api/v1/subjects', require('./routes/subject.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/api/v1/facilitator', require('./routes/facilitator.routes'));
app.use('/api/v1/assistant', require('./routes/assistant.routes'));
app.use('/api/v1/college-assignments', require('./routes/collegeAssignment.routes'));
app.use("/api/v1/evaluations", evaluationRoutes);

app.use("/api/v1/analytics", analyticsRoutes);
app.use('/api/v1/notifications', require('./routes/notification.routes'));
app.use('/api/v1/ai-curriculum', require('./routes/aiCurriculum.routes'));
app.use('/content', express.static(path.join(__dirname, 'data', 'content')));
const verifyToken = require('./middlewares/verfiyToken');
app.use('/uploads', verifyToken, express.static(path.join(__dirname, 'public', 'uploads')));

// ── Internal worker registry endpoints (no auth — internal network only) ────
app.post('/api/v1/internal/workers/register', (req, res) => {
  const { id, url, capacity } = req.body;
  if (!id || !url) return res.status(400).json({ error: 'id and url required' });
  registerWorker(id, url, capacity);
  res.json({ ok: true });
});

app.post('/api/v1/internal/workers/heartbeat', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  heartbeat(id);
  res.json({ ok: true });
});

app.post('/api/v1/internal/workers/deregister', (req, res) => {
  const { id } = req.body;
  if (id) deregisterWorker(id);
  res.json({ ok: true });
});

app.post('/api/v1/internal/workers/release', (req, res) => {
  const { userId, projectId } = req.body;
  if (userId && projectId) releaseWorkspace(userId, projectId);
  res.json({ ok: true });
});

app.get('/api/v1/internal/workers/status', (req, res) => {
  res.json(getStatus());
});

//  404 Catch-all (Place this at the very bottom)
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});



server.listen(3001, () => {
  const ct = new Date().toLocaleTimeString();
  console.log('Backend running on http://localhost:3001', ct);
});


