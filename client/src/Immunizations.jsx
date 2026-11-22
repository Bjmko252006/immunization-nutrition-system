import { useEffect, useState } from 'react';
import { api } from './api';

const VACCINES = [
  'BCG',
  'Hepatitis B',
  'Pentavalent (DPT-HepB-Hib)',
  'OPV',
  'IPV',
  'PCV',
  'MMR',
];

export default function Immunizations({ token }) {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [records, setRecords] = useState([]);
  const [vaccine, setVaccine] = useState(VACCINES[0]);
  const [dose, setDose] = useState(1);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api('/children', { token })
      .then((data) => {
        setChildren(data);
        if (data.length > 0) setChildId((prev) => prev || data[0]._id);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!childId) return;
    api(`/immunizations/child/${childId}`, { token })
      .then(setRecords)
      .catch((err) => setError(err.message));
  }, [childId, token, reloadKey]);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/immunizations', {
        method: 'POST',
        token,
        body: {
          child_id: childId,
          vaccine_name: vaccine,
          dose_number: Number(dose),
          scheduled_date: date,
        },
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const markGiven = async (id) => {
    try {
      await api(`/immunizations/${id}/administer`, { method: 'PUT', token });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form className="card form-grid" onSubmit={add}>
        <h2>Add vaccine schedule</h2>
        <div className="full">
          <label>Child</label>
          <select value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c._id} value={c._id}>
                {c.tcl_number} - {c.child_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Vaccine</label>
          <select value={vaccine} onChange={(e) => setVaccine(e.target.value)}>
            {VACCINES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Dose number</label>
          <input type="number" min="1" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <div>
          <label>Scheduled date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        {error && <div className="error full">{error}</div>}
        <div className="full actions">
          <button disabled={!childId}>Save schedule</button>
        </div>
      </form>

      <div className="card">
        <h2>Vaccine records of selected child</h2>
        <table>
          <thead>
            <tr>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Scheduled</th>
              <th>Given on</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan="6" className="muted center">
                  No vaccine records yet.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r._id}>
                <td>{r.vaccine_name}</td>
                <td>{r.dose_number}</td>
                <td>{new Date(r.scheduled_date).toLocaleDateString()}</td>
                <td>
                  {r.administered_date ? new Date(r.administered_date).toLocaleDateString() : '-'}
                </td>
                <td>{r.status}</td>
                <td>
                  {r.status !== 'Completed' && (
                    <button onClick={() => markGiven(r._id)}>Mark as given</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}