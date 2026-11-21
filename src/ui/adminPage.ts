export function renderAdminPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ticket-server | 예매 서버 관리자</title>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --primary-soft: #eef2ff;
      --danger: #dc2626;
      --danger-soft: #fef2f2;
      --success: #16a34a;
      --success-soft: #f0fdf4;
      --radius: 10px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    .hidden { display: none !important; }

    /* Login */
    .login-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    .login-card h1 { font-size: 20px; margin-bottom: 6px; }
    .login-card p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }

    /* App Shell */
    .layout {
      display: grid;
      grid-template-columns: 270px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      background: #0f172a;
      color: #f8fafc;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
    }
    .brand h2 { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
    .brand a { font-size: 12px; color: #94a3b8; text-decoration: none; }
    .brand a:hover { color: #fff; }
    .tenant-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tenant-item {
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      color: #cbd5e1;
      padding: 10px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: background 0.15s;
    }
    .tenant-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .tenant-item.active { background: var(--primary); color: #fff; }
    .tenant-item .row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
    .tenant-item .slug { font-size: 11px; opacity: 0.75; padding-left: 16px; }
    .dot { width: 8px; height: 8px; border-radius: 99px; background: #22c55e; flex-shrink: 0; }
    .dot.off { background: #64748b; }

    .main {
      padding: 28px 32px;
      max-width: 1280px;
      width: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header .sub { font-size: 13px; color: var(--muted); margin-top: 2px; }

    /* Controls */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s;
    }
    .btn:hover { background: #f1f5f9; }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-danger { background: var(--danger-soft); border-color: #fecaca; color: var(--danger); }
    .btn-danger:hover { background: #fee2e2; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .btn-dark { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); color: #fff; }
    .btn-dark:hover { background: rgba(255,255,255,0.18); }

    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field label { font-size: 12px; font-weight: 600; color: #334155; }
    .input {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
      font-size: 14px;
      outline: none;
    }
    .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12); }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .tab {
      background: none;
      border: none;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

    /* Cards & Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card, .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
    }
    .stat-card .label { font-size: 12px; color: var(--muted); font-weight: 600; }
    .stat-card .value { font-size: 26px; font-weight: 700; margin-top: 4px; }
    .card { margin-bottom: 16px; }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    /* Event / Schedule / TicketType */
    .schedule-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      margin-top: 10px;
      background: #f8fafc;
    }
    .tt-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-top: 8px;
      font-size: 13px;
    }
    .bar-wrap { width: 120px; height: 6px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
    .bar { height: 100%; background: var(--primary); }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
    th { font-size: 12px; color: var(--muted); font-weight: 600; background: #f8fafc; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-green { background: var(--success-soft); color: var(--success); }
    .badge-indigo { background: var(--primary-soft); color: var(--primary); }
    .badge-red { background: var(--danger-soft); color: var(--danger); }
    .badge-gray { background: #f1f5f9; color: var(--muted); }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 100;
    }
    .modal {
      width: 100%;
      max-width: 480px;
      background: #fff;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
    }
    .modal h3 { font-size: 17px; margin-bottom: 16px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }

    /* Banner & Code */
    .key-banner {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .code-box {
      background: #0f172a;
      color: #e2e8f0;
      padding: 14px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      overflow-x: auto;
      white-space: pre;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 200;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .filters { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .input { width: auto; min-width: 160px; }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr; }
      .main { padding: 20px; }
    }
  </style>
</head>
<body>
  <!-- Login View -->
  <div id="loginView" class="login-wrap">
    <div class="login-card">
      <h1>예매 서버 관리자</h1>
      <p>서버 환경변수 <code>PLATFORM_MASTER_KEY</code>를 입력해 접속하세요.</p>
      <form id="loginForm">
        <div class="field">
          <label for="masterKeyInput">Platform Master Key</label>
          <input id="masterKeyInput" type="password" class="input" placeholder="PLATFORM_MASTER_KEY 입력" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">접속하기</button>
      </form>
      <p id="loginError" style="color:var(--danger);margin-top:12px;margin-bottom:0;" class="hidden"></p>
    </div>
  </div>

  <!-- Dashboard View -->
  <div id="appView" class="layout hidden">
    <aside class="sidebar">
      <div class="brand">
        <h2>ticket-server</h2>
        <a href="/docs" target="_blank">API Docs ↗</a>
      </div>
      <button id="openNewTenantBtn" class="btn btn-primary" style="width:100%;">+ 새 예매 사이트 등록</button>
      <div id="tenantList" class="tenant-list"></div>
      <button id="logoutBtn" class="btn btn-dark" style="width:100%;">로그아웃</button>
    </aside>

    <main class="main">
      <div id="emptyState" class="card" style="text-align:center;padding:60px 20px;">
        <h3 style="margin-bottom:8px;">등록된 예매 사이트를 선택하거나 새로 추가하세요</h3>
        <p style="color:var(--muted);font-size:13px;">단일 Supabase 위에서 여러 예매 사이트의 행사, 수량, 예매자 명단, API Key를 한 번에 관리할 수 있습니다.</p>
      </div>

      <div id="tenantWorkspace" class="hidden">
        <div class="header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h1 id="tenantTitle">-</h1>
              <span id="tenantStatusBadge" class="badge badge-green">활성</span>
            </div>
            <div id="tenantMeta" class="sub"></div>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="toggleTenantActiveBtn" class="btn">상태 전환</button>
            <button id="refreshBtn" class="btn">새로고침</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="events">행사 &amp; 수량 관리</button>
          <button class="tab" data-tab="reservations">예매자 명단</button>
          <button class="tab" data-tab="keys">API Key &amp; 연동</button>
        </div>

        <!-- Tab 1: Events -->
        <section id="tab-events">
          <div class="stats">
            <div class="stat-card"><div class="label">등록된 행사</div><div id="statEvents" class="value">0</div></div>
            <div class="stat-card"><div class="label">누적 예매 건수</div><div id="statReservations" class="value">0</div></div>
            <div class="stat-card"><div class="label">누적 예매 매수</div><div id="statTickets" class="value">0</div></div>
          </div>
          <div class="card-head">
            <h3>행사 목록</h3>
            <button id="openNewEventBtn" class="btn btn-primary">+ 새 행사 등록</button>
          </div>
          <div id="eventsContainer"></div>
        </section>

        <!-- Tab 2: Reservations -->
        <section id="tab-reservations" class="hidden">
          <div class="card">
            <div class="card-head">
              <h3>예매자 명단</h3>
              <button id="exportCsvBtn" class="btn">CSV 다운로드</button>
            </div>
            <div class="filters">
              <select id="filterSchedule" class="input"><option value="">전체 회차</option></select>
              <input id="filterName" class="input" placeholder="이름 검색" />
              <input id="filterPhone" class="input" placeholder="연락처 검색" />
              <button id="searchReservationsBtn" class="btn btn-primary">조회</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>예매번호</th>
                    <th>행사 / 회차</th>
                    <th>예매자</th>
                    <th>연락처</th>
                    <th>선택 권종</th>
                    <th>총 수량</th>
                    <th>예매 일시</th>
                  </tr>
                </thead>
                <tbody id="reservationsTbody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Tab 3: API Keys & Integration -->
        <section id="tab-keys" class="hidden">
          <div id="newKeyBanner" class="key-banner hidden">
            <strong>새 API Key가 발급되었습니다!</strong> 보안상 이 키는 지금 한 번만 표시됩니다. 안전하게 복사해 두세요.
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
              <code id="issuedKeyText" style="background:#fff;padding:6px 10px;border-radius:6px;flex:1;word-break:break-all;"></code>
              <button id="copyIssuedKeyBtn" class="btn btn-primary btn-sm">복사</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>API Key 목록</h3>
              <div style="display:flex;gap:8px;">
                <button id="issuePublicKeyBtn" class="btn btn-primary btn-sm">+ Public Key 발급 (프론트엔드용)</button>
                <button id="issueAdminKeyBtn" class="btn btn-sm">+ Admin Key 발급 (서버용)</button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>권한</th>
                    <th>Prefix</th>
                    <th>최근 사용</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody id="keysTbody"></tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>허용 도메인 (CORS Allowed Origins)</h3></div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:10px;">
              비워두면 모든 도메인을 허용합니다. 쉼표(,)로 구분해 입력하세요. 예: <code>https://site-a.com, http://localhost:5173</code>
            </p>
            <div style="display:flex;gap:8px;">
              <input id="originsInput" class="input" placeholder="https://example.com, http://localhost:5173" />
              <button id="saveOriginsBtn" class="btn btn-primary" style="white-space:nowrap;">저장</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>예매 사이트 연동 코드 예제</h3></div>
            <div id="sdkSnippet" class="code-box"></div>
          </div>
        </section>
      </div>
    </main>
  </div>

  <!-- Reusable Modal -->
  <div id="modalBackdrop" class="modal-backdrop hidden">
    <div class="modal">
      <h3 id="modalTitle"></h3>
      <form id="modalForm">
        <div id="modalBody"></div>
        <div class="modal-actions">
          <button type="button" id="modalCancelBtn" class="btn">취소</button>
          <button type="submit" class="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toast" class="toast hidden"></div>

  <script>
    const state = {
      masterKey: sessionStorage.getItem('tp_master_key') || '',
      tenants: [],
      selectedTenantId: null,
      overview: null,
      reservations: [],
      apiKeys: [],
      activeTab: 'events',
      modalSubmit: null,
    };

    const $ = (id) => document.getElementById(id);

    function esc(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function fmtDate(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }

    function showToast(msg) {
      const el = $('toast');
      el.textContent = msg;
      el.classList.remove('hidden');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => el.classList.add('hidden'), 2600);
    }

    async function api(path, options = {}) {
      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.masterKey,
          ...(options.headers || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || '요청 처리 중 오류가 발생했습니다.');
      }
      return data;
    }

    function openModal(title, bodyHtml, onSubmit) {
      $('modalTitle').textContent = title;
      $('modalBody').innerHTML = bodyHtml;
      state.modalSubmit = onSubmit;
      $('modalBackdrop').classList.remove('hidden');
    }

    function closeModal() {
      $('modalBackdrop').classList.add('hidden');
      state.modalSubmit = null;
    }

    $('modalCancelBtn').addEventListener('click', closeModal);
    $('modalBackdrop').addEventListener('click', (e) => {
      if (e.target === $('modalBackdrop')) closeModal();
    });
    $('modalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.modalSubmit) return;
      try {
        await state.modalSubmit(new FormData(e.target));
        closeModal();
      } catch (err) {
        showToast(err.message);
      }
    });

    // Login / Logout
    async function tryConnect(key) {
      state.masterKey = key;
      const data = await api('/v1/platform/tenants');
      sessionStorage.setItem('tp_master_key', key);
      state.tenants = data.tenants;
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      renderTenantList();
      if (state.tenants.length > 0) {
        await selectTenant(state.selectedTenantId || state.tenants[0].id);
      } else {
        $('emptyState').classList.remove('hidden');
        $('tenantWorkspace').classList.add('hidden');
      }
    }

    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('loginError').classList.add('hidden');
      try {
        await tryConnect($('masterKeyInput').value.trim());
      } catch (err) {
        $('loginError').textContent = '인증 실패: PLATFORM_MASTER_KEY를 확인해 주세요.';
        $('loginError').classList.remove('hidden');
      }
    });

    $('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('tp_master_key');
      state.masterKey = '';
      state.selectedTenantId = null;
      $('appView').classList.add('hidden');
      $('loginView').classList.remove('hidden');
      $('masterKeyInput').value = '';
    });

    // Tenants
    function renderTenantList() {
      const container = $('tenantList');
      if (state.tenants.length === 0) {
        container.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:12px 8px;">등록된 사이트가 없습니다.</div>';
        return;
      }
      container.innerHTML = state.tenants.map((t) => \`
        <button class="tenant-item \${t.id === state.selectedTenantId ? 'active' : ''}" data-id="\${t.id}">
          <div class="row"><span class="dot \${t.isActive ? '' : 'off'}"></span><span>\${esc(t.name)}</span></div>
          <div class="slug">\${esc(t.slug)}</div>
        </button>
      \`).join('');
      container.querySelectorAll('.tenant-item').forEach((btn) => {
        btn.addEventListener('click', () => selectTenant(btn.dataset.id));
      });
    }

    async function selectTenant(tenantId) {
      state.selectedTenantId = tenantId;
      $('newKeyBanner').classList.add('hidden');
      renderTenantList();
      $('emptyState').classList.add('hidden');
      $('tenantWorkspace').classList.remove('hidden');
      await loadTenantData();
    }

    async function loadTenantData() {
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;

      $('tenantTitle').textContent = tenant.name;
      $('tenantMeta').textContent = 'Slug: ' + tenant.slug + ' · ID: ' + tenant.id;
      const badge = $('tenantStatusBadge');
      badge.textContent = tenant.isActive ? '활성' : '비활성';
      badge.className = 'badge ' + (tenant.isActive ? 'badge-green' : 'badge-gray');
      $('originsInput').value = (tenant.allowedOrigins || []).join(', ');
      $('sdkSnippet').textContent = \`import { createTicketingClient } from './sdk';

const ticketing = createTicketingClient({
  baseUrl: '\${window.location.origin}',
  apiKey: 'pk_live_여기에_발급받은_키_입력',
});

// 행사 목록 조회
const { events } = await ticketing.events.list();

// 비회원 예매 생성 (이름 + 연락처)
const result = await ticketing.reservations.create({
  scheduleId: '회차_ID',
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
  items: [{ ticketTypeId: '권종_ID', quantity: 2 }],
});\`;

      const [overview, keysData, resData] = await Promise.all([
        api('/v1/platform/tenants/' + tenant.id + '/overview'),
        api('/v1/platform/tenants/' + tenant.id + '/api-keys'),
        api('/v1/platform/tenants/' + tenant.id + '/reservations'),
      ]);

      state.overview = overview;
      state.apiKeys = keysData.apiKeys;
      state.reservations = resData.reservations;

      renderEvents();
      renderScheduleFilter();
      renderReservations();
      renderApiKeys();
    }

    // Events Tab
    function renderEvents() {
      const { stats, events } = state.overview;
      $('statEvents').textContent = stats.eventCount;
      $('statReservations').textContent = stats.reservationCount;
      $('statTickets').textContent = stats.totalTicketsReserved;

      const wrap = $('eventsContainer');
      if (events.length === 0) {
        wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--muted);padding:36px;">등록된 행사가 없습니다. 상단의 "+ 새 행사 등록"을 눌러 시작하세요.</div>';
        return;
      }

      wrap.innerHTML = events.map((ev) => \`
        <div class="card">
          <div class="card-head">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <strong>\${esc(ev.title)}</strong>
                <span class="badge \${ev.isActive ? 'badge-green' : 'badge-gray'}">\${ev.isActive ? '노출 중' : '숨김'}</span>
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">\${esc(ev.venue || '장소 미지정')} · ID: \${ev.id}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm" data-action="toggle-event" data-id="\${ev.id}" data-active="\${ev.isActive}">\${ev.isActive ? '숨기기' : '노출하기'}</button>
              <button class="btn btn-primary btn-sm" data-action="add-schedule" data-id="\${ev.id}">+ 회차 추가</button>
            </div>
          </div>
          \${ev.schedules.length === 0
            ? '<div style="font-size:12px;color:var(--muted);">등록된 회차가 없습니다.</div>'
            : ev.schedules.map((sc) => \`
              <div class="schedule-box">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                  <div style="font-size:13px;font-weight:600;">
                    📅 \${fmtDate(sc.startsAt)} \${sc.endsAt ? '~ ' + fmtDate(sc.endsAt) : ''}
                    <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:6px;">ID: \${sc.id}</span>
                  </div>
                  <button class="btn btn-sm" data-action="add-tt" data-id="\${sc.id}">+ 수량 권종 추가</button>
                </div>
                \${sc.ticketTypes.length === 0
                  ? '<div style="font-size:12px;color:var(--muted);margin-top:8px;">권종을 추가하면 예매가 가능합니다.</div>'
                  : sc.ticketTypes.map((tt) => {
                      const reserved = tt.totalQuantity - tt.remainingQuantity;
                      const pct = tt.totalQuantity > 0 ? Math.round((reserved / tt.totalQuantity) * 100) : 0;
                      return \`
                        <div class="tt-row">
                          <div>
                            <strong>\${esc(tt.name)}</strong>
                            <span style="color:var(--muted);margin-left:8px;">\${tt.price.toLocaleString()}원</span>
                            \${tt.maxPerReservation ? '<span class="badge badge-indigo" style="margin-left:6px;">1회 최대 ' + tt.maxPerReservation + '매</span>' : ''}
                          </div>
                          <div style="display:flex;align-items:center;gap:12px;">
                            <div style="text-align:right;font-size:12px;">
                              <strong>잔여 \${tt.remainingQuantity}</strong> / 총 \${tt.totalQuantity}매 (\${pct}% 예매)
                              <div class="bar-wrap" style="margin-top:4px;"><div class="bar" style="width:\${pct}%"></div></div>
                            </div>
                            <button class="btn btn-sm" data-action="edit-tt" data-id="\${tt.id}" data-name="\${esc(tt.name)}" data-total="\${tt.totalQuantity}" data-price="\${tt.price}">수정</button>
                          </div>
                        </div>
                      \`;
                    }).join('')}
              </div>
            \`).join('')}
        </div>
      \`).join('');

      wrap.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          if (action === 'toggle-event') {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + id, {
              method: 'PATCH',
              body: JSON.stringify({ isActive: btn.dataset.active !== 'true' }),
            });
            showToast('행사 상태를 변경했습니다.');
            await loadTenantData();
          } else if (action === 'add-schedule') {
            openModal('새 회차 등록', \`
              <div class="field"><label>시작 일시 *</label><input name="startsAt" type="datetime-local" class="input" required /></div>
              <div class="field"><label>종료 일시 (선택)</label><input name="endsAt" type="datetime-local" class="input" /></div>
            \`, async (fd) => {
              const startsAt = new Date(fd.get('startsAt')).toISOString();
              const endsRaw = fd.get('endsAt');
              await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + id + '/schedules', {
                method: 'POST',
                body: JSON.stringify({ startsAt, endsAt: endsRaw ? new Date(endsRaw).toISOString() : null }),
              });
              showToast('회차가 등록되었습니다.');
              await loadTenantData();
            });
          } else if (action === 'add-tt') {
            openModal('수량제 티켓 권종 추가', \`
              <div class="field"><label>권종 이름 *</label><input name="name" class="input" placeholder="예: 일반석 / 학생석" required /></div>
              <div class="field"><label>총 수량 *</label><input name="totalQuantity" type="number" min="1" class="input" value="100" required /></div>
              <div class="field"><label>표시 가격 (원, 무료는 0)</label><input name="price" type="number" min="0" class="input" value="0" /></div>
              <div class="field"><label>1회 예매 최대 매수 (선택)</label><input name="maxPerReservation" type="number" min="1" class="input" placeholder="제한 없음" /></div>
            \`, async (fd) => {
              const maxRaw = fd.get('maxPerReservation');
              await api('/v1/platform/tenants/' + state.selectedTenantId + '/schedules/' + id + '/ticket-types', {
                method: 'POST',
                body: JSON.stringify({
                  name: fd.get('name'),
                  totalQuantity: Number(fd.get('totalQuantity')),
                  price: Number(fd.get('price') || 0),
                  maxPerReservation: maxRaw ? Number(maxRaw) : null,
                }),
              });
              showToast('티켓 권종이 추가되었습니다.');
              await loadTenantData();
            });
          } else if (action === 'edit-tt') {
            openModal('권종 수정', \`
              <div class="field"><label>권종 이름 *</label><input name="name" class="input" value="\${btn.dataset.name}" required /></div>
              <div class="field"><label>총 수량 *</label><input name="totalQuantity" type="number" min="0" class="input" value="\${btn.dataset.total}" required /></div>
              <div class="field"><label>표시 가격 (원)</label><input name="price" type="number" min="0" class="input" value="\${btn.dataset.price}" /></div>
            \`, async (fd) => {
              await api('/v1/platform/tenants/' + state.selectedTenantId + '/ticket-types/' + id, {
                method: 'PATCH',
                body: JSON.stringify({
                  name: fd.get('name'),
                  totalQuantity: Number(fd.get('totalQuantity')),
                  price: Number(fd.get('price') || 0),
                }),
              });
              showToast('권종이 수정되었습니다.');
              await loadTenantData();
            });
          }
        });
      });
    }

    // Reservations Tab
    function renderScheduleFilter() {
      const sel = $('filterSchedule');
      const current = sel.value;
      const options = ['<option value="">전체 회차</option>'];
      for (const ev of state.overview.events) {
        for (const sc of ev.schedules) {
          options.push(\`<option value="\${sc.id}">\${esc(ev.title)} (\${fmtDate(sc.startsAt)})</option>\`);
        }
      }
      sel.innerHTML = options.join('');
      sel.value = current;
    }

    function renderReservations() {
      const tbody = $('reservationsTbody');
      if (state.reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px;">조회된 예매 내역이 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.reservations.map((r) => \`
        <tr>
          <td><code>\${esc(r.reservationCode)}</code></td>
          <td><strong>\${esc(r.eventTitle)}</strong><div style="font-size:11px;color:var(--muted);">\${fmtDate(r.scheduleStartsAt)}</div></td>
          <td>\${esc(r.customerName)}</td>
          <td>\${esc(r.customerPhone)}</td>
          <td>\${r.items.map((i) => esc(i.ticketTypeName) + ' × ' + i.quantity).join(', ')}</td>
          <td><strong>\${r.totalQuantity}매</strong></td>
          <td style="font-size:12px;color:var(--muted);">\${fmtDate(r.createdAt)}</td>
        </tr>
      \`).join('');
    }

    $('searchReservationsBtn').addEventListener('click', async () => {
      const params = new URLSearchParams();
      if ($('filterSchedule').value) params.set('scheduleId', $('filterSchedule').value);
      if ($('filterName').value.trim()) params.set('customerName', $('filterName').value.trim());
      if ($('filterPhone').value.trim()) params.set('customerPhone', $('filterPhone').value.trim());
      const data = await api('/v1/platform/tenants/' + state.selectedTenantId + '/reservations?' + params.toString());
      state.reservations = data.reservations;
      renderReservations();
    });

    $('exportCsvBtn').addEventListener('click', () => {
      if (state.reservations.length === 0) return showToast('내보낼 예매 내역이 없습니다.');
      const header = ['예매번호', '행사명', '회차', '예매자', '연락처', '선택권종', '총수량', '예매일시'];
      const rows = state.reservations.map((r) => [
        r.reservationCode,
        r.eventTitle,
        fmtDate(r.scheduleStartsAt),
        r.customerName,
        r.customerPhone,
        r.items.map((i) => i.ticketTypeName + ' x ' + i.quantity).join(' / '),
        r.totalQuantity,
        fmtDate(r.createdAt),
      ]);
      const csv = '\\uFEFF' + [header, ...rows].map((cols) =>
        cols.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')
      ).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'reservations-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
    });

    // API Keys Tab
    function renderApiKeys() {
      const tbody = $('keysTbody');
      if (state.apiKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">발급된 API Key가 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.apiKeys.map((k) => \`
        <tr>
          <td><strong>\${esc(k.name)}</strong></td>
          <td><span class="badge \${k.scope === 'public' ? 'badge-indigo' : 'badge-gray'}">\${k.scope}</span></td>
          <td><code>\${esc(k.keyPrefix)}...</code></td>
          <td style="font-size:12px;color:var(--muted);">\${fmtDate(k.lastUsedAt)}</td>
          <td>\${k.revokedAt ? '<span class="badge badge-red">폐기됨</span>' : '<span class="badge badge-green">활성</span>'}</td>
          <td>\${k.revokedAt ? '-' : '<button class="btn btn-danger btn-sm" data-revoke="' + k.id + '">폐기</button>'}</td>
        </tr>
      \`).join('');
      tbody.querySelectorAll('button[data-revoke]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('이 API Key를 폐기하시겠습니까? 폐기된 키는 즉시 사용 불가합니다.')) return;
          await api('/v1/platform/tenants/' + state.selectedTenantId + '/api-keys/' + btn.dataset.revoke, { method: 'DELETE' });
          showToast('API Key가 폐기되었습니다.');
          await loadTenantData();
        });
      });
    }

    async function issueKey(scope) {
      openModal(scope === 'public' ? 'Public Key 발급 (프론트엔드용)' : 'Admin Key 발급 (서버/관리용)', \`
        <div class="field"><label>키 이름 *</label><input name="name" class="input" placeholder="예: 프로덕션 웹 프론트엔드" required /></div>
      \`, async (fd) => {
        const res = await api('/v1/platform/tenants/' + state.selectedTenantId + '/api-keys', {
          method: 'POST',
          body: JSON.stringify({ name: fd.get('name'), scope }),
        });
        $('issuedKeyText').textContent = res.apiKey;
        $('newKeyBanner').classList.remove('hidden');
        await loadTenantData();
        showToast('새 API Key가 발급되었습니다.');
      });
    }

    $('issuePublicKeyBtn').addEventListener('click', () => issueKey('public'));
    $('issueAdminKeyBtn').addEventListener('click', () => issueKey('admin'));
    $('copyIssuedKeyBtn').addEventListener('click', async () => {
      await navigator.clipboard.writeText($('issuedKeyText').textContent);
      showToast('클립보드에 복사되었습니다.');
    });

    $('saveOriginsBtn').addEventListener('click', async () => {
      const origins = $('originsInput').value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await api('/v1/platform/tenants/' + state.selectedTenantId, {
        method: 'PATCH',
        body: JSON.stringify({ allowedOrigins: origins }),
      });
      state.tenants = state.tenants.map((t) => (t.id === updated.id ? updated : t));
      showToast('허용 도메인이 저장되었습니다.');
    });

    // Header & Global buttons
    $('openNewTenantBtn').addEventListener('click', () => {
      openModal('새 예매 사이트 등록', \`
        <div class="field"><label>사이트 이름 *</label><input name="name" class="input" placeholder="예: 2026 봄 정기공연" required /></div>
        <div class="field"><label>Slug (영문 소문자, 숫자, 하이픈) *</label><input name="slug" class="input" placeholder="spring-concert-2026" pattern="[a-z0-9-]+" required /></div>
        <div class="field"><label>허용 도메인 (쉼표 구분, 선택)</label><input name="origins" class="input" placeholder="https://site.example.com, http://localhost:5173" /></div>
      \`, async (fd) => {
        const origins = String(fd.get('origins') || '').split(',').map((s) => s.trim()).filter(Boolean);
        const created = await api('/v1/platform/tenants', {
          method: 'POST',
          body: JSON.stringify({ name: fd.get('name'), slug: fd.get('slug'), allowedOrigins: origins }),
        });
        state.tenants.unshift(created);
        showToast('새 예매 사이트가 등록되었습니다.');
        await selectTenant(created.id);
      });
    });

    $('openNewEventBtn').addEventListener('click', () => {
      openModal('새 행사 등록', \`
        <div class="field"><label>행사명 *</label><input name="title" class="input" placeholder="예: 정기 연주회" required /></div>
        <div class="field"><label>장소 (선택)</label><input name="venue" class="input" placeholder="예: 예술의전당 콘서트홀" /></div>
        <div class="field"><label>설명 (선택)</label><textarea name="description" class="input" rows="3"></textarea></div>
      \`, async (fd) => {
        await api('/v1/platform/tenants/' + state.selectedTenantId + '/events', {
          method: 'POST',
          body: JSON.stringify({
            title: fd.get('title'),
            venue: fd.get('venue') || null,
            description: fd.get('description') || null,
          }),
        });
        showToast('행사가 등록되었습니다.');
        await loadTenantData();
      });
    });

    $('toggleTenantActiveBtn').addEventListener('click', async () => {
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;
      const updated = await api('/v1/platform/tenants/' + tenant.id, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      state.tenants = state.tenants.map((t) => (t.id === updated.id ? updated : t));
      renderTenantList();
      await loadTenantData();
      showToast('사이트 상태를 변경했습니다.');
    });

    $('refreshBtn').addEventListener('click', () => loadTenantData().then(() => showToast('새로고침 완료')));

    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTab = btn.dataset.tab;
        ['events', 'reservations', 'keys'].forEach((t) => {
          $('tab-' + t).classList.toggle('hidden', t !== state.activeTab);
        });
      });
    });

    // Auto-login if master key exists in sessionStorage
    if (state.masterKey) {
      tryConnect(state.masterKey).catch(() => {
        sessionStorage.removeItem('tp_master_key');
        state.masterKey = '';
      });
    }
  </script>
</body>
</html>`;
}
