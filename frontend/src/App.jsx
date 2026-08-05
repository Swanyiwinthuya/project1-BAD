import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

const labels = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', WAITING: 'Waiting', RESOLVED: 'Resolved', CLOSED: 'Closed',
  ACCOUNT_ACCESS: 'Account access', AUDIO_VISUAL: 'Audio visual'
};
const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

function pretty(value) {
  return labels[value] || value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  return <div className={`notice ${notice.type || ''}`} role="status"><span>{notice.text}</span><button onClick={onClose} aria-label="Dismiss">×</button></div>;
}

function Login() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    setBusy(true); setError('');
    try { await signIn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-card">
      <div className="brand-mark" aria-hidden="true">CF</div>
      <p className="eyebrow">University IT support</p>
      <h1>Fix campus problems before they interrupt learning.</h1>
      <p className="lede">Report technical issues, follow their progress, and connect with the right support team in one secure place.</p>
      {error && <p className="error-text">{error}</p>}
      <button className="primary large" onClick={login} disabled={busy}>{busy ? 'Connecting…' : 'Sign in with Microsoft'}</button>
      <p className="fine-print">Use your university Microsoft account.</p>
    </section>
    <aside className="login-art" aria-label="CampusFix features">
      <div className="metric"><strong>AI</strong><span>Automatic ticket category and priority</span></div>
      <div className="metric"><strong>24/7</strong><span>One reliable place to report issues</span></div>
      <div className="metric"><strong>RBAC</strong><span>Secure access for every campus role</span></div>
    </aside>
  </main>;
}

function NewTicket({ onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', room: '' });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try {
      const { ticket } = await api('/tickets', { method: 'POST', body: JSON.stringify(form) });
      setForm({ title: '', description: '', room: '' });
      onCreated(ticket);
    } finally { setBusy(false); }
  }
  return <form className="panel ticket-form" onSubmit={submit}>
    <div className="section-heading"><div><p className="eyebrow">New request</p><h2>What needs attention?</h2></div><span className="step">01</span></div>
    <label>Issue title<input required minLength="5" maxLength="160" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Projector is not working" /></label>
    <div className="form-row">
      <label>Room or location<input maxLength="120" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="Room 402" /></label>
      <div className="form-hint"><strong>Smart priority</strong><span>An active class or event can raise the priority automatically.</span></div>
    </div>
    <label>Details<textarea required minLength="10" maxLength="5000" rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe what happened and anything you already tried…" /></label>
    <button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit ticket'}</button>
  </form>;
}

