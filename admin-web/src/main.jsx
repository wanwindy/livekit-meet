import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Activity,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  Link2Off,
  LogOut,
  MonitorSmartphone,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Server,
  Shield,
  Smartphone,
  Trash2,
  UserRoundCheck,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = 'fangxinban_admin_token';

const api = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || '请求失败');
    error.status = response.status;
    throw error;
  }

  return data;
};

const emptyAccountForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'host',
  status: 'active',
  maxDevices: 1,
};

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [loginForm, setLoginForm] = useState({username: '', password: ''});
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [devices, setDevices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [overviewDays, setOverviewDays] = useState(14);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [nodeForm, setNodeForm] = useState({
    region: 'hk',
    name: '',
    signalUrl: '',
    status: 'healthy',
    loadScore: '',
  });
  const [query, setQuery] = useState('');

  const isLoggedIn = Boolean(token);

  const clearSession = nextMessage => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setSelectedAccount(null);
    setDevices([]);
    setAccounts([]);
    setMeetings([]);
    setNodes([]);
    setAuditLogs([]);
    setOverview(null);
    setMessage(nextMessage || '');
  };

  const handleAppError = error => {
    if (error?.status === 401) {
      clearSession('登录已失效，请重新登录');
      return;
    }

    setMessage(error?.message || '请求失败');
  };

  const selectedAccountTitle = useMemo(() => {
    if (!selectedAccount) {
      return '选择账号查看设备';
    }
    return `${selectedAccount.displayName || selectedAccount.username} / ${selectedAccount.username}`;
  }, [selectedAccount]);

  const loadAll = async (days = overviewDays) => {
    const [accountData, meetingData, nodeData, auditData, overviewData] = await Promise.all([
      api(`/admin/accounts?q=${encodeURIComponent(query)}`),
      api('/admin/meetings'),
      api('/admin/nodes'),
      api('/admin/audit-logs'),
      api(`/admin/overview?days=${days}`),
    ]);
    setAccounts(accountData.items);
    setMeetings(meetingData.items);
    setNodes(nodeData.items);
    setAuditLogs(auditData.items);
    setOverview(overviewData);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadAll().catch(handleAppError);
    }
  }, [isLoggedIn]);

  const login = async event => {
    event.preventDefault();
    try {
      const data = await api('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    clearSession('');
  };

  const createAccount = async event => {
    event.preventDefault();
    await run(async () => {
      await api('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(accountForm),
      });
      setAccountForm(emptyAccountForm);
      await loadAll();
      return '账号已创建';
    });
  };

  const updateAccountStatus = async (account, status) => {
    await run(async () => {
      const path = status === 'active' ? 'enable' : 'disable';
      await api(`/admin/accounts/${account.id}/${path}`, {method: 'POST'});
      await loadAll();
      return status === 'active' ? '账号已启用' : '账号已停用';
    });
  };

  const deleteAccount = async account => {
    await run(async () => {
      await api(`/admin/accounts/${account.id}`, {method: 'DELETE'});
      if (selectedAccount?.id === account.id) {
        setSelectedAccount(null);
        setDevices([]);
      }
      await loadAll();
      return '账号已删除';
    });
  };

  const resetPassword = async account => {
    const password = window.prompt(`为 ${account.username} 设置新密码，至少 8 位`);
    if (!password) {
      return;
    }

    await run(async () => {
      await api(`/admin/accounts/${account.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({password}),
      });
      return '密码已重置';
    });
  };

  const selectAccount = async account => {
    setSelectedAccount(account);
    await run(async () => {
      const data = await api(`/admin/accounts/${account.id}/devices`);
      setDevices(data.items);
      return '';
    });
  };

  const updateDevice = async (device, action) => {
    await run(async () => {
      await api(`/admin/devices/${device.id}/${action}`, {method: 'POST'});
      if (selectedAccount) {
        const data = await api(`/admin/accounts/${selectedAccount.id}/devices`);
        setDevices(data.items);
      }
      return '设备状态已更新';
    });
  };

  const createNode = async event => {
    event.preventDefault();
    await run(async () => {
      await api('/admin/nodes', {
        method: 'POST',
        body: JSON.stringify({
          ...nodeForm,
          loadScore: nodeForm.loadScore === '' ? null : Number(nodeForm.loadScore),
        }),
      });
      setNodeForm({region: 'hk', name: '', signalUrl: '', status: 'healthy', loadScore: ''});
      await loadAll();
      return '节点已保存';
    });
  };

  const updateNodeStatus = async (node, status) => {
    await run(async () => {
      await api(`/admin/nodes/${node.id}`, {
        method: 'PATCH',
        body: JSON.stringify({status, loadScore: node.loadScore}),
      });
      await loadAll();
      return '节点状态已更新';
    });
  };

  const updateOverviewDays = days => {
    setOverviewDays(days);
    loadAll(days).catch(handleAppError);
  };

  const run = async action => {
    try {
      const result = await action();
      setMessage(result);
    } catch (error) {
      handleAppError(error);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="login-screen">
        <form className="login-panel" onSubmit={login}>
          <div className="brand-row">
            <Shield size={32} />
            <div>
              <h1>安心办会议管理后台</h1>
              <p>账号、设备与 LiveKit 节点控制</p>
            </div>
          </div>
          {message && <div className="notice error">{message}</div>}
          <label>
            账号
            <input
              value={loginForm.username}
              onChange={event => setLoginForm({...loginForm, username: event.target.value})}
              autoComplete="username"
            />
          </label>
          <label>
            密码
            <input
              value={loginForm.password}
              onChange={event => setLoginForm({...loginForm, password: event.target.value})}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <button className="primary-action" type="submit">
            <KeyRound size={18} />
            登录
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Shield size={28} />
          <span>安心办会议</span>
        </div>
        <nav>
          <a href="#overview"><Activity size={18} />监控</a>
          <a href="#accounts"><Users size={18} />账号</a>
          <a href="#devices"><Smartphone size={18} />设备</a>
          <a href="#meetings"><Video size={18} />会议</a>
          <a href="#nodes"><Server size={18} />节点</a>
          <a href="#audit-logs"><Clock3 size={18} />日志</a>
        </nav>
        <button className="ghost-action" onClick={logout}>
          <LogOut size={18} />
          退出
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>管理控制台</h1>
            <p>香港优先，Singapore 备用，设备绑定受控</p>
          </div>
          <button className="secondary-action" onClick={() => loadAll().catch(handleAppError)}>
            <RefreshCw size={17} />
            刷新
          </button>
        </header>

        {message && <div className="notice">{message}</div>}

        <section className="band monitoring-band" id="overview">
          <div className="section-heading">
            <div>
              <h2>运营监控</h2>
              <p>账号、会议、节点和敏感操作的实时汇总</p>
            </div>
            <div className="monitoring-actions" aria-label="监控周期">
              {[7, 14, 30].map(days => (
                <button
                  className={overviewDays === days ? 'period-action active' : 'period-action'}
                  key={days}
                  onClick={() => updateOverviewDays(days)}
                  type="button"
                >
                  {days} 天
                </button>
              ))}
            </div>
          </div>
          {overview ? <MonitoringOverview overview={overview} /> : <div className="monitoring-loading">正在加载运营数据</div>}
        </section>

        <section className="band" id="accounts">
          <div className="section-heading">
            <div>
              <h2>账号管理</h2>
              <p>创建主持人，停用账号，重置密码</p>
            </div>
            <div className="search-box">
              <Search size={17} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索账号" />
              <button onClick={() => loadAll().catch(handleAppError)}>查询</button>
            </div>
          </div>

          <div className="two-column">
            <form className="tool-panel" onSubmit={createAccount}>
              <h3>新建账号</h3>
              <input placeholder="账号" value={accountForm.username} onChange={event => setAccountForm({...accountForm, username: event.target.value})} />
              <input placeholder="显示名称" value={accountForm.displayName} onChange={event => setAccountForm({...accountForm, displayName: event.target.value})} />
              <input placeholder="初始密码" type="password" value={accountForm.password} onChange={event => setAccountForm({...accountForm, password: event.target.value})} />
              <div className="inline-fields">
                <select value={accountForm.role} onChange={event => setAccountForm({...accountForm, role: event.target.value})}>
                  <option value="host">主持人</option>
                  <option value="admin">管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
                <input type="number" min="1" max="10" value={accountForm.maxDevices} onChange={event => setAccountForm({...accountForm, maxDevices: Number(event.target.value)})} />
              </div>
              <button className="primary-action" type="submit">
                <Plus size={17} />
                创建
              </button>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>账号</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>设备数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => (
                    <tr key={account.id}>
                      <td>
                        <button className="link-cell" onClick={() => selectAccount(account)}>
                          {account.displayName || account.username}
                          <span>{account.username}</span>
                        </button>
                      </td>
                      <td>{roleLabel(account.role)}</td>
                      <td><StatusBadge status={account.status} /></td>
                      <td>{account.maxDevices}</td>
                      <td>
                        <div className="row-actions">
                          <IconButton title="重置密码" onClick={() => resetPassword(account)} icon={<KeyRound size={16} />} />
                          {account.status === 'active' ? (
                            <IconButton title="停用" onClick={() => updateAccountStatus(account, 'disabled')} icon={<Ban size={16} />} />
                          ) : (
                            <IconButton title="启用" onClick={() => updateAccountStatus(account, 'active')} icon={<CheckCircle2 size={16} />} />
                          )}
                          <IconButton title="删除" onClick={() => deleteAccount(account)} icon={<Trash2 size={16} />} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="band" id="devices">
          <div className="section-heading">
            <div>
              <h2>设备绑定</h2>
              <p>{selectedAccountTitle}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>设备</th>
                  <th>平台</th>
                  <th>版本</th>
                  <th>状态</th>
                  <th>最近活跃</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id}>
                    <td>
                      {device.deviceName || '未命名设备'}
                      <span className="muted-line">{device.deviceUid}</span>
                    </td>
                    <td>{device.platform}</td>
                    <td>{device.appVersion || '-'}</td>
                    <td><StatusBadge status={device.status} /></td>
                    <td>{formatDate(device.lastSeenAt)}</td>
                    <td>
                      <div className="row-actions">
                        <IconButton title="解绑" onClick={() => updateDevice(device, 'unbind')} icon={<Link2Off size={16} />} />
                        <IconButton title="禁用" onClick={() => updateDevice(device, 'block')} icon={<Ban size={16} />} danger />
                        <IconButton title="恢复" onClick={() => updateDevice(device, 'unblock')} icon={<CheckCircle2 size={16} />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="band" id="nodes">
          <div className="section-heading">
            <div>
              <h2>LiveKit 节点</h2>
              <p>控制新会议的区域选择与故障切换</p>
            </div>
          </div>
          <div className="two-column">
            <form className="tool-panel" onSubmit={createNode}>
              <h3>登记节点</h3>
              <div className="inline-fields">
                <select value={nodeForm.region} onChange={event => setNodeForm({...nodeForm, region: event.target.value})}>
                  <option value="hk">香港</option>
                  <option value="sg">新加坡</option>
                  <option value="cn">内地</option>
                </select>
                <select value={nodeForm.status} onChange={event => setNodeForm({...nodeForm, status: event.target.value})}>
                  <option value="healthy">健康</option>
                  <option value="degraded">降级</option>
                  <option value="offline">离线</option>
                  <option value="draining">排空</option>
                </select>
              </div>
              <input placeholder="节点名称" value={nodeForm.name} onChange={event => setNodeForm({...nodeForm, name: event.target.value})} />
              <input placeholder="wss://hk.livekit.fangxinbanmeet.com" value={nodeForm.signalUrl} onChange={event => setNodeForm({...nodeForm, signalUrl: event.target.value})} />
              <input placeholder="负载 0-1，可留空" value={nodeForm.loadScore} onChange={event => setNodeForm({...nodeForm, loadScore: event.target.value})} />
              <button className="primary-action" type="submit">
                <Save size={17} />
                保存
              </button>
            </form>
            <div className="node-grid">
              {nodes.map(node => (
                <article className="node-card" key={node.id}>
                  <div className="node-title">
                    <Server size={20} />
                    <strong>{node.name}</strong>
                    <StatusBadge status={node.status} />
                  </div>
                  <p>{node.signalUrl}</p>
                  <dl>
                    <dt>区域</dt><dd>{regionLabel(node.region)}</dd>
                    <dt>负载</dt><dd>{node.loadScore ?? '-'}</dd>
                    <dt>更新</dt><dd>{formatDate(node.updatedAt)}</dd>
                  </dl>
                  <div className="row-actions">
                    <IconButton title="健康" onClick={() => updateNodeStatus(node, 'healthy')} icon={<CheckCircle2 size={16} />} />
                    <IconButton title="降级" onClick={() => updateNodeStatus(node, 'degraded')} icon={<XCircle size={16} />} />
                    <IconButton title="排空" onClick={() => updateNodeStatus(node, 'draining')} icon={<Ban size={16} />} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="meetings">
          <div className="section-heading">
            <div>
              <h2>最近会议</h2>
              <p>会议状态与参会使用情况</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="meeting-table">
              <thead>
                <tr>
                  <th>会议号</th>
                  <th>主持人</th>
                  <th>区域</th>
                  <th>状态</th>
                  <th>参会次数</th>
                  <th>最近参会</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {meetings.slice(0, 50).map(meeting => (
                  <tr key={meeting.id}>
                    <td>
                      <strong>{meeting.meetingNumber}</strong>
                      <span className="muted-line">{meeting.roomName}</span>
                    </td>
                    <td>{meeting.hostDisplayName || meeting.hostUsername}</td>
                    <td>{regionLabel(meeting.preferredRegion)}</td>
                    <td><StatusBadge status={meeting.status} /></td>
                    <td>{meeting.participantJoinCount}</td>
                    <td>{formatDate(meeting.lastParticipantJoinedAt)}</td>
                    <td>{formatDate(meeting.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="band" id="audit-logs">
          <div className="section-heading">
            <div>
              <h2>审计日志</h2>
              <p>后台操作和会议参会事件</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>事件</th>
                  <th>操作账号</th>
                  <th>对象</th>
                  <th>来源 IP</th>
                  <th>详情</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 50).map(log => (
                  <tr key={log.id}>
                    <td><strong>{activityLabel(log.action)}</strong></td>
                    <td>{log.actorUsername || '参会人'}</td>
                    <td>{formatAuditTarget(log)}</td>
                    <td>{log.ipAddress || '-'}</td>
                    <td>{formatAuditDetail(log.detail)}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function IconButton({title, icon, onClick, danger = false}) {
  return (
    <button className={`icon-button ${danger ? 'danger' : ''}`} title={title} onClick={onClick}>
      {icon}
    </button>
  );
}

function StatusBadge({status}) {
  return <span className={`status status-${status}`}>{statusLabel(status)}</span>;
}

function MonitoringOverview({overview}) {
  const trendMaximum = Math.max(...overview.meetingTrend.map(item => item.meetingCount), 1);
  const trendLabelInterval = Math.ceil(overview.meetingTrend.length / 7);
  const latestActivity = overview.recentActivity.slice(0, 8);

  return (
    <>
      <div className="metric-grid">
        <MetricCard
          icon={<UserRoundCheck size={19} />}
          label="活跃账号"
          value={overview.accounts.active}
          detail={`共 ${overview.accounts.total} 个账号，主持人 ${overview.accounts.hosts} 个`}
        />
        <MetricCard
          icon={<MonitorSmartphone size={19} />}
          label="近 24 小时活跃设备"
          value={overview.devices.activeLast24Hours}
          detail={`已绑定 ${overview.devices.bound} 台，已禁用 ${overview.devices.blocked} 台`}
        />
        <MetricCard
          icon={<Video size={19} />}
          label="今日创建会议"
          value={overview.meetings.createdToday}
          detail={`近 7 天 ${overview.meetings.createdLast7Days} 场，进行中 ${overview.meetings.active} 场`}
        />
        <MetricCard
          icon={<Radio size={19} />}
          label="累计参会次数"
          value={overview.meetings.participantJoins}
          detail={`今日 ${overview.meetings.participantJoinsToday} 次，近 7 天 ${overview.meetings.participantJoinsLast7Days} 次`}
        />
      </div>

      <div className="monitoring-columns">
        <section className="evidence-panel meeting-trend-panel">
          <div className="panel-heading">
            <div>
              <h3>会议创建趋势</h3>
              <p>按创建日期统计</p>
            </div>
            <span>{overview.meetings.total} 场累计</span>
          </div>
          <div
            className="meeting-chart"
            aria-label={`近 ${overview.periodDays} 天会议创建趋势`}
            style={{gridTemplateColumns: `repeat(${overview.meetingTrend.length}, minmax(0, 1fr))`}}
          >
            {overview.meetingTrend.map((point, index) => (
              <div className="chart-column" key={point.date}>
                <span className="chart-value">{point.meetingCount || ''}</span>
                <div className="chart-track">
                  <div
                    className="chart-bar"
                    style={{height: `${Math.max(6, Math.round((point.meetingCount / trendMaximum) * 100))}%`}}
                    title={`${point.date} ${point.meetingCount} 场`}
                  />
                </div>
                <span className="chart-label">
                  {index % trendLabelInterval === 0 ? formatShortDate(point.date) : ''}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="evidence-panel node-summary-panel">
          <div className="panel-heading">
            <div>
              <h3>节点状态</h3>
              <p>控制面登记的 LiveKit 节点</p>
            </div>
            <Server size={18} />
          </div>
          <dl className="node-summary-list">
            <div><dt>健康</dt><dd className="success-number">{overview.nodes.healthy}</dd></div>
            <div><dt>降级</dt><dd className="attention-number">{overview.nodes.degraded}</dd></div>
            <div><dt>离线</dt><dd className="danger-number">{overview.nodes.offline}</dd></div>
            <div><dt>排空</dt><dd>{overview.nodes.draining}</dd></div>
          </dl>
          <div className="node-summary-note">
            <Clock3 size={16} />
            <span>待入会 {overview.meetings.waiting} 场</span>
          </div>
        </section>
      </div>

      <div className="monitoring-columns monitoring-detail-columns">
        <section className="evidence-panel usage-panel">
          <div className="panel-heading">
            <div>
              <h3>账号使用情况</h3>
              <p>按累计创建会议数排序</p>
            </div>
          </div>
          <div className="table-wrap monitor-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>账号</th>
                  <th>会议</th>
                  <th>参会</th>
                  <th>绑定设备</th>
                  <th>最近创建</th>
                </tr>
              </thead>
              <tbody>
                {overview.accountUsage.map(account => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.displayName || account.username}</strong>
                      <span className="muted-line">{account.username}</span>
                    </td>
                    <td>{account.meetingCount}</td>
                    <td>{account.participantJoinCount}</td>
                    <td>{account.boundDeviceCount}</td>
                    <td>{formatDate(account.lastMeetingAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="evidence-panel activity-panel">
          <div className="panel-heading">
            <div>
              <h3>最新操作日志</h3>
              <p>最近的后台与会议操作</p>
            </div>
          </div>
          <ol className="activity-list">
            {latestActivity.map(log => (
              <li key={log.id}>
                <span className="activity-marker" />
                <div>
                  <strong>{activityLabel(log.action)}</strong>
                  <span>{log.actorDisplayName || log.actorUsername || '系统'} · {log.targetType}:{log.targetId}</span>
                </div>
                <time>{formatDate(log.createdAt)}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

function MetricCard({icon, label, value, detail}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

const statusLabel = status =>
  ({
    active: '启用',
    disabled: '停用',
    locked: '锁定',
    bound: '已绑定',
    unbound: '已解绑',
    blocked: '已禁用',
    healthy: '健康',
    degraded: '降级',
    offline: '离线',
    draining: '排空',
    created: '已创建',
    ended: '已结束',
    expired: '已过期',
  })[status] || status;

const roleLabel = role =>
  ({super_admin: '超级管理员', admin: '管理员', host: '主持人'})[role] || role;

const regionLabel = region => ({hk: '香港', sg: '新加坡', cn: '内地'})[region] || region;

const activityLabel = action =>
  ({
    'admin.login': '后台登录',
    'admin.logout': '后台退出',
    'account.create': '创建账号',
    'account.update': '更新账号',
    'account.reset_password': '重置密码',
    'account.active': '启用账号',
    'account.disabled': '停用账号',
    'account.delete': '删除账号',
    'device.bind': '绑定设备',
    'device.bound': '恢复设备',
    'device.unbound': '解绑设备',
    'device.blocked': '禁用设备',
    'mobile.login': '主持人登录',
    'meeting.create': '创建会议',
    'meeting.join': '加入会议',
    'node.create': '登记节点',
    'node.update': '更新节点',
  })[action] || action;

const formatAuditTarget = log => {
  const targetLabel =
    {account: '账号', device: '设备', meeting: '会议', livekit_node: '节点'}[log.targetType] ||
    log.targetType;
  return log.targetId ? `${targetLabel} ${log.targetId}` : targetLabel;
};

const formatAuditDetail = detail => {
  if (!detail) {
    return '-';
  }

  try {
    const value = typeof detail === 'string' ? JSON.parse(detail) : detail;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return '-';
    }

    const items = [];
    if (value.region) {
      items.push(regionLabel(value.region));
    }
    if (value.username) {
      items.push(value.username);
    }
    if (value.role) {
      items.push(value.role === 'participant' ? '参会人' : roleLabel(value.role));
    }
    return items.join(' · ') || '-';
  } catch {
    return '-';
  }
};

const formatDate = value => (value ? new Date(value).toLocaleString('zh-CN') : '-');

const formatShortDate = value => {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

createRoot(document.getElementById('root')).render(<App />);
