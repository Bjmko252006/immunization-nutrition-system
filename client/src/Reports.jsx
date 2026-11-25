import { useEffect, useState } from 'react';
import { api } from './api';

const RISK_COLORS = {
  Severe: '#a11212',
  Moderate: '#8a5a00',
  Normal: '#176a3a',
  'Above Normal': '#1d4fa3',
  'Not assessed': '#5b6b7a',
};

function Stat({ label, value, color }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        background: '#fff',
      }}
    >
      <div className="muted">{label}</div>
      <div style={{ fontSize: '1.8em', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function Reports({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/reports/summary', { token })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="muted">Loading report...</div>;

  return (
    <div>
      <div className="toolbar">
        <div className="muted">Generated: {new Date(data.generated_at).toLocaleString()}</div>
        <button onClick={() => window.print()}>Print report</button>
      </div>

      <div className="card">
        <h2>Summary</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Stat label="Registered children" value={data.total_children} />
          <Stat
            label="Vaccine defaulters"
            value={data.defaulters.length}
            color={data.defaulters.length > 0 ? RISK_COLORS.Severe : undefined}
          />
          <Stat label="Severe" value={data.counts.Severe} color={RISK_COLORS.Severe} />
          <Stat label="Moderate" value={data.counts.Moderate} color={RISK_COLORS.Moderate} />
          <Stat label="Normal" value={data.counts.Normal} color={RISK_COLORS.Normal} />
          <Stat
            label="Above Normal"
            value={data.counts['Above Normal']}
            color={RISK_COLORS['Above Normal']}
          />
          <Stat label="Not assessed" value={data.counts['Not assessed']} />
        </div>
        <p className="muted">
          Nutrition status counts use the latest assessment of each child.
        </p>
      </div>

      <div className="card">
        <h2>Children at nutrition risk (Moderate or Severe)</h2>
        <table>
          <thead>
            <tr>
              <th>TCL No.</th>
              <th>Child</th>
              <th>Age (months)</th>
              <th>Risk</th>
              <th>WAZ</th>
              <th>HAZ</th>
              <th>WHZ</th>
              <th>Measured</th>
              <th>Guardian</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {data.at_risk.length === 0 && (
              <tr>
                <td colSpan="10" className="muted center">
                  No children at risk.
                </td>
              </tr>
            )}
            {data.at_risk.map((c) => (
              <tr key={c.tcl_number}>
                <td>{c.tcl_number}</td>
                <td>{c.child_name}</td>
                <td>{c.age_months}</td>
                <td style={{ color: RISK_COLORS[c.risk], fontWeight: 600 }}>{c.risk}</td>
                <td>{c.waz}</td>
                <td>{c.haz}</td>
                <td>{c.whz}</td>
                <td>{new Date(c.date_measured).toLocaleDateString()}</td>
                <td>{c.guardian_name}</td>
                <td>{c.guardian_contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Vaccine defaulters</h2>
        <table>
          <thead>
            <tr>
              <th>TCL No.</th>
              <th>Child</th>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Scheduled</th>
              <th>Days overdue</th>
              <th>Guardian</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {data.defaulters.length === 0 && (
              <tr>
                <td colSpan="8" className="muted center">
                  No defaulters.
                </td>
              </tr>
            )}
            {data.defaulters.map((d, i) => (
              <tr key={i}>
                <td>{d.tcl_number}</td>
                <td>{d.child_name}</td>
                <td>{d.vaccine_name}</td>
                <td>{d.dose_number}</td>
                <td>{new Date(d.scheduled_date).toLocaleDateString()}</td>
                <td>{d.days_overdue}</td>
                <td>{d.guardian_name}</td>
                <td>{d.guardian_contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}