function TicketCard({ ticket, canManage, technicians, onUpdated }) {
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);
  async function update(data) {
    const response = await api(`/tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    onUpdated(response.ticket);
  }
  async function addComment(event) {
    event.preventDefault();
    const response = await api(`/tickets/${ticket.id}/comments`, { method: 'POST', body: JSON.stringify({ content: comment, isInternal: false }) });
    setComment('');
    onUpdated({ ...ticket, comments: [...ticket.comments, response.comment] });
  }
  const visibleComments = ticket.comments.filter((item) => canManage || !item.isInternal);
  return <article className="ticket-card">
    <button className="ticket-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
      <div className="ticket-topline"><span className={`priority ${ticket.priority.toLowerCase()}`}>{pretty(ticket.priority)}</span><span className="ticket-id">#{ticket.id.slice(-6).toUpperCase()}</span></div>
      <h3>{ticket.title}</h3>
      <div className="ticket-meta"><span>{pretty(ticket.category)}</span><span>{ticket.room || 'No room'}</span><span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
      <span className={`status ${ticket.status.toLowerCase()}`}>{pretty(ticket.status)}</span>
    </button>
    {open && <div className="ticket-detail">
      <p>{ticket.description}</p>
      {ticket.aiReason && <div className="ai-note"><strong>AI triage</strong><span>{ticket.aiReason}</span></div>}
      {canManage && <div className="controls">
        <label>Status<select value={ticket.status} onChange={(event) => update({ status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></label>
        <label>Assigned to<select value={ticket.assignedTechnicianId || ''} onChange={(event) => update({ assignedTechnicianId: event.target.value || null })}><option value="">Unassigned</option>{technicians.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      </div>}
      <div className="comments"><h4>Conversation</h4>{visibleComments.length ? visibleComments.map((item) => <div className="comment" key={item.id}><div><strong>{item.author.name}</strong><span>{pretty(item.author.role)}</span></div><p>{item.content}</p></div>) : <p className="muted">No comments yet.</p>}</div>
      <form className="comment-form" onSubmit={addComment}><input required value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a helpful update…" /><button className="secondary">Post</button></form>
    </div>}
  </article>;
}

function UserAdmin({ users, onUpdated }) {
  async function update(id, data) {
    const response = await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    onUpdated(response.user);
  }
  return <section className="panel admin-panel"><div className="section-heading"><div><p className="eyebrow">Administration</p><h2>People and roles</h2></div><span className="step">{String(users.length).padStart(2, '0')}</span></div>
    <div className="user-list">{users.map((user) => <div className="user-row" key={user.id}><div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div><div className="user-copy"><strong>{user.name}</strong><span>{user.email}</span></div><select value={user.role} onChange={(event) => update(user.id, { role: event.target.value })}>{['STUDENT', 'FACULTY', 'TECHNICIAN', 'ADMIN'].map((role) => <option key={role}>{role}</option>)}</select><label className="toggle"><input type="checkbox" checked={user.isActive} onChange={(event) => update(user.id, { isActive: event.target.checked })} /><span>Active</span></label></div>)}</div>
  </section>;
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('tickets');
  const [notice, setNotice] = useState(null);
  const canManage = ['TECHNICIAN', 'ADMIN'].includes(user.role);

  useEffect(() => {
    api('/tickets').then((data) => setTickets(data.tickets)).catch((error) => setNotice({ type: 'error', text: error.message }));
    if (user.role === 'ADMIN') api('/users').then((data) => setUsers(data.users)).catch((error) => setNotice({ type: 'error', text: error.message }));
    else if (canManage) api('/users/technicians').then((data) => setUsers(data.users)).catch((error) => setNotice({ type: 'error', text: error.message }));
  }, [user.role, canManage]);

  const technicians = useMemo(() => users.filter((item) => ['TECHNICIAN', 'ADMIN'].includes(item.role) && item.isActive), [users]);
  const counts = useMemo(() => ({ open: tickets.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length, urgent: tickets.filter((item) => item.priority === 'URGENT').length, done: tickets.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length }), [tickets]);
  function replaceTicket(updated) { setTickets((items) => items.map((item) => item.id === updated.id ? updated : item)); }

  return <div className="app-shell">
    <header><a className="brand" href="/campusfix/"><span>CF</span><strong>CampusFix</strong></a><nav><button className={view === 'tickets' ? 'active' : ''} onClick={() => setView('tickets')}>Tickets</button>{user.role === 'ADMIN' && <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>Users</button>}</nav><div className="profile"><div><strong>{user.name}</strong><span>{pretty(user.role)}</span></div><button className="secondary" onClick={signOut}>Sign out</button></div></header>
    <Notice notice={notice} onClose={() => setNotice(null)} />
    <main className="dashboard">
      <section className="hero"><div><p className="eyebrow">Campus operations · Live desk</p><h1>Good day, {user.name.split(' ')[0]}.</h1><p>Keep every classroom, lab, and campus service ready for the people who depend on it.</p></div><div className="stats"><div><strong>{counts.open}</strong><span>Active</span></div><div><strong>{counts.urgent}</strong><span>Urgent</span></div><div><strong>{counts.done}</strong><span>Completed</span></div></div></section>
      {view === 'tickets' ? <div className="workspace"><NewTicket onCreated={(ticket) => { setTickets((items) => [ticket, ...items]); setNotice({ type: 'success', text: 'Ticket submitted successfully.' }); }} /><section className="ticket-column"><div className="section-heading"><div><p className="eyebrow">Support queue</p><h2>{canManage ? 'All tickets' : 'Your tickets'}</h2></div><span className="step">{String(tickets.length).padStart(2, '0')}</span></div><div className="ticket-list">{tickets.length ? tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} canManage={canManage} technicians={technicians} onUpdated={replaceTicket} />) : <div className="empty"><strong>No tickets yet</strong><span>Your first request will appear here.</span></div>}</div></section></div> : <UserAdmin users={users} onUpdated={(updated) => setUsers((items) => items.map((item) => item.id === updated.id ? updated : item))} />}
    </main>
    <footer><span>CampusFix AI HelpDesk</span><span>Secure university support · {new Date().getFullYear()}</span></footer>
  </div>;
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="loading"><div className="brand-mark">CF</div><span>Preparing your help desk…</span></div>;
  return user ? <Dashboard /> : <Login />;
}
