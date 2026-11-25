import { useEffect, useState } from 'react';
import { api } from './api';
import Immunizations from './Immunizations';
import Defaulters from './Defaulters';
import Nutrition from './Nutrition';
import Reports from './Reports';
import Accounts from './Accounts';

function ageInMonths(birthDate) {
  const b = new Date(birthDate);
  const n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  return Math.max(months, 0);
}

const RISK_STYLE = {
  Severe: { background: '#fde2e2', color: '#a11212' },
  Moderate: { background: '#fff0d6', color: '#8a5a00' },
  Normal: { background: '#dff3e6', color: '#176a3a' },
  'Above Normal': { background: '#e3ecfb', color: '#1d4fa3' },
};

function RiskBadge({ risk }) {
  if (!risk) return <span className="muted">Not assessed</span>;
  return (
    <span
      style={{
        ...RISK_STYLE[risk.risk_classification],
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '0.85em',
        fontWeight: 600,
      }}
    >
      {risk.risk_classification}
    </span>
  );
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

function ChildForm({ token, child, onSaved, onCancel }) {
  const [form, setForm] = useState(() =>
    child
      ? {
          tcl_number: child.tcl_number,
          child_name: child.child_name,
          birth_date: String(child.birth_date).slice(0, 10),
          sex: child.sex,
          guardian_name: child.guardian_name,
          guardian_contact: child.guardian_contact,
          purok_address: child.purok_address,
        }
      : emptyForm
  );
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (child) {
        await api(`/children/${child._id}`, { method: 'PUT', body: form, token });
      } else {
        await api('/children', { method: 'POST', body: form, token });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2>{child ? 'Edit child (TCL)' : 'Register child (TCL)'}</h2>
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
  const [editing, setEditing] = useState(null);

  const remove = async (c) => {
    const ok = window.confirm(
      `Delete ${c.child_name} (${c.tcl_number})? Their vaccine and nutrition records will also be deleted. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api(`/children/${c._id}`, { method: 'DELETE', token });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };
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
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Register child
        </button>
      </div>

      {showForm && (
        <ChildForm
          key={editing ? editing._id : 'new'}
          token={token}
          child={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
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
              <th>Nutrition risk</th>
              <th>Guardian</th>
              <th>Contact</th>
              <th>Address</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {children.length === 0 && (
              <tr>
                <td colSpan="9" className="muted center">
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
                <td>
                  <RiskBadge risk={c.latest_risk} />
                </td>
                <td>{c.guardian_name}</td>
                <td>{c.guardian_contact}</td>
                <td>{c.purok_address}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditing(c);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>{' '}
                  <button className="secondary" onClick={() => remove(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Aling tab ang nakikita ng bawat role (ayon sa Chapter 5)
const TABS = [
  { id: 'children', label: 'Children (TCL)', roles: ['BNS', 'BHW'] },
  { id: 'immunizations', label: 'Immunizations', roles: ['BHW'] },
  { id: 'defaulters', label: 'Defaulters', roles: ['BNS', 'BHW'] },
  { id: 'nutrition', label: 'Nutrition', roles: ['BNS'] },
  { id: 'reports', label: 'Reports', roles: ['BNS'] },
  { id: 'accounts', label: 'Accounts', roles: ['BNS'] },
];

function Shell({ session, onLogout }) {
  const { token, user } = session;
  const [tab, setTab] = useState('children');
  const visibleTabs = TABS.filter((t) => t.roles.includes(user.role));

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
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'children' && <ChildrenTab token={token} onLogout={onLogout} />}
      {tab === 'immunizations' && <Immunizations token={token} />}
      {tab === 'defaulters' && <Defaulters token={token} />}
      {tab === 'nutrition' && <Nutrition token={token} />}
      {tab === 'reports' && <Reports token={token} />}
      {tab === 'accounts' && <Accounts token={token} />}
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