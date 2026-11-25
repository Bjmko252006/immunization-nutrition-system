import { useEffect, useState } from 'react';
import { api } from './api';

const emptyForm = { full_name: '', role: 'BHW', username: '', password: '' };

export default function Accounts({ token }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    api('/auth/users', { token })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [token, reloadKey]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await api('/auth/register', { method: 'POST', body: form, token });
      setMessage(`Account created: ${created.username} (${created.role})`);
      setForm(emptyForm);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form className="card form-grid" onSubmit={submit}>
        <h2>Create account</h2>
        <div>
          <label>Full name</label>
          <input value={form.full_name} onChange={set('full_name')} required />
        </div>
        <div>
          <label>Role</label>
          <select value={form.role} onChange={set('role')}>
            <option>BHW</option>
            <option>BNS</option>
          </select>
        </div>
        <div>
          <label>Username</label>
          <input value={form.username} onChange={set('username')} required />
        </div>
        <div>
          <label>Password (at least 8 characters)</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            minLength={8}
            required
          />
        </div>
        {error && <div className="error full">{error}</div>}
        {message && <div className="full">{message}</div>}
        <div className="full actions">
          <button>Create account</button>
        </div>
      </form>

      <div className="card">
        <h2>Accounts</h2>
        <table>
          <thead>
            <tr>
              <th>Full name</th>
              <th>Username</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}