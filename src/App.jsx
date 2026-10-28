import { useEffect, useState } from 'react';

const demoUsers = {
  staff_reg: { name: 'Maria Santos', role: 'staff', office: 'registrar' },
  staff_cash: { name: 'Pedro Reyes', role: 'staff', office: 'cashier' },
  admin: { name: 'Admin User', role: 'admin' }
};

const initialData = {
  registrar: { name: 'Registrar', windows: [], queue: [], completedToday: 0, tickets: {} },
  cashier: { name: 'Cashier', windows: [], queue: [], completedToday: 0, tickets: {} }
};

const transactionTypes = {
  registrar: ['Document Request', 'Enrollment Inquiry', 'Transcript of Records', 'Certificate of Enrollment', 'Other'],
  cashier: ['Tuition Payment', 'Balance Inquiry', 'Refund Request', 'Other Payment']
};

function formatETA(seconds) {
  if (seconds <= 0) return 'Now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '~1 min' : `~${minutes} mins`;
}

function formatQueuePosition(position) {
  return ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' })[position];
}

function calculateETA(office, position) {
  const openWindows = (office.windows || []).filter((window) => window.status === 'open');
  if (!openWindows.length) return 9999;
  const average = openWindows.reduce((sum, window) => sum + window.avgServiceTime, 0) / openWindows.length;
  return Math.ceil((position / openWindows.length) * average);
}

function Nav({ page, user, onNavigate, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); onNavigate('home'); }}>
          <span className="brand-mark">SQ</span>
          <span>SmartQueue<small>Campus services</small></span>
        </a>
        <nav className="nav-actions" aria-label="Main navigation">
          <button className={`nav-button ${page === 'home' ? 'selected' : ''}`} onClick={() => onNavigate('home')}>Home</button>
          {user ? (
            <>
              <button className={`nav-button ${page === 'staff' ? 'selected' : ''}`} onClick={() => onNavigate('staff')}>Staff dashboard</button>
              <button className="nav-button" onClick={onLogout}>Log out</button>
            </>
          ) : <button className={`nav-button ${page === 'login' ? 'selected' : ''}`} onClick={() => onNavigate('login')}>Staff login</button>}
        </nav>
      </div>
    </header>
  );
}

