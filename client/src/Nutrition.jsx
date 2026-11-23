import { useEffect, useState } from 'react';
import { api } from './api';

export default function Nutrition({ token }) {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
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
    api(`/nutrition/child/${childId}`, { token })
      .then(setRecords)
      .catch((err) => setError(err.message));
  }, [childId, token, reloadKey]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const data = await api('/nutrition', {
        method: 'POST',
        token,
        body: {
          child_id: childId,
          date_measured: date,
          weight_kg: Number(weight),
          height_cm: Number(height),
        },
      });
      setResult(data);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form className="card form-grid" onSubmit={save}>
        <h2>OPT+ measurement</h2>
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
          <label>Date measured</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label>Weight (kg)</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Height / length (cm)</label>
          <input
            type="number"
            step="0.1"
            min="35"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            required
          />
        </div>
        {error && <div className="error full">{error}</div>}
        {result && (
          <div className="full">
            <strong>Risk classification: {result.risk_classification}</strong>
            <div className="muted">
              WAZ {result.waz_score} ({result.grades.waz}), HAZ {result.haz_score} (
              {result.grades.haz}), WHZ {result.whz_score} ({result.grades.whz})
            </div>
          </div>
        )}
        <div className="full actions">
          <button disabled={!childId}>Compute and save</button>
        </div>
      </form>

      <div className="card">
        <h2>Nutrition assessments of selected child</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight (kg)</th>
              <th>Height (cm)</th>
              <th>WAZ</th>
              <th>HAZ</th>
              <th>WHZ</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan="7" className="muted center">
                  No assessments yet.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.date_measured).toLocaleDateString()}</td>
                <td>{r.weight_kg}</td>
                <td>{r.height_cm}</td>
                <td>{r.waz_score}</td>
                <td>{r.haz_score}</td>
                <td>{r.whz_score}</td>
                <td>{r.risk_classification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}