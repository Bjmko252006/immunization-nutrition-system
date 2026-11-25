import { useEffect, useState } from 'react';
import { api } from './api';

const DAY_MS = 86400000;

// Bilangin ang mga araw sa kalendaryo (hindi oras), para hindi mag-iba
// ang resulta depende sa oras ng araw o sa timezone.
// Ang scheduled_date ay naka-save bilang hatinggabi ng UTC ng petsang pinili.
function daysOverdue(date) {
  const s = new Date(date);
  const scheduled = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(Math.round((today - scheduled) / DAY_MS), 0);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' });
}

function currentRole() {
  try {
    return JSON.parse(localStorage.getItem('session')).user.role;
  } catch {
    return null;
  }
}

export default function Defaulters({ token }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const canMark = currentRole() === 'BHW';

  useEffect(() => {
    api('/immunizations/defaulters', { token })
      .then((data) => {
        setRows(data);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [token, reloadKey]);

  const markGiven = async (id) => {
    try {
      await api(`/immunizations/${id}/administer`, { method: 'PUT', token });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Immunization defaulters ({rows.length})</h2>
      <p className="muted">Mga batang hindi pa nabakunahan at lampas na sa scheduled date.</p>
      {error && <div className="error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>TCL No.</th>
            <th>Child</th>
            <th>Vaccine</th>
            <th>Scheduled</th>
            <th>Days overdue</th>
            <th>Guardian</th>
            <th>Contact</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="8" className="muted center">
                Walang defaulter. 🎉
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r._id}>
              <td>{r.child_id?.tcl_number}</td>
              <td>{r.child_id?.child_name}</td>
              <td>
                {r.vaccine_name} (Dose {r.dose_number})
              </td>
              <td>{formatDate(r.scheduled_date)}</td>
              <td>
                <span className="badge">{daysOverdue(r.scheduled_date)} days</span>
              </td>
              <td>{r.child_id?.guardian_name}</td>
              <td>{r.child_id?.guardian_contact}</td>
              <td>
                {canMark && <button onClick={() => markGiven(r._id)}>Mark as given</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}