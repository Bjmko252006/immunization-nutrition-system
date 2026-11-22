import { useEffect, useState } from 'react';
import { api } from './api';
import Immunizations from './Immunizations';
import Defaulters from './Defaulters';

function ageInMonths(birthDate) {
  const b = new Date(birthDate);
  const n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  return Math.max(months, 0);
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: { username, password } });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <h1>Barangay San Nicolas 1 Health Center</h1>
        <p className="muted">Immunization Defaulter Tracking and Child Nutrition Risk System</p>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}

const emptyForm = {
  tcl_number: '',
  child_name: '',
  birth_date: '',
  sex: 'Male',
  guardian_name: '',
  guardian_contact: '',
  purok_address: '',
};

function ChildForm({ token, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/children', { method: 'POST', body: form, token });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2>Register child (TCL)</h2>
      <div>
        <label>TCL number</label>
        <input value={form.tcl_number} onChange={set('tcl_number')} required />
      </div>
      <div>
        <label>Child name</label>
        <input value={form.child_name} onChange={set('child_name')} required />
      </div>
      <div>
        <label>Birth date</label>
        <input type="date" value={form.birth_date} onChange={set('birth_date')} required />
      </div>
      <div>
        <label>Sex</label>
        <select value={form.sex} onChange={set('sex')}>
          <option>Male</option>
          <option>Female</option>
        </select>
      </div>
      <div>
        <label>Guardian name</label>
        <input value={form.guardian_name} onChange={set('guardian_name')} required />
      </div>
      <div>
        <label>Guardian contact</label>
        <input
          placeholder="+639XXXXXXXXX"
          value={form.guardian_contact}
          onChange={set('guardian_contact')}
          required
        />
      </div>
      <div className="full">
        <label>Purok / address</label>
        <input value={form.purok_address} onChange={set('purok_address')} required />
      </div>
      {error && <div className="error full">{error}</div>}
      <div className="full actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button>Save</button>
      </div>
    </form>
  );
}

function ChildrenTab({ token, onLogout }) {
  const [children, setChildren] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    api(`/children?q=${encodeURIComponent(q)}`, { token })
      .then((data) => {
        if (!ignore) {
          setChildren(data);
          setError('');
        }
      })
      .catch((err) => {
        if (err.status === 401) onLogout();
        else if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [q, token, reloadKey, onLogout]);

  return (
    <div>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search child, guardian or TCL number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setShowForm(true)}>+ Register child</button>
      </div>

      {showForm && (
        <ChildForm
          token={token}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>TCL No.</th>
              <th>Child</th>
              <th>Sex</th>
              <th>Age (months)</th>
              <th>Guardian</th>
              <th>Contact</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {children.length === 0 && (
              <tr>
                <td colSpan="7" className="muted center">
                  No records yet.
                </td>
              </tr>
            )}
            {children.map((c) => (
              <tr key={c._id}>
                <td>{c.tcl_number}</td>
                <td>{c.child_name}</td>
                <td>{c.sex}</td>
                <td>{ageInMonths(c.birth_date)}</td>
                <td>{c.guardian_name}</td>
                <td>{c.guardian_contact}</td>
                <td>{c.purok_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Shell({ session, onLogout }) {
  const { token, user } = session;
  const [tab, setTab] = useState('children');

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>Barangay San Nicolas 1 Health Center</strong>
          <div className="muted">Immunization &amp; Nutrition Monitoring</div>
        </div>
        <div className="user">
          {user.full_name} ({user.role})
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={tab === 'children' ? 'active' : ''} onClick={() => setTab('children')}>
          Children (TCL)
        </button>
        <button
          className={tab === 'immunizations' ? 'active' : ''}
          onClick={() => setTab('immunizations')}
        >
          Immunizations
        </button>
        <button
          className={tab === 'defaulters' ? 'active' : ''}
          onClick={() => setTab('defaulters')}
        >
          Defaulters
        </button>
      </div>

      {tab === 'children' && <ChildrenTab token={token} onLogout={onLogout} />}
      {tab === 'immunizations' && <Immunizations token={token} />}
      {tab === 'defaulters' && <Defaulters token={token} />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('session'));
    } catch {
      return null;
    }
  });

  const login = (data) => {
    localStorage.setItem('session', JSON.stringify(data));
    setSession(data);
  };

  const logout = () => {
    localStorage.removeItem('session');
    setSession(null);
  };

  return session ? <Shell session={session} onLogout={logout} /> : <Login onLogin={login} />;
}