function App() {
  const [page, setPage] = useState('home');
  const [staffTab, setStaffTab] = useState('overview');
  const [officeId, setOfficeId] = useState('registrar');
  const [user, setUser] = useState(null);
  const [myTicket, setMyTicket] = useState(null);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [transactionType, setTransactionType] = useState(transactionTypes.registrar[0]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function refreshState() {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error('Backend is unavailable. Start it with npm start.');
      const nextData = await response.json();
      setData(nextData);
      setMyTicket((currentTicket) => {
        if (!currentTicket) return currentTicket;
        const currentOffice = nextData[currentTicket.officeId];
        const latestTicket = currentOffice?.tickets?.[currentTicket.id];
        if (!latestTicket) return currentTicket;

        const queueIndex = currentOffice.queue.indexOf(currentTicket.id);
        return {
          ...latestTicket,
          position: queueIndex >= 0 ? queueIndex + 1 : latestTicket.position,
          etaSeconds: queueIndex >= 0 ? calculateETA(currentOffice, queueIndex) : latestTicket.etaSeconds
        };
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Backend is unavailable. Start it with npm start.');
    }
  }

  useEffect(() => {
    refreshState();
    const intervalId = window.setInterval(refreshState, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }

  async function runAction(action) {
    try {
      setError('');
      await action();
      await refreshState();
    } catch (actionError) {
      setError(actionError.message || 'Request failed.');
    }
  }

  function chooseOffice(id) {
    setOfficeId(id);
    setTransactionType(transactionTypes[id][0]);
    setPage('queue');
    setError('');
  }

  async function joinQueue(event) {
    event.preventDefault();
    if (!studentName.trim()) return;
    await runAction(async () => {
      const ticket = await postJson('/api/queue', {
        officeId,
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        transactionType
      });
      setMyTicket(ticket);
      setStudentName('');
      setStudentId('');
    });
  }

  async function cancelTicket(ticket, updateOwnTicket = false) {
    await runAction(async () => {
      const result = await postJson('/api/cancel-ticket', { officeId, ticketId: ticket.id });
      if (updateOwnTicket) setMyTicket(result.ticket);
    });
  }

  function signIn(event) {
    event.preventDefault();
    const account = demoUsers[username];
    const validPassword = password === 'staff' || (username === 'admin' && password === 'admin');
    if (!account || !validPassword) {
      setError('Invalid credentials. Try staff_reg / staff.');
      return;
    }
    setUser({ ...account, id: username });
    if (account.office) setOfficeId(account.office);
    setPassword('');
    setUsername('');
    setError('');
    setPage('staff');
  }

  const office = data[officeId] || initialData.registrar;
  const queue = (office.queue || []).map((ticketId, index) => ({
    ...office.tickets[ticketId],
    position: index + 1,
    etaSeconds: calculateETA(office, index)
  }));
  const nowServing = (office.windows || []).filter((window) => window.currentTicket).map((window) => ({
    window,
    ticket: office.tickets[window.currentTicket]
  })).filter((item) => item.ticket);
  const history = Object.values(office.tickets || {})
    .filter((ticket) => ['completed', 'no-show', 'cancelled'].includes(ticket.status))
    .sort((first, second) => {
      const firstDate = first.completedAt || first.noShowAt || first.cancelledAt || first.createdAt;
      const secondDate = second.completedAt || second.noShowAt || second.cancelledAt || second.createdAt;
      return new Date(secondDate) - new Date(firstDate);
    });

  return (
    <>
      <Nav
        page={page}
        user={user}
        onNavigate={(nextPage) => { setError(''); setPage(nextPage); }}
        onLogout={() => { setUser(null); setPage('home'); }}
      />
      <main className="page-shell">
        {error && <div className="alert" role="alert">{error}</div>}

        {page === 'home' && (
          <div className="content-width">
            <section className="hero">
              <p className="eyebrow">A calmer campus visit</p>
              <h1>Spend less time waiting.</h1>
              <p className="hero-copy">Join a service queue from your phone and see when your turn is getting close.</p>
              <div className="hero-actions">
                <button className="button button-light" onClick={() => chooseOffice('registrar')}>Join Registrar queue</button>
                <button className="button button-outline-light" onClick={() => chooseOffice('cashier')}>Join Cashier queue</button>
              </div>
            </section>
            <section className="office-grid" aria-label="Office queue status">
              {['registrar', 'cashier'].map((id) => {
                const item = data[id] || initialData[id];
                return (
                  <article className="office-panel" key={id}>
                    <div className="panel-heading"><p className="eyebrow">Student services</p><h2>{item.name}</h2></div>
                    <div className="stat-row">
                      <div className="stat"><strong>{(item.queue || []).length}</strong><span>Waiting</span></div>
                      <div className="stat"><strong>{item.completedToday || 0}</strong><span>Served today</span></div>
                    </div>
                    <button className="button button-dark full-width" onClick={() => chooseOffice(id)}>Get a queue number</button>
                  </article>
                );
              })}
            </section>
            <p className="demo-note">Demo staff: <strong>staff_reg / staff</strong>, <strong>staff_cash / staff</strong>, or <strong>admin / admin</strong>.</p>
          </div>
        )}

        {page === 'login' && (
          <section className="form-panel narrow-panel">
            <p className="eyebrow">Team access</p>
            <h1>Staff login</h1>
            <p className="muted">Manage service windows and call the next ticket.</p>
            <form className="form-stack" onSubmit={signIn}>
              <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="staff_reg" required /></label>
              <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="button button-dark full-width" type="submit">Sign in</button>
            </form>
          </section>
        )}

        {page === 'queue' && (
          <div className="content-width queue-page">
            <button className="back-button" onClick={() => setPage('home')}>← <span>Back</span></button>
            <div className="section-heading"><p className="eyebrow">Live queue</p><h1>{office.name}</h1></div>
            {myTicket?.officeId === officeId && (
              <section className={`ticket-status ${myTicket.status === 'serving' ? 'is-serving' : ''}`}>
                <div><span className="muted">Latest ticket registered</span><strong className="ticket-number">#{myTicket.number}</strong><span className={`badge badge-${myTicket.status}`}>{myTicket.status}</span></div>
                {myTicket.status === 'waiting' && <div><span className="muted">Position</span><strong className="ticket-position">{myTicket.position || 1}</strong><span className="muted">ETA: {formatETA(myTicket.etaSeconds || 0)}</span></div>}
                {myTicket.status === 'serving' && <p>Please proceed to the service window.</p>}
                {myTicket.status === 'waiting' && <button className="text-button" onClick={() => cancelTicket(myTicket, true)}>Cancel registration</button>}
              </section>
            )}
            {myTicket?.officeId === officeId && myTicket.status === 'waiting' && myTicket.position >= 1 && myTicket.position <= 5 && (
              <div className="queue-alert" role="status" aria-live="polite">
                <span>Queue alert</span>
                <strong>You're close on Queue. Currently at {formatQueuePosition(myTicket.position)}.</strong>
              </div>
            )}
            <section className="form-panel">
              <h2>Register a student</h2>
              <form className="form-stack" onSubmit={joinQueue}>
                <label>Full name<input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Juan Dela Cruz" required /></label>
                <label>Student ID <span className="muted">(optional)</span><input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="2024-12345" /></label>
                <label>Transaction type<select value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>{transactionTypes[officeId].map((type) => <option key={type}>{type}</option>)}</select></label>
                <button className="button button-red full-width" type="submit">Add student to queue</button>
              </form>
            </section>
            {nowServing.length > 0 && <section className="list-panel"><h2>Now serving</h2><div className="serving-grid">{nowServing.map(({ window, ticket }) => <div className="serving-item" key={window.id}><span>{window.name}</span><strong>#{ticket.number}</strong></div>)}</div></section>}
            <section className="list-panel"><h2>Waiting queue <span className="count">{queue.length}</span></h2>{queue.length ? queue.slice(0, 12).map((ticket) => <div className="queue-item" key={ticket.id}><span><strong>#{ticket.number}</strong> {ticket.studentName}</span><span className="muted">ETA: {formatETA(ticket.etaSeconds)}</span></div>) : <p className="muted">No one is waiting. You can join now.</p>}</section>
          </div>
        )}

        {page === 'staff' && user && (
          <div className="content-width">
            <div className="dashboard-heading">
              <div><p className="eyebrow">Operations</p><h1>Staff dashboard</h1><p className="muted">Welcome, {user.name}</p></div>
              {user.role === 'admin' && <div className="office-switch" aria-label="Select office"><button className={officeId === 'registrar' ? 'active' : ''} onClick={() => setOfficeId('registrar')}>Registrar</button><button className={officeId === 'cashier' ? 'active' : ''} onClick={() => setOfficeId('cashier')}>Cashier</button></div>}
            </div>
            <div className="staff-tabs" role="tablist" aria-label="Staff dashboard views">
              <button className={`staff-tab ${staffTab === 'overview' ? 'active' : ''}`} role="tab" aria-selected={staffTab === 'overview'} onClick={() => setStaffTab('overview')}>Overview</button>
              <button className={`staff-tab ${staffTab === 'history' ? 'active' : ''}`} role="tab" aria-selected={staffTab === 'history'} onClick={() => setStaffTab('history')}>History</button>
            </div>
            {staffTab === 'overview' ? (
              <>
                <section className="stat-row dashboard-stats"><div className="stat"><strong>{(office.queue || []).length}</strong><span>Waiting</span></div><div className="stat"><strong>{office.completedToday || 0}</strong><span>Completed today</span></div><div className="stat"><strong>{office.noShowToday || 0}</strong><span>No-shows today</span></div><div className="stat"><strong>{(office.windows || []).filter((window) => window.status === 'open').length}</strong><span>Open windows</span></div></section>
                <h2 className="windows-heading">{office.name} windows</h2>
                <section className="window-grid">
                  {(office.windows || []).map((window) => {
                    const servingTicket = window.currentTicket ? office.tickets[window.currentTicket] : null;
                    return (
                      <article className="window-panel" key={window.id}>
                        <div className="window-heading"><h3>{window.name}</h3><button className={`window-toggle ${window.status}`} onClick={() => runAction(() => postJson('/api/window-toggle', { officeId, windowId: window.id }))}>{window.status}</button></div>
                        <div className="current-ticket">{servingTicket ? <><span>Now serving</span><strong>#{servingTicket.number}</strong><span>{servingTicket.studentName}</span></> : <span className="muted">No ticket being served</span>}</div>
                        <button className="button button-dark full-width" disabled={window.status !== 'open'} onClick={() => runAction(() => postJson('/api/call-next', { officeId, windowId: window.id }))}>Call next</button>
                        {servingTicket && <>
                          <button className="button button-green full-width" onClick={() => runAction(() => postJson('/api/complete', { officeId, windowId: window.id }))}>Complete ticket</button>
                          <button className="button button-red full-width" onClick={() => runAction(() => postJson('/api/no-show', { officeId, windowId: window.id }))}>Mark no-show</button>
                        </>}
                        <p className="window-meta">Average service: ~{Math.round((window.avgServiceTime || 0) / 60)} min</p>
                      </article>
                    );
                  })}
                </section>
                <section className="list-panel"><h2>Next in queue</h2>{queue.length ? queue.map((ticket) => <div className="queue-item staff-queue-item" key={ticket.id}><span><strong>#{ticket.number}</strong> {ticket.studentName}<small>Position {ticket.position}</small></span><button className="text-button" onClick={() => cancelTicket(ticket)}>Remove</button></div>) : <p className="muted">Queue is empty.</p>}</section>
              </>
            ) : (
              <section className="list-panel history-panel" role="tabpanel">
                <div className="history-heading"><div><h2>Student history</h2><p className="muted">Completed, no-show, and cancelled tickets for {office.name}.</p></div><span className="count">{history.length}</span></div>
                {history.length ? history.map((ticket) => {
                  const eventDate = ticket.completedAt || ticket.noShowAt || ticket.cancelledAt || ticket.createdAt;
                  return (
                    <article className="history-row" key={ticket.id}>
                      <div className="history-student"><strong>{ticket.studentName}</strong><span>{ticket.studentId || 'No student ID'} · #{ticket.number} · {ticket.transactionType}</span></div>
                      <time dateTime={eventDate}>{new Date(eventDate).toLocaleString()}</time>
                      <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                    </article>
                  );
                }) : <p className="muted empty-history">No student history for this office yet.</p>}
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default App;