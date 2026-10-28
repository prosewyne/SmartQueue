const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const stateFile = process.env.SMARTQUEUE_DATA_FILE || path.join(__dirname, 'smartqueue-data.json');

const getServiceDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const makeOffice = (name, avgServiceTime) => ({
  name,
  windows: [
    { id: 1, name: 'Window 1', status: 'open', currentTicket: null, avgServiceTime },
    { id: 2, name: 'Window 2', status: 'open', currentTicket: null, avgServiceTime: avgServiceTime - 30 }
  ],
  queue: [],
  nextTicketNumber: 1,
  completedToday: 0,
  noShowToday: 0,
  tickets: {}
});

const initialState = {
  registrar: makeOffice('Registrar', 180),
  cashier: makeOffice('Cashier', 120)
};

let serviceDate = getServiceDate();
let state = initialState;

try {
  const savedData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const savedOffices = savedData.offices || savedData;
  state = Object.fromEntries(Object.keys(initialState).map(officeId => {
    const savedOffice = savedOffices[officeId] || {};
    return [officeId, {
      ...initialState[officeId],
      ...savedOffice,
      windows: Array.isArray(savedOffice.windows) ? savedOffice.windows : initialState[officeId].windows,
      queue: Array.isArray(savedOffice.queue) ? savedOffice.queue : [],
      tickets: savedOffice.tickets || {}
    }];
  }));

  if (savedData.serviceDate !== serviceDate) {
    Object.values(state).forEach(office => {
      office.completedToday = 0;
      office.noShowToday = 0;
    });
  }
} catch (_error) {
  state = initialState;
}

function saveState() {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const temporaryFile = `${stateFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify({ serviceDate, offices: state }, null, 2));
  fs.renameSync(temporaryFile, stateFile);
}

function resetDailyCountersIfNeeded() {
  const today = getServiceDate();
  if (today === serviceDate) return;

  serviceDate = today;
  Object.values(state).forEach(office => {
    office.completedToday = 0;
    office.noShowToday = 0;
  });
  saveState();
}

app.use(express.json());
app.use('/api', (_req, _res, next) => {
  resetDailyCountersIfNeeded();
  next();
});
const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));

const getOpenWindows = office => office.windows.filter(window => window.status === 'open');

const calcETA = (office, stationIndex) => {
  const open = getOpenWindows(office);
  if (!open.length) return 9999;
  const avg = open.reduce((total, win) => total + win.avgServiceTime, 0) / open.length;
  return Math.ceil((stationIndex / open.length) * avg);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'SmartQueue' });
});

app.get('/api/state', (_req, res) => {
  res.json(state);
});

app.post('/api/queue', (req, res) => {
  const { officeId, studentName, studentId, transactionType } = req.body;
  const office = state[officeId];

  if (!office || !studentName) {
    return res.status(400).json({ error: 'Invalid office or missing student name.' });
  }

  const number = office.nextTicketNumber;
  const ticketId = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const ticket = {
    id: ticketId,
    number,
    officeId,
    studentName,
    studentId: studentId || '',
    transactionType: transactionType || 'General',
    status: 'waiting',
    createdAt: new Date().toISOString(),
    position: office.queue.length + 1,
    etaSeconds: calcETA(office, office.queue.length)
  };

  office.nextTicketNumber += 1;
  office.queue.push(ticketId);
  office.tickets[ticketId] = ticket;
  saveState();

  res.status(201).json(ticket);
});

app.post('/api/call-next', (req, res) => {
  const { officeId, windowId } = req.body;
  const office = state[officeId];
  const window = office.windows.find(win => win.id === Number(windowId));

  if (!office || !window) {
    return res.status(400).json({ error: 'Office or window not found.' });
  }

  if (window.currentTicket) {
    const currentTicket = office.tickets[window.currentTicket];
    if (currentTicket) {
      currentTicket.status = 'completed';
      currentTicket.completedAt = new Date().toISOString();
      office.completedToday += 1;
      const duration = (new Date(currentTicket.completedAt) - new Date(currentTicket.calledAt || currentTicket.createdAt)) / 1000;
      window.avgServiceTime = Math.round(window.avgServiceTime * 0.7 + duration * 0.3);
    }
    window.currentTicket = null;
  }

  if (!office.queue.length) {
    saveState();
    return res.json({ message: 'Queue is empty.', office });
  }

  const nextTicketId = office.queue.shift();
  const nextTicket = office.tickets[nextTicketId];
  if (!nextTicket) {
    return res.json({ message: 'No valid next ticket.', office });
  }

  nextTicket.status = 'serving';
  nextTicket.calledAt = new Date().toISOString();
  window.currentTicket = nextTicketId;
  saveState();

  res.json({ ticket: nextTicket, office });
});

app.post('/api/complete', (req, res) => {
  const { officeId, windowId } = req.body;
  const office = state[officeId];
  const window = office.windows.find(win => win.id === Number(windowId));

  if (!office || !window || !window.currentTicket) {
    return res.status(400).json({ error: 'No active ticket for this window.' });
  }

  const ticket = office.tickets[window.currentTicket];
  ticket.status = 'completed';
  ticket.completedAt = new Date().toISOString();
  office.completedToday += 1;
  const duration = (new Date(ticket.completedAt) - new Date(ticket.calledAt || ticket.createdAt)) / 1000;
  window.avgServiceTime = Math.round(window.avgServiceTime * 0.7 + duration * 0.3);
  window.currentTicket = null;
  saveState();

  res.json({ ticket, office });
});

app.post('/api/no-show', (req, res) => {
  const { officeId, windowId } = req.body;
  const office = state[officeId];

  if (!office) {
    return res.status(400).json({ error: 'Office not found.' });
  }

  const window = office.windows.find(win => win.id === Number(windowId));
  if (!window || !window.currentTicket) {
    return res.status(400).json({ error: 'No active ticket for this window.' });
  }

  const ticket = office.tickets[window.currentTicket];
  ticket.status = 'no-show';
  ticket.noShowAt = new Date().toISOString();
  office.noShowToday += 1;
  window.currentTicket = null;
  saveState();

  res.json({ ticket, office });
});

app.post('/api/cancel-ticket', (req, res) => {
  const { officeId, ticketId } = req.body;
  const office = state[officeId];

  if (!office) {
    return res.status(400).json({ error: 'Office not found.' });
  }

  const ticket = office.tickets[ticketId];
  const queueIndex = office.queue.indexOf(ticketId);
  if (!ticket || ticket.status !== 'waiting' || queueIndex === -1) {
    return res.status(409).json({ error: 'Only a waiting ticket can be cancelled.' });
  }

  office.queue.splice(queueIndex, 1);
  ticket.status = 'cancelled';
  ticket.cancelledAt = new Date().toISOString();
  saveState();

  res.json({ ticket, office });
});

app.post('/api/window-toggle', (req, res) => {
  const { officeId, windowId } = req.body;
  const office = state[officeId];
  const window = office.windows.find(win => win.id === Number(windowId));

  if (!office || !window) {
    return res.status(400).json({ error: 'Window not found.' });
  }

  window.status = window.status === 'open' ? 'closed' : 'open';
  saveState();

  res.json({ window, office });
});

app.get('/SmartQueue', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('*', (_req, res) => {
  if (!fs.existsSync(path.join(frontendPath, 'index.html'))) {
    return res.status(503).send('Frontend is not built. Run npm run build first.');
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SmartQueue backend running on http://localhost:${PORT}`);
});
