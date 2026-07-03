import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, BarElement
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement);

const API = '/api';

/* ─── Helpers ─────────────────────────────────────────────────── */
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const downloadCSV = (data, filename, role) => {
  if (!data || data.length === 0) return;
  let headers = [];
  let rows = [];

  if (role === 'donor') {
    headers = ['Name', 'Organization', 'Email', 'Phone', 'Total Donations', 'Qty Donated', 'Freshness', 'Points', 'Premium', 'Status', 'Joined'];
    rows = data.map(u => [
      u.name, u.organizationName || '', u.email, u.phone, u.totalDonations || 0,
      u.totalQuantityDonated || 0, u.avgFreshnessScore || 0, u.points || 0,
      u.isPremium ? 'Yes' : 'No', u.isSuspended ? 'Suspended' : 'Active', new Date(u.createdAt).toLocaleDateString()
    ]);
  } else if (role === 'receiver') {
    headers = ['Name', 'Organization', 'Email', 'Phone', 'Total Received', 'Qty Received', 'Points', 'Status', 'Joined'];
    rows = data.map(u => [
      u.name, u.organizationName || '', u.email, u.phone, u.totalReceived || 0,
      u.totalQuantityReceived || 0, u.points || 0, u.isSuspended ? 'Suspended' : 'Active', new Date(u.createdAt).toLocaleDateString()
    ]);
  } else if (role === 'leaderboard') {
    headers = ['Rank', 'Name', 'Organization', 'Points', 'Total Donations', 'Qty Donated', 'Freshness'];
    rows = data.map(u => [
      u.rank, u.name, u.organizationName || '', u.points || 0, u.totalDonations || 0, u.totalQuantityDonated || 0, u.avgFreshnessScore || 0
    ]);
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* ─── Sub-components ──────────────────────────────────────────── */

// KPI Card
const KpiCard = ({ icon, label, value, sub, color }) => (
  <div className="admin-kpi-card" style={{ '--kpi-color': color }}>
    <div className="admin-kpi-icon">{icon}</div>
    <div className="admin-kpi-body">
      <div className="admin-kpi-value">{value}</div>
      <div className="admin-kpi-label">{label}</div>
      {sub && <div className="admin-kpi-sub">{sub}</div>}
    </div>
  </div>
);

// Status badge
const Badge = ({ text, type }) => (
  <span className={`admin-badge admin-badge--${type}`}>{text}</span>
);

/* ════════════════════════════════════════════════════════════════
   OVERVIEW TAB
════════════════════════════════════════════════════════════════ */
const OverviewTab = ({ stats }) => {
  if (!stats) return <div className="admin-loading">Loading stats…</div>;
  return (
    <div className="admin-tab-content">
      <h2 className="admin-section-title">📊 Platform Overview</h2>
      <div className="admin-kpi-grid">
        <KpiCard icon="🍽️" label="Total Donations" value={stats.totalDonations} sub={`${stats.todayDonations} today`} color="#10b981" />
        <KpiCard icon="🤝" label="Total Donors" value={stats.totalDonors} sub={`${stats.premiumDonors} premium`} color="#6366f1" />
        <KpiCard icon="🏠" label="Receivers" value={stats.totalReceivers} color="#f59e0b" />
        <KpiCard icon="⚡" label="Active Donations" value={stats.activeDonations} color="#3b82f6" />
        <KpiCard icon="✅" label="Completed" value={stats.completedDonations} color="#10b981" />
        <KpiCard icon="📦" label="Total Quantity" value={`${stats.totalQuantity} units`} color="#8b5cf6" />
        <KpiCard icon="🌙" label="Early Donations Today" value={stats.earlyToday} sub="Before 9 PM" color="#f97316" />
        <KpiCard icon="🚫" label="Suspended Users" value={stats.suspendedUsers} color="#ef4444" />
      </div>

      <div className="admin-settings-row">
        <div className="admin-info-card">
          <h3>⚙️ Current Settings</h3>
          <p>Max receives/day: <strong>{stats.settings?.maxReceivesPerDay}</strong></p>
          <p>Min receives/day: <strong>{stats.settings?.minReceivesPerDay}</strong></p>
          <p>Early bonus multiplier: <strong>{stats.settings?.earlyDonationMultiplier}×</strong></p>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   USERS TAB
════════════════════════════════════════════════════════════════ */
const UsersTab = ({ role }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [modalUser, setModalUser] = useState(null);
  const [modalDonations, setModalDonations] = useState([]);
  const [actionMsg, setActionMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { role, search, status: filterStatus };
      const res = await axios.get(`${API}/admin/users`, { headers: authHeader(), params });
      setUsers(res.data.users);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [role, search, filterStatus]);

  const handleDownloadCSV = () => {
    downloadCSV(users, `${role}s_data.csv`, role);
  };

  const openProfile = async (u) => {
    try {
      const res = await axios.get(`${API}/admin/users/${u._id}`, { headers: authHeader() });
      setModalUser(res.data.user);
      setModalDonations(res.data.donationHistory);
    } catch (e) { console.error(e); }
  };

  const suspendUser = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/suspend`, { reason: suspendReason }, { headers: authHeader() });
      setActionMsg('User suspended successfully');
      setSuspendReason('');
      setSelected(null);
      fetchUsers();
    } catch (e) { setActionMsg(e.response?.data?.message || 'Error'); }
  };

  const unsuspendUser = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/unsuspend`, {}, { headers: authHeader() });
      setActionMsg('User unsuspended');
      fetchUsers();
    } catch (e) { setActionMsg(e.response?.data?.message || 'Error'); }
  };

  const grantPremium = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/grant-premium`, { plan: 'monthly', durationMonths: 1 }, { headers: authHeader() });
      setActionMsg('Premium granted for 1 month');
      fetchUsers();
    } catch (e) { setActionMsg(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="admin-tab-content">
      <h2 className="admin-section-title">
        {role === 'donor' ? '🤝 Donors' : '🏠 Receivers'}
      </h2>

      {actionMsg && (
        <div className="admin-action-msg" onClick={() => setActionMsg('')}>{actionMsg} ✕</div>
      )}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by name, email, org…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="suspended">Suspended</option>
          {role === 'donor' && <option value="premium">Premium</option>}
        </select>
        <button className="admin-btn admin-btn--ghost" onClick={fetchUsers}>🔄 Refresh</button>
        <button className="admin-btn admin-btn--info" onClick={handleDownloadCSV}>📥 Download CSV</button>
      </div>

      {loading ? <div className="admin-loading">Loading…</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name / Org</th>
                <th>ID</th>
                <th>Email</th>
                <th>Phone</th>
                {role === 'donor' && <><th>Donations</th><th>Qty Donated</th><th>Freshness</th><th>Points</th><th>Premium</th></>}
                {role === 'receiver' && <><th>Total Received</th><th>Qty Received</th><th>Points</th></>}
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={u.isSuspended ? 'admin-row--suspended' : ''}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{u.name[0]}</div>
                      <div>
                        <div className="admin-user-name">{u.name}</div>
                        <div className="admin-user-org">{u.organizationName}</div>
                      </div>
                    </div>
                  </td>
                  <td><code className="admin-id">{u.uniqueId || 'N/A'}</code></td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  {role === 'donor' && (
                    <>
                      <td>{u.totalDonations || 0}</td>
                      <td>{u.totalQuantityDonated || 0} units</td>
                      <td><span style={{color: (u.avgFreshnessScore || 0) >= 80 ? '#10b981' : (u.avgFreshnessScore || 0) >= 50 ? '#f59e0b' : '#ef4444'}}>{u.avgFreshnessScore || 0}%</span></td>
                      <td><span className="admin-points">⭐ {u.points || 0}</span></td>
                      <td>{u.isPremium ? <Badge text="💎 Premium" type="premium" /> : <Badge text="Free" type="free" />}</td>
                    </>
                  )}
                  {role === 'receiver' && (
                    <>
                      <td>{u.totalReceived || 0}</td>
                      <td>{u.totalQuantityReceived || 0} units</td>
                      <td><span className="admin-points">⭐ {u.points || 0}</span></td>
                    </>
                  )}
                  <td>
                    {u.isSuspended
                      ? <Badge text="🚫 Suspended" type="danger" />
                      : <Badge text="✅ Active" type="success" />}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--sm admin-btn--info" onClick={() => openProfile(u)}>👁 View</button>
                      {u.isSuspended ? (
                        <button className="admin-btn admin-btn--sm admin-btn--success" onClick={() => unsuspendUser(u._id)}>✅ Restore</button>
                      ) : (
                        <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => setSelected(u)}>🚫 Suspend</button>
                      )}
                      {role === 'donor' && !u.isPremium && (
                        <button className="admin-btn admin-btn--sm admin-btn--premium" onClick={() => grantPremium(u._id)}>💎 Premium</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="admin-empty">No users found</div>}
        </div>
      )}

      {/* Suspend Modal */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>🚫 Suspend {selected.name}?</h3>
            <p className="admin-modal-sub">This will immediately block the user from logging in.</p>
            <textarea
              className="admin-textarea"
              placeholder="Reason for suspension (optional)"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              rows={3}
            />
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="admin-btn admin-btn--danger" onClick={() => suspendUser(selected._id)}>Confirm Suspend</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {modalUser && (
        <div className="admin-modal-overlay" onClick={() => setModalUser(null)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="admin-profile-header">
              <div className="admin-avatar admin-avatar--lg">{modalUser.name[0]}</div>
              <div>
                <h3>{modalUser.name} {modalUser.isPremium && <span className="admin-crown">👑</span>}</h3>
                <p>{modalUser.organizationName} · {modalUser.organizationType}</p>
                <p>{modalUser.email} · {modalUser.phone}</p>
                <p>ID: <code>{modalUser.uniqueId || 'Admin'}</code></p>
              </div>
            </div>
            <div className="admin-profile-stats">
              {modalUser.role === 'donor' ? (
                <>
                  <div className="admin-stat"><span>{modalUser.totalDonations || 0}</span><label>Donations</label></div>
                  <div className="admin-stat"><span>{modalUser.totalQuantityDonated || 0}</span><label>Qty Donated</label></div>
                  <div className="admin-stat"><span>{modalUser.avgFreshnessScore || 0}%</span><label>Avg Freshness</label></div>
                  <div className="admin-stat"><span>⭐ {modalUser.points || 0}</span><label>Points</label></div>
                </>
              ) : (
                <>
                  <div className="admin-stat"><span>{modalUser.totalReceived || 0}</span><label>Total Received</label></div>
                  <div className="admin-stat"><span>{modalUser.totalPickedUp || 0}</span><label>Picked Up</label></div>
                  <div className="admin-stat"><span>{modalUser.totalQuantityReceived || 0}</span><label>Qty Received</label></div>
                  <div className="admin-stat"><span>⭐ {modalUser.points || 0}</span><label>Points</label></div>
                </>
              )}
            </div>
            {modalDonations.length > 0 && (
              <div className="admin-profile-history">
                <h4>Recent Activity</h4>
                <table className="admin-table admin-table--sm">
                  <thead><tr><th>Food</th><th>Qty</th><th>Status</th><th>Freshness</th><th>Date</th></tr></thead>
                  <tbody>
                    {modalDonations.slice(0, 8).map(d => (
                      <tr key={d._id}>
                        <td>{d.foodName || d.donorId?.name}</td>
                        <td>{d.quantity} {d.unit}</td>
                        <td><Badge text={d.status} type={d.status === 'picked_up' ? 'success' : d.status === 'pending' ? 'info' : 'neutral'} /></td>
                        <td>{d.freshnessScore || '-'}%</td>
                        <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModalUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   LEADERBOARD TAB
════════════════════════════════════════════════════════════════ */
const LeaderboardTab = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [criteria, setCriteria] = useState('points');
  const [loading, setLoading] = useState(true);

  const criteriaOptions = [
    { key: 'points', label: '⭐ Points', icon: '⭐' },
    { key: 'quantity', label: '📦 Quantity', icon: '📦' },
    { key: 'count', label: '🔢 Donations', icon: '🔢' },
    { key: 'freshness', label: '🌿 Freshness', icon: '🌿' }
  ];

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/leaderboard`, {
        headers: authHeader(), params: { criteria }
      });
      setLeaderboard(res.data.leaderboard);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchLeaderboard(); }, [criteria]);

  const handleDownloadCSV = () => {
    downloadCSV(leaderboard, `leaderboard_${criteria}.csv`, 'leaderboard');
  };

  const medals = ['🥇', '🥈', '🥉'];

  const getValue = (donor) => {
    if (criteria === 'quantity') return `${donor.totalQuantityDonated || 0} units`;
    if (criteria === 'count') return `${donor.totalDonations || 0} donations`;
    if (criteria === 'freshness') return `${donor.avgFreshnessScore || 0}% avg`;
    return `${donor.points || 0} pts`;
  };

  return (
    <div className="admin-tab-content">
      <h2 className="admin-section-title">🏆 Top 10 Donor Leaderboard</h2>
      <div className="admin-criteria-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {criteriaOptions.map(c => (
          <button
            key={c.key}
            className={`admin-criteria-tab ${criteria === c.key ? 'active' : ''}`}
            onClick={() => setCriteria(c.key)}
          >
            {c.label}
          </button>
        ))}
        <button className="admin-btn admin-btn--info" onClick={handleDownloadCSV} style={{marginLeft: 'auto'}}>📥 Download CSV</button>
      </div>

      {loading ? <div className="admin-loading">Loading…</div> : (
        <div className="admin-leaderboard">
          {leaderboard.map((donor) => (
            <div className={`admin-leaderboard-row ${donor.rank <= 3 ? 'admin-leaderboard-row--top' : ''}`} key={donor._id}>
              <div className="admin-lb-rank">
                {donor.rank <= 3 ? medals[donor.rank - 1] : `#${donor.rank}`}
              </div>
              <div className="admin-lb-avatar">{donor.name[0]}</div>
              <div className="admin-lb-info">
                <div className="admin-lb-name">
                  {donor.name}
                  {donor.isPremium && <span className="admin-crown">👑</span>}
                  {donor.isSuspended && <Badge text="Suspended" type="danger" />}
                </div>
                <div className="admin-lb-org">{donor.organizationName}</div>
              </div>
              <div className="admin-lb-stats">
                <div className="admin-lb-primary">{getValue(donor)}</div>
                <div className="admin-lb-secondary">⭐ {donor.points || 0} pts · {donor.totalDonations || 0} donations · 📦 {donor.totalQuantityDonated || 0} qty · 🌿 {donor.avgFreshnessScore || 0}%</div>
              </div>
              <div className="admin-lb-bar-wrap">
                <div
                  className="admin-lb-bar"
                  style={{
                    width: (() => {
                      const getVal = (d) => {
                        if (criteria === 'quantity') return d.totalQuantityDonated || 0;
                        if (criteria === 'count') return d.totalDonations || 0;
                        if (criteria === 'freshness') return d.avgFreshnessScore || 0;
                        return d.points || 0;
                      };
                      const topVal = leaderboard[0] ? Math.max(getVal(leaderboard[0]), 1) : 1;
                      return `${Math.min(100, (getVal(donor) / topVal) * 100)}%`;
                    })()
                  }}
                />
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <div className="admin-empty">No donors yet</div>}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   CHART TAB
════════════════════════════════════════════════════════════════ */
const customCanvasBackgroundColor = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || '#09090b';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

const ChartTab = () => {
  const [chartData, setChartData] = useState(null);
  const [period, setPeriod] = useState('30days');
  const [chartType, setChartType] = useState('daily');
  const [chartStyle, setChartStyle] = useState('line'); // 'line' or 'bar'
  const [hourlyDate, setHourlyDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  const downloadChart = () => {
    let url = chartRef.current?.toBase64Image?.();
    if (!url && chartRef.current?.canvas) {
      url = chartRef.current.canvas.toDataURL('image/png');
    }
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart_${chartType}_${Date.now()}.png`;
      link.click();
    }
  };

  const fetchChart = async () => {
    setLoading(true);
    try {
      const params = { period, type: chartType };
      if (chartType === 'hourly') params.date = hourlyDate;
      const res = await axios.get(`${API}/admin/donations/chart`, {
        headers: authHeader(), params
      });
      setChartData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchChart(); }, [period, chartType, hourlyDate]);

  const buildChartData = () => {
    if (!chartData) return null;
    const data = chartData.data || [];

    if (chartType === 'hourly') {
      return {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Donations',
            data: data.map(d => d.count),
            borderColor: '#6366f1',
            backgroundColor: chartStyle === 'bar'
              ? data.map(d => d.isEarlyWindow ? 'rgba(99,102,241,0.6)' : 'rgba(239,68,68,0.5)')
              : (ctx) => {
                  const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                  gradient.addColorStop(0, 'rgba(99,102,241,0.3)');
                  gradient.addColorStop(1, 'rgba(99,102,241,0)');
                  return gradient;
                },
            tension: 0.4,
            fill: chartStyle === 'line',
            pointBackgroundColor: data.map(d => d.isEarlyWindow ? '#f59e0b' : '#6366f1'),
            pointRadius: chartStyle === 'line' ? 5 : 0,
            borderRadius: chartStyle === 'bar' ? 6 : 0
          },
          {
            label: 'Quantity',
            data: data.map(d => d.quantity),
            borderColor: '#10b981',
            backgroundColor: chartStyle === 'bar' ? 'rgba(16,185,129,0.5)' : 'transparent',
            tension: 0.4,
            fill: false,
            pointRadius: chartStyle === 'line' ? 4 : 0,
            borderRadius: chartStyle === 'bar' ? 6 : 0,
            yAxisID: 'y2'
          },
          {
            label: 'Early Bonus',
            data: data.map(d => d.earlyBonus),
            borderColor: '#f59e0b',
            backgroundColor: chartStyle === 'bar' ? 'rgba(245,158,11,0.5)' : 'transparent',
            borderDash: chartStyle === 'line' ? [5, 5] : [],
            tension: 0.4,
            fill: false,
            pointRadius: chartStyle === 'line' ? 4 : 0,
            borderRadius: chartStyle === 'bar' ? 6 : 0
          }
        ]
      };
    }

    return {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'Donations',
          data: data.map(d => d.count),
          borderColor: '#6366f1',
          backgroundColor: chartStyle === 'bar' ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.1)',
          tension: 0.4,
          fill: chartStyle === 'line',
          pointRadius: chartStyle === 'line' ? 4 : 0,
          borderRadius: chartStyle === 'bar' ? 6 : 0
        },
        {
          label: 'Total Quantity',
          data: data.map(d => d.quantity),
          borderColor: '#10b981',
          backgroundColor: chartStyle === 'bar' ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.05)',
          tension: 0.4,
          fill: chartStyle === 'line',
          pointRadius: chartStyle === 'line' ? 4 : 0,
          yAxisID: 'y2',
          borderRadius: chartStyle === 'bar' ? 6 : 0
        },
        {
          label: 'Early Donations',
          data: data.map(d => d.earlyBonus),
          borderColor: '#f59e0b',
          backgroundColor: chartStyle === 'bar' ? 'rgba(245,158,11,0.5)' : 'transparent',
          borderDash: chartStyle === 'line' ? [5, 5] : [],
          tension: 0.4,
          fill: false,
          pointRadius: chartStyle === 'line' ? 3 : 0,
          borderRadius: chartStyle === 'bar' ? 6 : 0
        },
        ...(data[0]?.avgFreshness !== undefined ? [{
          label: 'Avg Freshness %',
          data: data.map(d => d.avgFreshness),
          borderColor: '#8b5cf6',
          backgroundColor: chartStyle === 'bar' ? 'rgba(139,92,246,0.5)' : 'transparent',
          borderDash: chartStyle === 'line' ? [3, 3] : [],
          tension: 0.4,
          fill: false,
          pointRadius: chartStyle === 'line' ? 3 : 0,
          yAxisID: 'y2',
          borderRadius: chartStyle === 'bar' ? 6 : 0
        }] : [])
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#e2e8f0' } },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8'
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', maxTicksLimit: chartType === 'hourly' ? 24 : 10 },
        grid: { color: 'rgba(148,163,184,0.1)' }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148,163,184,0.1)' }
      },
      y2: {
        position: 'right',
        ticks: { color: '#10b981' },
        grid: { display: false }
      }
    }
  };

  const ChartComponent = chartStyle === 'bar' ? Bar : Line;

  return (
    <div className="admin-tab-content">
      <h2 className="admin-section-title">📈 Donation Trends</h2>

      <div className="admin-toolbar">
        <div className="admin-toggle-group">
          {['daily', 'hourly'].map(t => (
            <button
              key={t}
              className={`admin-toggle-btn ${chartType === t ? 'active' : ''}`}
              onClick={() => setChartType(t)}
            >
              {t === 'daily' ? '📅 Daily' : '⏰ Hourly'}
            </button>
          ))}
        </div>
        <div className="admin-toggle-group" style={{marginLeft: 8}}>
          {['line', 'bar'].map(s => (
            <button
              key={s}
              className={`admin-toggle-btn ${chartStyle === s ? 'active' : ''}`}
              onClick={() => setChartStyle(s)}
            >
              {s === 'line' ? '📈 Line' : '📊 Bar'}
            </button>
          ))}
        </div>
        {chartType === 'daily' && (
          <select className="admin-select" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
        )}
        {chartType === 'hourly' && (
          <input
            type="date"
            className="admin-input"
            value={hourlyDate}
            onChange={e => setHourlyDate(e.target.value)}
            style={{maxWidth: 200}}
          />
        )}
        <button className="admin-btn admin-btn--ghost" onClick={fetchChart}>🔄 Refresh</button>
        <button className="admin-btn admin-btn--info" onClick={downloadChart}>📸 Download Image</button>
      </div>

      {chartType === 'hourly' && (
        <div className="admin-chart-legend-note">
          <span className="admin-early-dot" /> Yellow dots = before 9 PM (early donation window)
          {chartData?.date && <span style={{marginLeft: 16, color: '#94a3b8'}}>📅 Showing: {chartData.date}</span>}
        </div>
      )}

      <div className="admin-chart-box">
        {loading ? (
          <div className="admin-loading">Loading chart…</div>
        ) : buildChartData() && buildChartData().labels.length > 0 ? (
          <ChartComponent ref={chartRef} data={buildChartData()} options={chartOptions} plugins={[customCanvasBackgroundColor]} />
        ) : (
          <div className="admin-empty">No donation data for this period</div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   ADS TAB
════════════════════════════════════════════════════════════════ */
const AdsTab = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', slot: 'banner', linkUrl: '', endDate: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPreviewUrl, setAiPreviewUrl] = useState('');
  const [overlayHeadline, setOverlayHeadline] = useState('');
  const [overlaySubheadline, setOverlaySubheadline] = useState('');
  const [overlayTagline, setOverlayTagline] = useState('');
  const fileRef = useRef();
  const previewCanvasRef = useRef(null);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/ads`, { headers: authHeader() });
      setAds(res.data.ads);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  // Draw overlay text on background image
  useEffect(() => {
    if (!aiPreviewUrl || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      canvas.width = 1080;
      canvas.height = 500;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      const centerX = canvas.width / 2;

      if (overlayHeadline) {
        ctx.font = 'bold 50px Arial, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(overlayHeadline, centerX, 80);
      }
      if (overlaySubheadline) {
        ctx.font = 'bold 35px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(overlaySubheadline, centerX, 140);
      }
      if (overlayTagline) {
        ctx.font = 'italic 28px Arial, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(overlayTagline, centerX, canvas.height - 40);
      }
    };
    img.src = aiPreviewUrl;
  }, [aiPreviewUrl, overlayHeadline, overlaySubheadline, overlayTagline]);

  const uploadAd = async (e) => {
    e.preventDefault();
    if (!file && !useAI) return setMsg('Please select a file or use AI generation');
    if (useAI && !aiPrompt.trim()) return setMsg('Please enter a prompt for AI');
    if (useAI && !aiPreviewUrl) return setMsg('Please generate a preview first');
    setUploading(true);
    try {
      const fd = new FormData();
      if (!useAI && file) fd.append('file', file);
      if (useAI) {
        if (previewCanvasRef.current) {
          fd.append('generatedImageUrl', previewCanvasRef.current.toDataURL('image/jpeg', 0.95));
        } else {
          fd.append('generatedImageUrl', aiPreviewUrl);
        }
      }
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await axios.post(`${API}/admin/ads`, fd, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setMsg('Advertisement uploaded!');
      setShowUpload(false);
      setFile(null);
      setAiPrompt('');
      setAiPreviewUrl('');
      setOverlayHeadline('');
      setOverlaySubheadline('');
      setOverlayTagline('');
      setUseAI(false);
      setForm({ title: '', description: '', slot: 'banner', linkUrl: '', endDate: '' });
      fetchAds();
    } catch (e) { setMsg(e.response?.data?.message || 'Upload failed'); }
    setUploading(false);
  };

  const [generating, setGenerating] = useState(false);

  const handleGeneratePreview = async () => {
    if (!aiPrompt.trim()) return setMsg('Please enter a prompt to generate');
    setMsg('');
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/admin/generate-image`, { prompt: aiPrompt }, { headers: authHeader() });
      setAiPreviewUrl(res.data.url);
    } catch (error) {
      setMsg(error.response?.data?.message || 'Failed to generate image. Did you configure the API in Settings?');
    }
    setGenerating(false);
  };

  const toggleAd = async (ad) => {
    try {
      await axios.put(`${API}/admin/ads/${ad._id}`, { isActive: !ad.isActive }, { headers: authHeader() });
      fetchAds();
    } catch (e) { console.error(e); }
  };

  const deleteAd = async (id) => {
    if (!window.confirm('Delete this advertisement?')) return;
    try {
      await axios.delete(`${API}/admin/ads/${id}`, { headers: authHeader() });
      setMsg('Ad deleted');
      fetchAds();
    } catch (e) { console.error(e); }
  };

  const slotColors = { hero: '#6366f1', banner: '#10b981', sidebar: '#f59e0b', popup: '#ef4444' };

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <h2 className="admin-section-title">📢 Advertisement Manager</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setShowUpload(true)}>+ Upload Ad</button>
      </div>

      {msg && <div className="admin-action-msg" onClick={() => setMsg('')}>{msg} ✕</div>}

      <div className="admin-ads-slots-info">
        {Object.entries(slotColors).map(([slot, color]) => (
          <div key={slot} className="admin-slot-badge" style={{ '--slot-color': color }}>
            <span className="admin-slot-dot" />
            <strong>{slot}</strong>
          </div>
        ))}
      </div>

      {loading ? <div className="admin-loading">Loading…</div> : (
        <div className="admin-ads-grid">
          {ads.map(ad => (
            <div key={ad._id} className={`admin-ad-card ${!ad.isActive ? 'admin-ad-card--inactive' : ''}`}>
              <div className="admin-ad-preview">
                {ad.type === 'video'
                  ? <video src={ad.fileUrl} className="admin-ad-media" muted loop />
                  : <img src={ad.fileUrl} alt={ad.title} className="admin-ad-media" />
                }
                <div className="admin-ad-slot-tag" style={{ background: slotColors[ad.slot] || '#6366f1' }}>
                  {ad.slot}
                </div>
              </div>
              <div className="admin-ad-info">
                <div className="admin-ad-title">{ad.title}</div>
                <div className="admin-ad-meta">
                  📅 {new Date(ad.createdAt).toLocaleDateString()}
                  · 👁 {ad.views || 0} views
                  · {ad.type === 'video' ? '🎥 Video' : '🖼 Image'}
                </div>
                {ad.endDate && <div className="admin-ad-expiry">Expires: {new Date(ad.endDate).toLocaleDateString()}</div>}
              </div>
              <div className="admin-ad-controls">
                <button
                  className={`admin-btn admin-btn--sm ${ad.isActive ? 'admin-btn--warning' : 'admin-btn--success'}`}
                  onClick={() => toggleAd(ad)}
                >
                  {ad.isActive ? '⏸ Deactivate' : '▶️ Activate'}
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => deleteAd(ad._id)}>🗑 Delete</button>
              </div>
            </div>
          ))}
          {ads.length === 0 && <div className="admin-empty">No advertisements yet. Upload your first ad!</div>}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="admin-modal-overlay" onClick={() => { 
          setShowUpload(false); 
          setAiPreviewUrl(''); 
          setOverlayHeadline('');
          setOverlaySubheadline('');
          setOverlayTagline('');
        }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>📢 Upload Advertisement</h3>
            <form onSubmit={uploadAd} className="admin-form">
              <div className="admin-form-group">
                <label>Title *</label>
                <input className="admin-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ad title" />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <input className="admin-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
              </div>
              <div className="admin-form-group">
                <label>Display Slot *</label>
                <select className="admin-select" value={form.slot} onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}>
                  <option value="hero">Hero (Top Banner — large, full width)</option>
                  <option value="banner">Banner (Mid-page banner)</option>
                  <option value="sidebar">Sidebar (Side panel)</option>
                  <option value="popup">Popup (Floating overlay)</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Click URL (optional)</label>
                <input className="admin-input" value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="admin-form-group">
                <label>Expiry Date (optional)</label>
                <input type="date" className="admin-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="admin-form-group">
                <label>Media Source *</label>
                <div style={{display: 'flex', gap: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" checked={!useAI} onChange={() => setUseAI(false)} /> Upload File
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input type="radio" checked={useAI} onChange={() => setUseAI(true)} /> Generate with AI (Free)
                  </label>
                </div>
              </div>

              {!useAI ? (
                <div className="admin-form-group">
                  <label>File (Image or Video) *</label>
                  <div className="admin-file-drop" onClick={() => fileRef.current?.click()}>
                    {file ? <span>📎 {file.name}</span> : <span>Click to select image or video</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                </div>
              ) : (
                <div className="admin-form-group">
                  <label>AI Prompt (Image only) *</label>
                  <textarea 
                    className="admin-input" 
                    rows={3} 
                    placeholder="E.g., A beautiful banner showing fresh vegetables and people sharing food..."
                    value={aiPrompt}
                    onChange={e => {
                      setAiPrompt(e.target.value);
                      setAiPreviewUrl('');
                    }}
                  />
                  <button type="button" className="admin-btn admin-btn--info" onClick={handleGeneratePreview} style={{marginTop: '0.5rem', width: '100%'}} disabled={generating}>
                    {generating ? '⏳ Generating Preview...' : '✨ Generate Preview'}
                  </button>
                  
                  {aiPreviewUrl && (
                    <div style={{marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem'}}>
                      <h4 style={{marginBottom: '0.5rem', color: '#f8fafc'}}>✏️ Add Perfect Text (Optional)</h4>
                      <input className="admin-input" placeholder="Headline (Large, Top)" value={overlayHeadline} onChange={e => setOverlayHeadline(e.target.value)} style={{marginBottom: '0.5rem'}} />
                      <input className="admin-input" placeholder="Subheadline (Medium, Below Headline)" value={overlaySubheadline} onChange={e => setOverlaySubheadline(e.target.value)} style={{marginBottom: '0.5rem'}} />
                      <input className="admin-input" placeholder="Tagline (Small, Bottom)" value={overlayTagline} onChange={e => setOverlayTagline(e.target.value)} />
                      
                      <div style={{marginTop: '1rem'}}>
                        <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem'}}>Final Ad Preview:</label>
                        <canvas 
                          ref={previewCanvasRef} 
                          style={{width: '100%', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', display: 'block'}} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {msg && <div className="admin-msg admin-msg--error">{msg}</div>}
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => { 
                  setShowUpload(false); 
                  setAiPreviewUrl(''); 
                  setOverlayHeadline('');
                  setOverlaySubheadline('');
                  setOverlayTagline('');
                }}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={uploading}>
                  {uploading ? 'Uploading…' : '📤 Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   SETTINGS TAB
════════════════════════════════════════════════════════════════ */
const SettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    axios.get(`${API}/admin/settings`, { headers: authHeader() })
      .then(r => setSettings(r.data.settings))
      .catch(console.error);
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, settings, { headers: authHeader() });
      setMsg('✅ Settings saved!');
    } catch (e) { setMsg('❌ Failed to save'); }
    setSaving(false);
  };

  const recalculateStats = async () => {
    if (!window.confirm('This will recalculate all donor stats (points, donations, quantity, freshness) from actual donation records. Continue?')) return;
    setRecalculating(true);
    try {
      const res = await axios.post(`${API}/admin/recalculate-stats`, {}, { headers: authHeader() });
      setMsg(`✅ ${res.data.message}`);
    } catch (e) { setMsg('❌ Failed to recalculate stats'); }
    setRecalculating(false);
  };

  if (!settings) return <div className="admin-loading">Loading settings…</div>;

  return (
    <div className="admin-tab-content">
      <h2 className="admin-section-title">⚙️ Platform Settings</h2>
      {msg && <div className="admin-action-msg" onClick={() => setMsg('')}>{msg} ✕</div>}

      <form onSubmit={save} className="admin-settings-form">
        <div className="admin-settings-card">
          <h3>📦 Receive Limits</h3>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Minimum Receives per Day</label>
              <input type="number" className="admin-input" min={1} max={20}
                value={settings.minReceivesPerDay}
                onChange={e => setSettings(s => ({ ...s, minReceivesPerDay: +e.target.value }))} />
              <small>Minimum number of donations a receiver can claim daily</small>
            </div>
            <div className="admin-form-group">
              <label>Maximum Receives per Day</label>
              <input type="number" className="admin-input" min={1} max={50}
                value={settings.maxReceivesPerDay}
                onChange={e => setSettings(s => ({ ...s, maxReceivesPerDay: +e.target.value }))} />
              <small>Hard cap per receiver per day</small>
            </div>
          </div>
        </div>

        <div className="admin-settings-card">
          <h3>⭐ Gamification</h3>
          <div className="admin-form-group">
            <label>Early Donation Multiplier (before 9 PM)</label>
            <input type="number" className="admin-input" min={1} max={5} step={0.5}
              value={settings.earlyDonationMultiplier}
              onChange={e => setSettings(s => ({ ...s, earlyDonationMultiplier: +e.target.value }))} />
            <small>Points multiplier for donations submitted before 9:00 PM</small>
          </div>
        </div>

        <div className="admin-settings-card">
          <h3>🤖 Custom AI Image Generation API</h3>
          <div className="admin-form-group">
            <label>API URL</label>
            <input type="text" className="admin-input" placeholder="e.g. https://api-inference.huggingface.co/models/..."
              value={settings.aiImageApiUrl || ''}
              onChange={e => setSettings(s => ({ ...s, aiImageApiUrl: e.target.value }))} />
            <small>Provide an OpenAI compatible image generation endpoint or a Hugging Face Inference API URL.</small>
          </div>
          <div className="admin-form-group">
            <label>API Key (Bearer Token)</label>
            <input type="password" className="admin-input" placeholder="Enter your API Key here"
              value={settings.aiImageApiKey || ''}
              onChange={e => setSettings(s => ({ ...s, aiImageApiKey: e.target.value }))} />
          </div>
        </div>

        <div className="admin-settings-card" style={{borderLeft: '4px solid #f59e0b'}}>
          <h3>🔄 Recalculate Donor Stats</h3>
          <p style={{color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem'}}>
            If donor stats (points, total donations, quantity, freshness) show as 0, click below to recompute them from actual donation records. This is useful after a data migration or if stats got out of sync.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--warning"
            onClick={recalculateStats}
            disabled={recalculating}
            style={{marginBottom: 0}}
          >
            {recalculating ? '⏳ Recalculating…' : '🔄 Recalculate All Donor Stats'}
          </button>
        </div>

        <div className="admin-settings-card admin-settings-card--info">
          <h3>💡 Points System Reference</h3>
          <table className="admin-table admin-table--sm">
            <thead><tr><th>Action</th><th>Points</th></tr></thead>
            <tbody>
              <tr><td>Any donation</td><td>+10 pts</td></tr>
              <tr><td>Donation before 9 PM</td><td>+15 pts bonus</td></tr>
              <tr><td>Freshness score &gt; 80%</td><td>+5 pts bonus</td></tr>
              <tr><td>Premium donor + early donation</td><td>+30 pts early bonus</td></tr>
            </tbody>
          </table>
        </div>

        <div className="admin-settings-card admin-settings-card--info">
          <h3>💎 Premium Donor Benefits</h3>
          <ul className="admin-benefits-list">
            <li>✅ Priority listing in receiver feed</li>
            <li>✅ Personal analytics dashboard</li>
            <li>✅ CSV export of donation history</li>
            <li>✅ Gold 👑 Premium badge on profile</li>
            <li>✅ 2× early donation points multiplier</li>
            <li>✅ Receiver phone numbers visible directly</li>
          </ul>
        </div>

        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Settings'}
        </button>
      </form>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'overview', label: '📊 Overview', icon: '📊' },
  { key: 'donors', label: '🤝 Donors', icon: '🤝' },
  { key: 'receivers', label: '🏠 Receivers', icon: '🏠' },
  { key: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
  { key: 'chart', label: '📈 Charts', icon: '📈' },
  { key: 'ads', label: '📢 Ads', icon: '📢' },
  { key: 'settings', label: '⚙️ Settings', icon: '⚙️' }
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Fetch overview stats
    axios.get(`${API}/admin/stats`, { headers: authHeader() })
      .then(r => setStats(r.data))
      .catch(console.error);

    // Get admin name from stored user
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      if (stored.name) setAdminName(stored.name);
    } catch {}
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab stats={stats} />;
      case 'donors':      return <UsersTab role="donor" />;
      case 'receivers':   return <UsersTab role="receiver" />;
      case 'leaderboard': return <LeaderboardTab />;
      case 'chart':       return <ChartTab />;
      case 'ads':         return <AdsTab />;
      case 'settings':    return <SettingsTab />;
      default:            return <OverviewTab stats={stats} />;
    }
  };

  return (
    <div className="admin-layout">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">🍽️</span>
            {sidebarOpen && <span className="admin-logo-text">FoodShare<br /><small>Admin Panel</small></span>}
          </div>
          <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="admin-nav">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              title={tab.label}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              {sidebarOpen && <span className="admin-nav-label">{tab.label.replace(/^\S+\s/, '')}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="admin-sidebar-footer">
            <div className="admin-admin-info">
              <div className="admin-avatar admin-avatar--sm">A</div>
              <div>
                <div className="admin-admin-name">{adminName}</div>
                <div className="admin-admin-role">Super Admin</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-header-title">
              {TABS.find(t => t.key === activeTab)?.label || 'Dashboard'}
            </h1>
            <span className="admin-header-date">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="admin-header-right">
            {stats && (
              <div className="admin-header-quick">
                <span className="admin-qs">🍽️ {stats.todayDonations} today</span>
                <span className="admin-qs">⚡ {stats.activeDonations} active</span>
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
