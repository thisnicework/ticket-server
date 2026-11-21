export function renderAdminPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ticket-server | 예매 서버 관리자</title>
  <style>
    body { max-width: 1080px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
    .hidden { display: none; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    fieldset { margin: 12px 0; padding: 12px; }
    pre { overflow-x: auto; padding: 10px; border: 1px solid #999; }
    details { margin: 8px 0; }
    summary { cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <header>
    <h1>예매 서버 관리자 (ticket-server)</h1>
    <p>
      <a href="/docs" target="_blank">API 문서 (/docs)</a> |
      <a href="/health" target="_blank">서버 상태 (/health)</a>
      <span id="logoutWrap" class="hidden"> | <button id="logoutBtn" type="button">로그아웃</button></span>
    </p>
    <hr />
  </header>

  <!-- 로그인 -->
  <section id="loginView">
    <fieldset>
      <legend>관리자 로그인</legend>
      <form id="loginForm">
        <p>
          <label for="masterKeyInput">PLATFORM_MASTER_KEY:</label>
          <input id="masterKeyInput" type="password" size="40" required />
          <button type="submit">접속</button>
        </p>
      </form>
      <p id="loginError" class="hidden"></p>
    </fieldset>
  </section>

  <!-- 메인 관리 화면 -->
  <main id="appView" class="hidden">
    <p id="statusMsg"></p>

    <!-- 1. 사이트(Tenant) 선택 & 등록 -->
    <fieldset>
      <legend>1. 예매 사이트(Tenant) 선택</legend>
      <p>
        <label for="tenantSelect">사이트 선택:</label>
        <select id="tenantSelect"></select>
        <button id="refreshBtn" type="button">새로고침</button>
        <button id="toggleTenantActiveBtn" type="button">활성/비활성 전환</button>
      </p>
      <p id="tenantMeta"></p>

      <details>
        <summary>+ 새 예매 사이트 등록</summary>
        <form id="newTenantForm">
          <p>
            <label>사이트 이름: <input name="name" required placeholder="2026 봄 정기공연" /></label>
            <label>Slug(영문소문자/숫자/-): <input name="slug" required pattern="[a-z0-9-]+" placeholder="spring-2026" /></label>
          </p>
          <p>
            <label>허용 도메인(쉼표 구분, 선택): <input name="origins" size="50" placeholder="https://site.com, http://localhost:5173" /></label>
            <button type="submit">사이트 등록</button>
          </p>
        </form>
      </details>
    </fieldset>

    <div id="emptyState" class="hidden">
      <p>등록된 예매 사이트가 없습니다. 위에서 "+ 새 예매 사이트 등록"을 열어 첫 사이트를 만들어 주세요.</p>
    </div>

    <div id="tenantWorkspace" class="hidden">
      <nav>
        <button type="button" class="tabBtn" data-tab="events">[1] 행사 및 수량 관리</button>
        <button type="button" class="tabBtn" data-tab="reservations">[2] 예매자 명단</button>
        <button type="button" class="tabBtn" data-tab="keys">[3] API Key 및 연동</button>
      </nav>
      <hr />

      <!-- 탭 1: 행사 & 수량 -->
      <section id="tab-events">
        <p id="statsLine"></p>

        <details>
          <summary>+ 새 행사 등록</summary>
          <form id="newEventForm">
            <p>
              <label>행사명*: <input name="title" required size="30" /></label>
              <label>장소: <input name="venue" size="25" /></label>
            </p>
            <p>
              <label>설명:<br /><textarea name="description" rows="2" cols="60"></textarea></label>
            </p>
            <p><button type="submit">행사 등록</button></p>
          </form>
        </details>

        <div id="eventsContainer"></div>
      </section>

      <!-- 탭 2: 예매자 명단 -->
      <section id="tab-reservations" class="hidden">
        <h2>예매자 명단</h2>
        <p>
          <label>회차: <select id="filterSchedule"><option value="">전체 회차</option></select></label>
          <label>이름: <input id="filterName" size="12" /></label>
          <label>연락처: <input id="filterPhone" size="16" /></label>
          <button id="searchReservationsBtn" type="button">조회</button>
          <button id="exportCsvBtn" type="button">CSV 다운로드</button>
        </p>
        <table>
          <thead>
            <tr>
              <th>예매번호</th>
              <th>행사 / 회차</th>
              <th>이름</th>
              <th>연락처</th>
              <th>선택 권종</th>
              <th>총 수량</th>
              <th>예매 일시</th>
            </tr>
          </thead>
          <tbody id="reservationsTbody"></tbody>
        </table>
      </section>

      <!-- 탭 3: API Key & 연동 -->
      <section id="tab-keys" class="hidden">
        <h2>API Key 관리</h2>

        <fieldset id="newKeyBanner" class="hidden">
          <legend>새 API Key 발급 완료 (1회만 표시)</legend>
          <p>
            <code id="issuedKeyText"></code>
            <button id="copyIssuedKeyBtn" type="button">복사</button>
          </p>
        </fieldset>

        <form id="issueKeyForm">
          <p>
            <label>키 이름*: <input name="name" required placeholder="웹 프론트엔드" /></label>
            <label>권한:
              <select name="scope">
                <option value="public">public (예매 사이트 프론트엔드용, pk_live_)</option>
                <option value="admin">admin (관리/서버용, sk_live_)</option>
              </select>
            </label>
            <button type="submit">API Key 발급</button>
          </p>
        </form>

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

        <fieldset>
          <legend>허용 도메인 (CORS Allowed Origins)</legend>
          <p>비워두면 모든 도메인 허용. 여러 개는 쉼표(,)로 구분.</p>
          <p>
            <input id="originsInput" size="60" placeholder="https://example.com, http://localhost:5173" />
            <button id="saveOriginsBtn" type="button">저장</button>
          </p>
        </fieldset>

        <fieldset>
          <legend>연동 코드 예제 (SDK)</legend>
          <pre><code id="sdkSnippet"></code></pre>
        </fieldset>
      </section>
    </div>
  </main>

  <script>
    const state = {
      masterKey: sessionStorage.getItem('tp_master_key') || '',
      tenants: [],
      selectedTenantId: null,
      overview: null,
      reservations: [],
      apiKeys: [],
      activeTab: 'events',
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

    function notify(msg) {
      $('statusMsg').textContent = '[' + new Date().toLocaleTimeString('ko-KR') + '] ' + msg;
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
        throw new Error(data?.error?.message || '요청 실패 (HTTP ' + res.status + ')');
      }
      return data;
    }

    async function tryConnect(key) {
      state.masterKey = key;
      const data = await api('/v1/platform/tenants');
      sessionStorage.setItem('tp_master_key', key);
      state.tenants = data.tenants;
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      $('logoutWrap').classList.remove('hidden');
      renderTenantSelect();
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
        $('loginError').textContent = '인증 실패: ' + err.message;
        $('loginError').classList.remove('hidden');
      }
    });

    $('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('tp_master_key');
      state.masterKey = '';
      state.selectedTenantId = null;
      $('appView').classList.add('hidden');
      $('logoutWrap').classList.add('hidden');
      $('loginView').classList.remove('hidden');
      $('masterKeyInput').value = '';
    });

    function renderTenantSelect() {
      const sel = $('tenantSelect');
      if (state.tenants.length === 0) {
        sel.innerHTML = '<option value="">(없음)</option>';
        return;
      }
      sel.innerHTML = state.tenants.map((t) =>
        \`<option value="\${t.id}">\${esc(t.name)} (\${esc(t.slug)}) [\${t.isActive ? '활성' : '비활성'}]</option>\`
      ).join('');
      if (state.selectedTenantId) sel.value = state.selectedTenantId;
    }

    $('tenantSelect').addEventListener('change', (e) => {
      if (e.target.value) selectTenant(e.target.value);
    });

    async function selectTenant(tenantId) {
      state.selectedTenantId = tenantId;
      $('newKeyBanner').classList.add('hidden');
      renderTenantSelect();
      $('emptyState').classList.add('hidden');
      $('tenantWorkspace').classList.remove('hidden');
      await loadTenantData();
    }

    async function loadTenantData() {
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;

      $('tenantMeta').textContent =
        'ID: ' + tenant.id + ' | Slug: ' + tenant.slug + ' | 상태: ' + (tenant.isActive ? '활성' : '비활성');
      $('originsInput').value = (tenant.allowedOrigins || []).join(', ');
      $('sdkSnippet').textContent = \`import { createTicketingClient } from './sdk';

const ticketing = createTicketingClient({
  baseUrl: '\${window.location.origin}',
  apiKey: 'pk_live_여기에_발급받은_키_입력',
});

const { events } = await ticketing.events.list();

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

    function renderEvents() {
      const { stats, events } = state.overview;
      $('statsLine').innerHTML =
        '<strong>요약:</strong> 행사 ' + stats.eventCount + '개 | 누적 예매 ' + stats.reservationCount + '건 | 누적 매수 ' + stats.totalTicketsReserved + '매';

      const wrap = $('eventsContainer');
      if (events.length === 0) {
        wrap.innerHTML = '<p>등록된 행사가 없습니다.</p>';
        return;
      }

      wrap.innerHTML = events.map((ev) => \`
        <fieldset>
          <legend>\${esc(ev.title)} [\${ev.isActive ? '노출' : '숨김'}]</legend>
          <p>
            장소: \${esc(ev.venue || '-')} | ID: <code>\${ev.id}</code>
            <button type="button" data-action="toggle-event" data-id="\${ev.id}" data-active="\${ev.isActive}">
              \${ev.isActive ? '숨기기' : '노출하기'}
            </button>
          </p>

          <details>
            <summary>+ 회차 추가</summary>
            <form data-form="add-schedule" data-event-id="\${ev.id}">
              <p>
                <label>시작 일시*: <input name="startsAt" type="datetime-local" required /></label>
                <label>종료 일시: <input name="endsAt" type="datetime-local" /></label>
                <button type="submit">회차 등록</button>
              </p>
            </form>
          </details>

          \${ev.schedules.length === 0
            ? '<p>등록된 회차가 없습니다.</p>'
            : ev.schedules.map((sc) => \`
              <fieldset>
                <legend>회차: \${fmtDate(sc.startsAt)} \${sc.endsAt ? '~ ' + fmtDate(sc.endsAt) : ''}</legend>
                <p>Schedule ID: <code>\${sc.id}</code></p>

                <details>
                  <summary>+ 수량 권종 추가</summary>
                  <form data-form="add-tt" data-schedule-id="\${sc.id}">
                    <p>
                      <label>권종명*: <input name="name" required placeholder="일반석" size="14" /></label>
                      <label>총 수량*: <input name="totalQuantity" type="number" min="1" value="100" required style="width:70px;" /></label>
                      <label>가격: <input name="price" type="number" min="0" value="0" style="width:80px;" /></label>
                      <label>1회 최대: <input name="maxPerReservation" type="number" min="1" placeholder="무제한" style="width:70px;" /></label>
                      <button type="submit">권종 추가</button>
                    </p>
                  </form>
                </details>

                \${sc.ticketTypes.length === 0
                  ? '<p>등록된 권종이 없습니다.</p>'
                  : \`<table>
                      <thead>
                        <tr><th>권종명</th><th>가격</th><th>잔여 / 총 수량</th><th>1회 최대</th><th>수정</th></tr>
                      </thead>
                      <tbody>
                        \${sc.ticketTypes.map((tt) => {
                          const reserved = tt.totalQuantity - tt.remainingQuantity;
                          return \`<tr>
                            <td>\${esc(tt.name)}<br /><small><code>\${tt.id}</code></small></td>
                            <td>\${tt.price.toLocaleString()}원</td>
                            <td>
                              잔여 <strong>\${tt.remainingQuantity}</strong> / 총 \${tt.totalQuantity}매
                              <br /><progress value="\${reserved}" max="\${tt.totalQuantity}"></progress>
                            </td>
                            <td>\${tt.maxPerReservation ?? '제한 없음'}</td>
                            <td>
                              <button type="button" data-action="edit-tt" data-id="\${tt.id}" data-name="\${esc(tt.name)}" data-total="\${tt.totalQuantity}" data-price="\${tt.price}">수량/정보 수정</button>
                            </td>
                          </tr>\`;
                        }).join('')}
                      </tbody>
                    </table>\`}
              </fieldset>
            \`).join('')}
        </fieldset>
      \`).join('');

      wrap.querySelectorAll('button[data-action="toggle-event"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + btn.dataset.id, {
              method: 'PATCH',
              body: JSON.stringify({ isActive: btn.dataset.active !== 'true' }),
            });
            notify('행사 상태를 변경했습니다.');
            await loadTenantData();
          } catch (err) { notify(err.message); }
        });
      });

      wrap.querySelectorAll('form[data-form="add-schedule"]').forEach((form) => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const fd = new FormData(form);
            const endsRaw = fd.get('endsAt');
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + form.dataset.eventId + '/schedules', {
              method: 'POST',
              body: JSON.stringify({
                startsAt: new Date(fd.get('startsAt')).toISOString(),
                endsAt: endsRaw ? new Date(endsRaw).toISOString() : null,
              }),
            });
            notify('회차가 등록되었습니다.');
            await loadTenantData();
          } catch (err) { notify(err.message); }
        });
      });

      wrap.querySelectorAll('form[data-form="add-tt"]').forEach((form) => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const fd = new FormData(form);
            const maxRaw = fd.get('maxPerReservation');
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/schedules/' + form.dataset.scheduleId + '/ticket-types', {
              method: 'POST',
              body: JSON.stringify({
                name: fd.get('name'),
                totalQuantity: Number(fd.get('totalQuantity')),
                price: Number(fd.get('price') || 0),
                maxPerReservation: maxRaw ? Number(maxRaw) : null,
              }),
            });
            notify('권종이 추가되었습니다.');
            await loadTenantData();
          } catch (err) { notify(err.message); }
        });
      });

      wrap.querySelectorAll('button[data-action="edit-tt"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const name = prompt('권종 이름:', btn.dataset.name);
          if (name === null) return;
          const totalStr = prompt('총 수량 (기예매 수량 이상):', btn.dataset.total);
          if (totalStr === null) return;
          const priceStr = prompt('표시 가격(원):', btn.dataset.price);
          if (priceStr === null) return;
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/ticket-types/' + btn.dataset.id, {
              method: 'PATCH',
              body: JSON.stringify({
                name: name.trim(),
                totalQuantity: Number(totalStr),
                price: Number(priceStr || 0),
              }),
            });
            notify('권종이 수정되었습니다.');
            await loadTenantData();
          } catch (err) { notify(err.message); }
        });
      });
    }

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
        tbody.innerHTML = '<tr><td colspan="7">조회된 예매 내역이 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.reservations.map((r) => \`
        <tr>
          <td><code>\${esc(r.reservationCode)}</code></td>
          <td>\${esc(r.eventTitle)}<br /><small>\${fmtDate(r.scheduleStartsAt)}</small></td>
          <td>\${esc(r.customerName)}</td>
          <td>\${esc(r.customerPhone)}</td>
          <td>\${r.items.map((i) => esc(i.ticketTypeName) + ' x ' + i.quantity).join(', ')}</td>
          <td>\${r.totalQuantity}매</td>
          <td>\${fmtDate(r.createdAt)}</td>
        </tr>
      \`).join('');
    }

    $('searchReservationsBtn').addEventListener('click', async () => {
      try {
        const params = new URLSearchParams();
        if ($('filterSchedule').value) params.set('scheduleId', $('filterSchedule').value);
        if ($('filterName').value.trim()) params.set('customerName', $('filterName').value.trim());
        if ($('filterPhone').value.trim()) params.set('customerPhone', $('filterPhone').value.trim());
        const data = await api('/v1/platform/tenants/' + state.selectedTenantId + '/reservations?' + params.toString());
        state.reservations = data.reservations;
        renderReservations();
        notify('예매자 명단 ' + state.reservations.length + '건 조회됨');
      } catch (err) { notify(err.message); }
    });

    $('exportCsvBtn').addEventListener('click', () => {
      if (state.reservations.length === 0) return notify('내보낼 예매 내역이 없습니다.');
      const header = ['예매번호', '행사명', '회차', '이름', '연락처', '선택권종', '총수량', '예매일시'];
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

    function renderApiKeys() {
      const tbody = $('keysTbody');
      if (state.apiKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">발급된 API Key가 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.apiKeys.map((k) => \`
        <tr>
          <td>\${esc(k.name)}</td>
          <td>\${k.scope}</td>
          <td><code>\${esc(k.keyPrefix)}...</code></td>
          <td>\${fmtDate(k.lastUsedAt)}</td>
          <td>\${k.revokedAt ? '폐기됨' : '활성'}</td>
          <td>\${k.revokedAt ? '-' : '<button type="button" data-revoke="' + k.id + '">폐기</button>'}</td>
        </tr>
      \`).join('');
      tbody.querySelectorAll('button[data-revoke]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('이 API Key를 폐기하시겠습니까?')) return;
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/api-keys/' + btn.dataset.revoke, { method: 'DELETE' });
            notify('API Key를 폐기했습니다.');
            await loadTenantData();
          } catch (err) { notify(err.message); }
        });
      });
    }

    $('issueKeyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const res = await api('/v1/platform/tenants/' + state.selectedTenantId + '/api-keys', {
          method: 'POST',
          body: JSON.stringify({ name: fd.get('name'), scope: fd.get('scope') }),
        });
        $('issuedKeyText').textContent = res.apiKey;
        $('newKeyBanner').classList.remove('hidden');
        e.target.reset();
        await loadTenantData();
        notify('새 API Key가 발급되었습니다.');
      } catch (err) { notify(err.message); }
    });

    $('copyIssuedKeyBtn').addEventListener('click', async () => {
      await navigator.clipboard.writeText($('issuedKeyText').textContent);
      notify('API Key를 복사했습니다.');
    });

    $('saveOriginsBtn').addEventListener('click', async () => {
      try {
        const origins = $('originsInput').value.split(',').map((s) => s.trim()).filter(Boolean);
        const updated = await api('/v1/platform/tenants/' + state.selectedTenantId, {
          method: 'PATCH',
          body: JSON.stringify({ allowedOrigins: origins }),
        });
        state.tenants = state.tenants.map((t) => (t.id === updated.id ? updated : t));
        notify('허용 도메인을 저장했습니다.');
      } catch (err) { notify(err.message); }
    });

    $('newTenantForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const origins = String(fd.get('origins') || '').split(',').map((s) => s.trim()).filter(Boolean);
        const created = await api('/v1/platform/tenants', {
          method: 'POST',
          body: JSON.stringify({ name: fd.get('name'), slug: fd.get('slug'), allowedOrigins: origins }),
        });
        state.tenants.unshift(created);
        e.target.reset();
        notify('새 예매 사이트를 등록했습니다.');
        await selectTenant(created.id);
      } catch (err) { notify(err.message); }
    });

    $('newEventForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        await api('/v1/platform/tenants/' + state.selectedTenantId + '/events', {
          method: 'POST',
          body: JSON.stringify({
            title: fd.get('title'),
            venue: fd.get('venue') || null,
            description: fd.get('description') || null,
          }),
        });
        e.target.reset();
        notify('행사를 등록했습니다.');
        await loadTenantData();
      } catch (err) { notify(err.message); }
    });

    $('toggleTenantActiveBtn').addEventListener('click', async () => {
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;
      try {
        const updated = await api('/v1/platform/tenants/' + tenant.id, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !tenant.isActive }),
        });
        state.tenants = state.tenants.map((t) => (t.id === updated.id ? updated : t));
        renderTenantSelect();
        await loadTenantData();
        notify('사이트 상태를 변경했습니다.');
      } catch (err) { notify(err.message); }
    });

    $('refreshBtn').addEventListener('click', () => loadTenantData().then(() => notify('새로고침 완료')));

    document.querySelectorAll('.tabBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        ['events', 'reservations', 'keys'].forEach((t) => {
          $('tab-' + t).classList.toggle('hidden', t !== state.activeTab);
        });
      });
    });

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
