export function renderAdminPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>hyunjun-ticket-server</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --card: #ffffff;
      --sub-bg: #f8fafc;
      --border: #e2e8f0;
      --text: #1e293b;
      --muted: #64748b;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-soft: #eff6ff;
      --green: #15803d;
      --green-bg: #dcfce7;
      --amber: #b45309;
      --amber-bg: #fef3c7;
      --red: #b91c1c;
      --red-bg: #fee2e2;
      --radius: 10px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.55;
    }
    .container { max-width: 1040px; margin: 0 auto; padding: 24px 16px 64px; }
    .hidden { display: none !important; }

    /* Header */
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .topbar h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .topbar-links { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .topbar-links a { color: var(--muted); text-decoration: none; }
    .topbar-links a:hover { color: var(--primary); text-decoration: underline; }

    /* Cards & Layout */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .card-title h2, .card-title h3 { margin: 0; font-size: 16px; }
    .sub-text { color: var(--muted); font-size: 12.5px; }
    .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .between { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }

    /* Forms & Buttons */
    input, select, textarea {
      font: inherit;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #fff;
      color: var(--text);
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    button {
      font: inherit;
      cursor: pointer;
      padding: 7px 13px;
      border-radius: 7px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: var(--text);
      font-weight: 500;
      transition: background 0.12s, border-color 0.12s;
    }
    button:hover { background: #f1f5f9; }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-danger { color: var(--red); border-color: #fecaca; background: #fff; }
    .btn-danger:hover { background: var(--red-bg); }
    .btn-sm { padding: 4px 9px; font-size: 12px; }
    .btn-copy { padding: 2px 7px; font-size: 11px; color: var(--muted); border-color: var(--border); }
    .btn-copy:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 12px; font-weight: 600; color: #475569; }
    .field input, .field select, .field textarea { width: 100%; }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      flex-wrap: wrap;
    }
    .tab-btn {
      border: 1px solid transparent;
      background: transparent;
      color: var(--muted);
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
    }
    .tab-btn:hover { background: #e2e8f0; color: var(--text); }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
    }

    /* Stats */
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
    }
    .stat .label { font-size: 12px; color: var(--muted); }
    .stat .num { font-size: 22px; font-weight: 700; margin-top: 2px; }

    /* Badges & Code */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .badge-green { background: var(--green-bg); color: var(--green); }
    .badge-amber { background: var(--amber-bg); color: var(--amber); }
    .badge-red { background: var(--red-bg); color: var(--red); }
    .badge-gray { background: #e2e8f0; color: #475569; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12.5px;
      margin: 8px 0 0;
    }
    pre code { background: none; color: inherit; padding: 0; }

    /* Details */
    details {
      background: var(--sub-bg);
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
    }
    details summary { cursor: pointer; font-weight: 600; color: var(--primary); user-select: none; }

    /* Schedule & Tables */
    .schedule-item {
      background: var(--sub-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 10px;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; background: #fff; border-radius: 6px; overflow: hidden; }
    th, td { border-bottom: 1px solid var(--border); padding: 9px 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; color: var(--muted); font-size: 12px; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    progress { width: 110px; height: 8px; accent-color: var(--primary); }

    /* Alert & Banner */
    .banner {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
    }

    /* Native Dialog */
    dialog {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      width: min(440px, 92vw);
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
    }
    dialog::backdrop { background: rgba(15, 23, 42, 0.45); }
    dialog h3 { margin: 0 0 14px; font-size: 16px; }

    /* Toast */
    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      background: #0f172a;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      z-index: 999;
    }
    .toast.error { background: var(--red); }

    /* Login */
    .login-box { max-width: 420px; margin: 60px auto; }
    @media (max-width: 680px) {
      .stats { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="topbar">
      <div>
        <h1>hyunjun-ticket-server</h1>
      </div>
      <div class="topbar-links">
        <a href="/docs" target="_blank">API 문서</a>
        <span>·</span>
        <a href="/health" target="_blank">서버 상태</a>
        <button id="logoutBtn" type="button" class="btn-sm hidden">로그아웃</button>
      </div>
    </header>

    <!-- 로그인 -->
    <section id="loginView" class="card login-box">
      <h2 style="margin:0 0 6px;font-size:18px;">관리자 로그인</h2>
      <p class="sub-text" style="margin:0 0 16px;">Vercel 환경변수에 설정한 <code>PLATFORM_MASTER_KEY</code>를 입력해 주세요.</p>
      <form id="loginForm">
        <div class="field" style="margin-bottom:12px;">
          <label for="masterKeyInput">마스터 키</label>
          <input id="masterKeyInput" type="password" placeholder="PLATFORM_MASTER_KEY 입력" required autofocus />
        </div>
        <button type="submit" class="btn-primary" style="width:100%;">접속하기</button>
      </form>
      <p id="loginError" class="hidden" style="color:var(--red);font-size:13px;margin:10px 0 0;"></p>
    </section>

    <!-- 메인 화면 -->
    <main id="appView" class="hidden">
      <!-- 사이트 선택 카드 -->
      <section class="card">
        <div class="between" style="margin-bottom:8px;">
          <div class="row">
            <strong>예매 사이트:</strong>
            <select id="tenantSelect" style="min-width:220px;font-weight:600;"></select>
            <span id="tenantStatusBadge" class="badge badge-green">활성</span>
          </div>
          <div class="row">
            <button id="toggleTenantActiveBtn" type="button" class="btn-sm">활성/비활성 전환</button>
            <button id="refreshBtn" type="button" class="btn-sm">새로고침</button>
            <button id="deleteTenantBtn" type="button" class="btn-danger btn-sm">사이트 삭제</button>
          </div>
        </div>
        <div id="tenantMeta" class="sub-text"></div>

        <details id="newTenantDetails">
          <summary>+ 새 예매 사이트 등록</summary>
          <form id="newTenantForm">
            <div class="form-grid">
              <div class="field">
                <label>사이트 이름 *</label>
                <input name="name" required placeholder="예: 2026 봄 정기공연" />
              </div>
              <div class="field">
                <label>Slug (영문 소문자, 숫자, -) *</label>
                <input name="slug" required pattern="[a-z0-9-]+" placeholder="예: spring-2026" />
              </div>
              <div class="field">
                <label>허용 도메인 (선택, 쉼표 구분)</label>
                <input name="origins" placeholder="비워두면 전체 허용" />
              </div>
            </div>
            <div style="margin-top:10px;">
              <button type="submit" class="btn-primary btn-sm">사이트 등록</button>
            </div>
          </form>
        </details>
      </section>

      <div id="emptyState" class="card hidden" style="text-align:center;padding:40px 20px;">
        <p style="margin:0 0 6px;font-weight:600;">등록된 예매 사이트가 아직 없습니다.</p>
        <p class="sub-text" style="margin:0;">위의 <strong>"+ 새 예매 사이트 등록"</strong>을 눌러 첫 사이트를 만들어 보세요.</p>
      </div>

      <div id="tenantWorkspace" class="hidden">
        <!-- 탭 -->
        <nav class="tabs">
          <button type="button" class="tab-btn active" data-tab="events">행사 · 수량 관리</button>
          <button type="button" class="tab-btn" data-tab="reservations">예매자 명단</button>
          <button type="button" class="tab-btn" data-tab="keys">API Key · 연동</button>
        </nav>

        <!-- 탭 1: 행사 & 수량 -->
        <section id="tab-events">
          <div class="stats">
            <div class="stat"><div class="label">등록된 행사</div><div id="statEvents" class="num">0</div></div>
            <div class="stat"><div class="label">누적 예매 건수</div><div id="statReservations" class="num">0</div></div>
            <div class="stat"><div class="label">누적 예매 매수</div><div id="statTickets" class="num">0</div></div>
          </div>

          <details id="newEventDetails">
            <summary>+ 새 행사 등록</summary>
            <form id="newEventForm">
              <div class="form-grid">
                <div class="field">
                  <label>행사명 *</label>
                  <input name="title" required placeholder="예: 창작뮤지컬 <다이노즈>" />
                </div>
                <div class="field">
                  <label>장소 (선택)</label>
                  <input name="venue" placeholder="예: 대학로 소극장" />
                </div>
              </div>
              <div class="field" style="margin-top:10px;">
                <label>설명 (선택)</label>
                <textarea name="description" rows="2" placeholder="행사 안내 문구"></textarea>
              </div>
              <div style="margin-top:10px;">
                <button type="submit" class="btn-primary btn-sm">행사 등록</button>
              </div>
            </form>
          </details>

          <div id="eventsContainer"></div>
        </section>

        <!-- 탭 2: 예매자 명단 -->
        <section id="tab-reservations" class="hidden">
          <div class="card">
            <div class="card-title">
              <div>
                <h2>예매자 명단</h2>
                <div id="resSummary" class="sub-text"></div>
              </div>
              <button id="exportCsvBtn" type="button" class="btn-sm">CSV 다운로드 (엑셀)</button>
            </div>

            <form id="searchReservationsForm" class="row" style="margin-bottom:12px;">
              <select id="filterSchedule" style="min-width:200px;"><option value="">전체 회차</option></select>
              <input id="filterName" placeholder="이름 검색" style="width:130px;" />
              <input id="filterPhone" placeholder="연락처 검색" style="width:160px;" />
              <button type="submit" class="btn-primary btn-sm">조회</button>
              <button id="resetFilterBtn" type="button" class="btn-sm">초기화</button>
            </form>

            <div class="table-wrap">
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
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody id="reservationsTbody"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 탭 3: API Key & 연동 -->
        <section id="tab-keys" class="hidden">
          <div id="newKeyBanner" class="banner hidden">
            <strong>새 API Key가 발급되었습니다!</strong> 보안상 이 키는 지금 한 번만 표시됩니다.
            <div class="row" style="margin-top:8px;">
              <code id="issuedKeyText" style="background:#fff;padding:6px 10px;border:1px solid #fcd34d;word-break:break-all;"></code>
              <button id="copyIssuedKeyBtn" type="button" class="btn-primary btn-sm">키 복사</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <h2>API Key 관리</h2>
              <div class="row">
                <span class="sub-text">서버 주소: <code id="baseUrlCode"></code></span>
                <button id="copyBaseUrlBtn" type="button" class="btn-copy">주소 복사</button>
              </div>
            </div>

            <form id="issueKeyForm" class="row" style="margin-bottom:14px;">
              <input name="name" required placeholder="키 이름 (예: 웹 프론트엔드)" style="min-width:200px;" />
              <select name="scope">
                <option value="public">public (예매 사이트 연동용 · pk_live_)</option>
                <option value="admin">admin (관리/서버용 · sk_live_)</option>
              </select>
              <button type="submit" class="btn-primary btn-sm">+ API Key 발급</button>
            </form>

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
            <h3 style="margin:0 0 4px;font-size:15px;">허용 도메인 (CORS Allowed Origins)</h3>
            <p class="sub-text" style="margin:0 0 10px;">
              비워두면 모든 도메인을 허용합니다. 여러 개는 쉼표(,)로 구분해 입력하세요. (저장 시 즉시 반영)
            </p>
            <div class="row">
              <input id="originsInput" style="flex:1;min-width:260px;" placeholder="https://my-site.com, http://localhost:5173" />
              <button id="saveOriginsBtn" type="button" class="btn-primary btn-sm">저장</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <h3>연동 코드 예제 (SDK)</h3>
              <button id="copySnippetBtn" type="button" class="btn-copy">코드 복사</button>
            </div>
            <pre><code id="sdkSnippet"></code></pre>
          </div>
        </section>
      </div>
    </main>
  </div>

  <!-- 예매 사이트 삭제 확인 다이얼로그 (암호 재입력 + 2차 확인) -->
  <dialog id="deleteTenantDialog">
    <h3>예매 사이트 영구 삭제</h3>
    <div id="deleteTenantSummary" style="background:var(--sub-bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;"></div>
    <p class="sub-text" style="color:var(--red);margin:0 0 14px;">
      이 사이트에 등록된 <strong>모든 행사, 회차, 권종, API Key, 예매자 명단</strong>이 영구 삭제되며 복구할 수 없습니다.
    </p>
    <form id="deleteTenantForm">
      <div class="field" style="margin-bottom:12px;">
        <label for="deleteTenantPasswordInput">관리자 암호 (PLATFORM_MASTER_KEY) 다시 입력 *</label>
        <input id="deleteTenantPasswordInput" name="confirmMasterKey" type="password" placeholder="관리자 암호 입력" required autocomplete="current-password" />
      </div>
      <p id="deleteTenantError" class="hidden" style="color:var(--red);font-size:12.5px;margin:0 0 12px;"></p>
      <div class="row" style="justify-content:flex-end;">
        <button type="button" id="closeDeleteTenantBtn">취소</button>
        <button type="submit" class="btn-danger" style="background:var(--red);color:#fff;border-color:var(--red);">삭제 진행</button>
      </div>
    </form>
  </dialog>

  <!-- 예매 취소 확인 다이얼로그 -->
  <dialog id="cancelReservationDialog">
    <h3>정말 예매를 취소하시겠습니까?</h3>
    <div id="cancelReservationSummary" style="background:var(--sub-bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;"></div>
    <p class="sub-text" style="color:var(--red);margin:0 0 16px;">
      취소된 예매 내역은 삭제되며 되돌릴 수 없습니다. 차감되었던 티켓 수량은 자동으로 복구됩니다.
    </p>
    <div class="row" style="justify-content:flex-end;">
      <button type="button" id="closeCancelDialogBtn">닫기</button>
      <button type="button" id="confirmCancelReservationBtn" class="btn-danger" style="background:var(--red);color:#fff;border-color:var(--red);">예매 취소 확정</button>
    </div>
  </dialog>

  <!-- 회차 수정 다이얼로그 (브라우저 기본 dialog) -->
  <dialog id="editScheduleDialog">
    <h3>회차 수정</h3>
    <form id="editScheduleForm">
      <input type="hidden" name="id" />
      <div class="field" style="margin-bottom:10px;">
        <label>시작 일시 *</label>
        <input name="startsAt" type="datetime-local" required />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>종료 일시 <span class="sub-text">(선택)</span></label>
        <input name="endsAt" type="datetime-local" />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>예매 오픈 일시 <span class="sub-text">(비워두면 즉시 오픈)</span></label>
        <input name="salesOpenAt" type="datetime-local" />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>예매 마감 일시 <span class="sub-text">(비워두면 마감 없음)</span></label>
        <input name="salesCloseAt" type="datetime-local" />
      </div>
      <div class="row" style="margin-bottom:14px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input name="isActive" type="checkbox" style="width:auto;" />
          <span>예매 노출 활성화</span>
        </label>
      </div>
      <div class="row" style="justify-content:flex-end;">
        <button type="button" id="closeScheduleDialogBtn">취소</button>
        <button type="submit" class="btn-primary">저장</button>
      </div>
    </form>
  </dialog>

  <!-- 권종 수정 다이얼로그 (브라우저 기본 dialog) -->
  <dialog id="editTicketDialog">
    <h3>티켓 권종 수정</h3>
    <form id="editTicketForm">
      <input type="hidden" name="id" />
      <div class="field" style="margin-bottom:10px;">
        <label>권종 이름 *</label>
        <input name="name" required />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>총 수량 * <span class="sub-text">(이미 예매된 수량 이상)</span></label>
        <input name="totalQuantity" type="number" min="0" required />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>표시 가격 (원, 무료는 0)</label>
        <input name="price" type="number" min="0" value="0" />
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>1회 예매 최대 매수 <span class="sub-text">(비워두면 무제한)</span></label>
        <input name="maxPerReservation" type="number" min="1" placeholder="제한 없음" />
      </div>
      <div class="row" style="justify-content:flex-end;">
        <button type="button" id="closeDialogBtn">취소</button>
        <button type="submit" class="btn-primary">저장</button>
      </div>
    </form>
  </dialog>

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
        weekday: 'short', hour: '2-digit', minute: '2-digit',
      });
    }

    function toLocalInputValue(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return (
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
      );
    }

    function fmtPhone(raw) {
      const d = String(raw ?? '').replace(/\\D/g, '');
      if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
      if (d.length === 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
      return raw || '-';
    }

    function showToast(msg, isError = false) {
      const el = $('toast');
      el.textContent = msg;
      el.className = 'toast' + (isError ? ' error' : '');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => el.classList.add('hidden'), 2600);
    }

    async function copyText(text, label = '복사되었습니다.') {
      try {
        await navigator.clipboard.writeText(text);
        showToast(label);
      } catch {
        showToast('복사에 실패했습니다.', true);
      }
    }

    async function api(path, options = {}, retries = 1) {
      let lastErr;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
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
            const err = new Error(data?.error?.message || '요청 실패 (HTTP ' + res.status + ')');
            err.status = res.status;
            // 5xx 일시적 서버/DB 오류는 1회 재시도
            if (res.status >= 500 && attempt < retries) {
              lastErr = err;
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }
            throw err;
          }
          return data;
        } catch (err) {
          lastErr = err;
          if ((!err.status || err.status >= 500) && attempt < retries) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    }

    async function tryConnect(key) {
      state.masterKey = key;
      const data = await api('/v1/platform/tenants');
      sessionStorage.setItem('tp_master_key', key);
      state.tenants = data.tenants;
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      $('logoutBtn').classList.remove('hidden');
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
      $('logoutBtn').classList.add('hidden');
      $('loginView').classList.remove('hidden');
      $('masterKeyInput').value = '';
    });

    function renderTenantSelect() {
      const sel = $('tenantSelect');
      if (state.tenants.length === 0) {
        sel.innerHTML = '<option value="">등록된 사이트 없음</option>';
        return;
      }
      sel.innerHTML = state.tenants.map((t) =>
        \`<option value="\${t.id}">\${esc(t.name)} (\${esc(t.slug)})</option>\`
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

      const badge = $('tenantStatusBadge');
      badge.textContent = tenant.isActive ? '활성' : '비활성';
      badge.className = 'badge ' + (tenant.isActive ? 'badge-green' : 'badge-gray');

      $('tenantMeta').innerHTML =
        'Slug: <code>' + esc(tenant.slug) + '</code> · Tenant ID: <code>' + esc(tenant.id) + '</code> ' +
        '<button type="button" class="btn-copy" data-copy="' + esc(tenant.id) + '" data-copy-label="Tenant ID 복사됨">복사</button>';

      $('baseUrlCode').textContent = window.location.origin;
      $('originsInput').value = (tenant.allowedOrigins || []).join(', ');
      $('sdkSnippet').textContent = \`import { createTicketingClient } from './sdk';

const ticketing = createTicketingClient({
  baseUrl: '\${window.location.origin}',
  apiKey: 'pk_live_여기에_발급받은_키_입력',
});

// 1. 행사 목록 조회
const { events } = await ticketing.events.list();

// 2. 비회원 예매 생성 (이름 + 연락처)
const result = await ticketing.reservations.create({
  scheduleId: '회차_ID',
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
  items: [{ ticketTypeId: '권종_ID', quantity: 2 }],
});\`;

      $('eventsContainer').innerHTML =
        '<div class="card" style="text-align:center;color:var(--muted);padding:24px;">데이터를 불러오는 중...</div>';

      const [overviewRes, keysRes, resRes] = await Promise.allSettled([
        api('/v1/platform/tenants/' + tenant.id + '/overview'),
        api('/v1/platform/tenants/' + tenant.id + '/api-keys'),
        api('/v1/platform/tenants/' + tenant.id + '/reservations'),
      ]);

      const errors = [];

      if (overviewRes.status === 'fulfilled') {
        state.overview = overviewRes.value;
        renderEvents();
        renderScheduleFilter();
      } else {
        errors.push('행사 현황: ' + overviewRes.reason.message);
        $('eventsContainer').innerHTML =
          '<div class="card" style="border-color:#fecaca;background:#fef2f2;color:var(--red);">' +
          '<strong>데이터를 불러오지 못했습니다.</strong> ' + esc(overviewRes.reason.message) +
          ' <button type="button" class="btn-sm" id="retryLoadBtn" style="margin-left:8px;">다시 시도</button></div>';
        $('retryLoadBtn')?.addEventListener('click', () => loadTenantData());
      }

      if (keysRes.status === 'fulfilled') {
        state.apiKeys = keysRes.value.apiKeys;
        renderApiKeys();
      } else {
        errors.push('API Key: ' + keysRes.reason.message);
      }

      if (resRes.status === 'fulfilled') {
        state.reservations = resRes.value.reservations;
        renderReservations();
      } else {
        errors.push('예매자 명단: ' + resRes.reason.message);
      }

      bindCopyButtons();
      if (errors.length > 0) {
        showToast(errors[0], true);
      }
    }

    function bindCopyButtons() {
      document.querySelectorAll('button[data-copy]').forEach((btn) => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', () => copyText(btn.dataset.copy, btn.dataset.copyLabel || '복사되었습니다.'));
      });
    }

    function stockBadge(remaining, total) {
      if (remaining <= 0) return '<span class="badge badge-red">매진</span>';
      if (total > 0 && remaining / total <= 0.15) return '<span class="badge badge-amber">마감 임박</span>';
      return '<span class="badge badge-green">예매 가능</span>';
    }

    function renderEvents() {
      const { stats, events } = state.overview;
      $('statEvents').textContent = stats.eventCount.toLocaleString();
      $('statReservations').textContent = stats.reservationCount.toLocaleString();
      $('statTickets').textContent = stats.totalTicketsReserved.toLocaleString();

      const wrap = $('eventsContainer');
      if (events.length === 0) {
        wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--muted);padding:32px;">등록된 행사가 없습니다. 위의 <strong>"+ 새 행사 등록"</strong>을 눌러 추가해 보세요.</div>';
        return;
      }

      wrap.innerHTML = events.map((ev) => \`
        <div class="card">
          <div class="card-title">
            <div>
              <div class="row">
                <h3 style="margin:0;">\${esc(ev.title)}</h3>
                <span class="badge \${ev.isActive ? 'badge-green' : 'badge-gray'}">\${ev.isActive ? '노출 중' : '숨김'}</span>
              </div>
              <div class="sub-text" style="margin-top:4px;">
                장소: \${esc(ev.venue || '미지정')} · Event ID: <code>\${ev.id}</code>
                <button type="button" class="btn-copy" data-copy="\${ev.id}" data-copy-label="Event ID 복사됨">복사</button>
              </div>
            </div>
            <button type="button" class="btn-sm" data-action="toggle-event" data-id="\${ev.id}" data-active="\${ev.isActive}">
              \${ev.isActive ? '숨기기' : '노출하기'}
            </button>
          </div>

          <details>
            <summary>+ 회차 추가</summary>
            <form data-form="add-schedule" data-event-id="\${ev.id}">
              <div class="form-grid">
                <div class="field">
                  <label>공연 시작 일시 *</label>
                  <input name="startsAt" type="datetime-local" required />
                </div>
                <div class="field">
                  <label>공연 종료 일시 (선택)</label>
                  <input name="endsAt" type="datetime-local" />
                </div>
                <div class="field">
                  <label>예매 오픈 일시 (선택)</label>
                  <input name="salesOpenAt" type="datetime-local" />
                </div>
                <div class="field">
                  <label>예매 마감 일시 (선택)</label>
                  <input name="salesCloseAt" type="datetime-local" />
                </div>
              </div>
              <div style="margin-top:10px;">
                <button type="submit" class="btn-primary btn-sm">회차 등록</button>
              </div>
            </form>
          </details>

          \${ev.schedules.length === 0
            ? '<p class="sub-text" style="margin:8px 0 0;">아직 등록된 회차가 없습니다. 회차와 수량 권종을 추가하면 예매가 열립니다.</p>'
            : ev.schedules.map((sc) => \`
              <div class="schedule-item">
                <div class="between">
                  <div>
                    <div class="row">
                      <strong>\${fmtDate(sc.startsAt)}</strong>
                      \${sc.endsAt ? '<span class="sub-text">~ ' + fmtDate(sc.endsAt) + '</span>' : ''}
                      <span class="badge \${sc.isActive ? 'badge-green' : 'badge-gray'}">\${sc.isActive ? '노출 중' : '숨김'}</span>
                    </div>
                    <div class="sub-text" style="margin-top:3px;">
                      예매 오픈: <strong>\${sc.salesOpenAt ? fmtDate(sc.salesOpenAt) : '즉시 오픈'}</strong>
                      · 마감: <strong>\${sc.salesCloseAt ? fmtDate(sc.salesCloseAt) : '제한 없음'}</strong>
                    </div>
                  </div>
                  <div class="row">
                    <span class="sub-text">
                      Schedule ID: <code>\${sc.id}</code>
                      <button type="button" class="btn-copy" data-copy="\${sc.id}" data-copy-label="Schedule ID 복사됨">복사</button>
                    </span>
                    <button type="button" class="btn-sm" data-action="edit-schedule"
                      data-id="\${sc.id}"
                      data-starts="\${sc.startsAt}"
                      data-ends="\${sc.endsAt ?? ''}"
                      data-open="\${sc.salesOpenAt ?? ''}"
                      data-close="\${sc.salesCloseAt ?? ''}"
                      data-active="\${sc.isActive}">회차 수정</button>
                    <button type="button" class="btn-danger btn-sm" data-action="delete-schedule"
                      data-id="\${sc.id}"
                      data-label="\${esc(fmtDate(sc.startsAt))}">삭제</button>
                  </div>
                </div>

                <details>
                  <summary>+ 수량 권종 추가</summary>
                  <form data-form="add-tt" data-schedule-id="\${sc.id}">
                    <div class="form-grid">
                      <div class="field">
                        <label>권종 이름 *</label>
                        <input name="name" required placeholder="예: 일반석 / 학생석" />
                      </div>
                      <div class="field">
                        <label>총 수량 *</label>
                        <input name="totalQuantity" type="number" min="1" value="100" required />
                      </div>
                      <div class="field">
                        <label>표시 가격 (원)</label>
                        <input name="price" type="number" min="0" value="0" />
                      </div>
                      <div class="field">
                        <label>1회 최대 매수 (선택)</label>
                        <input name="maxPerReservation" type="number" min="1" placeholder="제한 없음" />
                      </div>
                    </div>
                    <div style="margin-top:10px;">
                      <button type="submit" class="btn-primary btn-sm">권종 추가</button>
                    </div>
                  </form>
                </details>

                \${sc.ticketTypes.length === 0
                  ? '<p class="sub-text" style="margin:6px 0 0;">등록된 수량 권종이 없습니다.</p>'
                  : \`<div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>권종</th>
                            <th>상태</th>
                            <th>잔여 / 총 수량</th>
                            <th>가격</th>
                            <th>1회 최대</th>
                            <th>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          \${sc.ticketTypes.map((tt) => {
                            const reserved = tt.totalQuantity - tt.remainingQuantity;
                            return \`<tr>
                              <td>
                                <strong>\${esc(tt.name)}</strong>
                                <div class="sub-text">
                                  <code>\${tt.id}</code>
                                  <button type="button" class="btn-copy" data-copy="\${tt.id}" data-copy-label="권종 ID 복사됨">복사</button>
                                </div>
                              </td>
                              <td>\${stockBadge(tt.remainingQuantity, tt.totalQuantity)}</td>
                              <td>
                                <strong>\${tt.remainingQuantity}</strong> / \${tt.totalQuantity}매
                                <span class="sub-text">(예매 \${reserved})</span>
                                <div><progress value="\${reserved}" max="\${tt.totalQuantity}"></progress></div>
                              </td>
                              <td>\${tt.price === 0 ? '무료' : tt.price.toLocaleString() + '원'}</td>
                              <td>\${tt.maxPerReservation ? tt.maxPerReservation + '매' : '무제한'}</td>
                              <td>
                                <div class="row">
                                  <button type="button" class="btn-sm" data-action="edit-tt"
                                    data-id="\${tt.id}"
                                    data-name="\${esc(tt.name)}"
                                    data-total="\${tt.totalQuantity}"
                                    data-price="\${tt.price}"
                                    data-max="\${tt.maxPerReservation ?? ''}">수정</button>
                                  <button type="button" class="btn-danger btn-sm" data-action="delete-tt"
                                    data-id="\${tt.id}"
                                    data-name="\${esc(tt.name)}">삭제</button>
                                </div>
                              </td>
                            </tr>\`;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>\`}
              </div>
            \`).join('')}
        </div>
      \`).join('');

      wrap.querySelectorAll('button[data-action="toggle-event"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + btn.dataset.id, {
              method: 'PATCH',
              body: JSON.stringify({ isActive: btn.dataset.active !== 'true' }),
            });
            showToast('행사 노출 상태를 변경했습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
        });
      });

      wrap.querySelectorAll('form[data-form="add-schedule"]').forEach((form) => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const fd = new FormData(form);
            const endsRaw = fd.get('endsAt');
            const openRaw = fd.get('salesOpenAt');
            const closeRaw = fd.get('salesCloseAt');
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/events/' + form.dataset.eventId + '/schedules', {
              method: 'POST',
              body: JSON.stringify({
                startsAt: new Date(fd.get('startsAt')).toISOString(),
                endsAt: endsRaw ? new Date(endsRaw).toISOString() : null,
                salesOpenAt: openRaw ? new Date(openRaw).toISOString() : null,
                salesCloseAt: closeRaw ? new Date(closeRaw).toISOString() : null,
              }),
            });
            showToast('회차가 등록되었습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
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
            showToast('수량 권종이 추가되었습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
        });
      });

      wrap.querySelectorAll('button[data-action="edit-schedule"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dialog = $('editScheduleDialog');
          const form = $('editScheduleForm');
          form.elements.id.value = btn.dataset.id;
          form.elements.startsAt.value = toLocalInputValue(btn.dataset.starts);
          form.elements.endsAt.value = toLocalInputValue(btn.dataset.ends);
          form.elements.salesOpenAt.value = toLocalInputValue(btn.dataset.open);
          form.elements.salesCloseAt.value = toLocalInputValue(btn.dataset.close);
          form.elements.isActive.checked = btn.dataset.active === 'true';
          dialog.showModal();
        });
      });

      wrap.querySelectorAll('button[data-action="delete-schedule"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('[' + btn.dataset.label + '] 회차와 소속 권종을 삭제하시겠습니까?\\n(이미 예매 내역이 있는 회차는 삭제되지 않습니다.)')) return;
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/schedules/' + btn.dataset.id, {
              method: 'DELETE',
            });
            showToast('회차가 삭제되었습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
        });
      });

      wrap.querySelectorAll('button[data-action="edit-tt"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dialog = $('editTicketDialog');
          const form = $('editTicketForm');
          form.elements.id.value = btn.dataset.id;
          form.elements.name.value = btn.dataset.name;
          form.elements.totalQuantity.value = btn.dataset.total;
          form.elements.price.value = btn.dataset.price;
          form.elements.maxPerReservation.value = btn.dataset.max;
          dialog.showModal();
        });
      });

      wrap.querySelectorAll('button[data-action="delete-tt"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('[' + btn.dataset.name + '] 권종을 삭제하시겠습니까?\\n(이미 예매 내역이 있는 권종은 삭제되지 않습니다.)')) return;
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/ticket-types/' + btn.dataset.id, {
              method: 'DELETE',
            });
            showToast('권종이 삭제되었습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
        });
      });

      bindCopyButtons();
    }

    $('closeScheduleDialogBtn').addEventListener('click', () => $('editScheduleDialog').close());

    $('editScheduleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const endsRaw = String(fd.get('endsAt') || '').trim();
      const openRaw = String(fd.get('salesOpenAt') || '').trim();
      const closeRaw = String(fd.get('salesCloseAt') || '').trim();
      try {
        await api('/v1/platform/tenants/' + state.selectedTenantId + '/schedules/' + fd.get('id'), {
          method: 'PATCH',
          body: JSON.stringify({
            startsAt: new Date(String(fd.get('startsAt'))).toISOString(),
            endsAt: endsRaw ? new Date(endsRaw).toISOString() : null,
            salesOpenAt: openRaw ? new Date(openRaw).toISOString() : null,
            salesCloseAt: closeRaw ? new Date(closeRaw).toISOString() : null,
            isActive: form.elements.isActive.checked,
          }),
        });
        $('editScheduleDialog').close();
        showToast('회차 정보를 수정했습니다.');
        await loadTenantData();
      } catch (err) { showToast(err.message, true); }
    });

    $('closeDialogBtn').addEventListener('click', () => $('editTicketDialog').close());

    $('editTicketForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const maxRaw = String(fd.get('maxPerReservation') || '').trim();
      try {
        await api('/v1/platform/tenants/' + state.selectedTenantId + '/ticket-types/' + fd.get('id'), {
          method: 'PATCH',
          body: JSON.stringify({
            name: String(fd.get('name')).trim(),
            totalQuantity: Number(fd.get('totalQuantity')),
            price: Number(fd.get('price') || 0),
            maxPerReservation: maxRaw ? Number(maxRaw) : null,
          }),
        });
        $('editTicketDialog').close();
        showToast('티켓 권종을 수정했습니다.');
        await loadTenantData();
      } catch (err) { showToast(err.message, true); }
    });

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
      const totalTickets = state.reservations.reduce((sum, r) => sum + r.totalQuantity, 0);
      $('resSummary').textContent = '조회된 예매 ' + state.reservations.length + '건 · 총 ' + totalTickets + '매';

      const tbody = $('reservationsTbody');
      if (state.reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:28px;">조회된 예매 내역이 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.reservations.map((r) => \`
        <tr>
          <td><code>\${esc(r.reservationCode)}</code></td>
          <td><strong>\${esc(r.eventTitle)}</strong><div class="sub-text">\${fmtDate(r.scheduleStartsAt)}</div></td>
          <td><strong>\${esc(r.customerName)}</strong></td>
          <td>\${esc(fmtPhone(r.customerPhone))}</td>
          <td>\${r.items.map((i) => esc(i.ticketTypeName) + ' × ' + i.quantity).join(', ')}</td>
          <td><strong>\${r.totalQuantity}매</strong></td>
          <td class="sub-text">\${fmtDate(r.createdAt)}</td>
          <td>
            <button type="button" class="btn-danger btn-sm" data-action="cancel-res" data-id="\${r.id}">취소</button>
          </td>
        </tr>
      \`).join('');

      tbody.querySelectorAll('button[data-action="cancel-res"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = state.reservations.find((r) => r.id === btn.dataset.id);
          if (!target) return;
          state.pendingCancelReservationId = target.id;
          $('cancelReservationSummary').innerHTML =
            '<div><strong>예매번호:</strong> <code>' + esc(target.reservationCode) + '</code></div>' +
            '<div><strong>행사 / 회차:</strong> ' + esc(target.eventTitle) + ' (' + fmtDate(target.scheduleStartsAt) + ')</div>' +
            '<div><strong>예매자:</strong> ' + esc(target.customerName) + ' · ' + esc(fmtPhone(target.customerPhone)) + '</div>' +
            '<div><strong>취소 수량:</strong> ' + target.items.map((i) => esc(i.ticketTypeName) + ' × ' + i.quantity).join(', ') + ' (총 ' + target.totalQuantity + '매)</div>';
          $('cancelReservationDialog').showModal();
        });
      });
    }

    $('closeCancelDialogBtn').addEventListener('click', () => {
      state.pendingCancelReservationId = null;
      $('cancelReservationDialog').close();
    });

    $('confirmCancelReservationBtn').addEventListener('click', async () => {
      if (!state.pendingCancelReservationId) return;
      const targetId = state.pendingCancelReservationId;
      try {
        const res = await api(
          '/v1/platform/tenants/' + state.selectedTenantId + '/reservations/' + targetId,
          { method: 'DELETE' },
        );
        state.pendingCancelReservationId = null;
        $('cancelReservationDialog').close();
        showToast('예매(' + res.reservationCode + ')를 취소하고 ' + res.restoredQuantity + '매 수량을 복구했습니다.');
        await loadTenantData();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    async function searchReservations() {
      try {
        const params = new URLSearchParams();
        if ($('filterSchedule').value) params.set('scheduleId', $('filterSchedule').value);
        if ($('filterName').value.trim()) params.set('customerName', $('filterName').value.trim());
        if ($('filterPhone').value.trim()) params.set('customerPhone', $('filterPhone').value.trim());
        const data = await api('/v1/platform/tenants/' + state.selectedTenantId + '/reservations?' + params.toString());
        state.reservations = data.reservations;
        renderReservations();
      } catch (err) { showToast(err.message, true); }
    }

    $('searchReservationsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      searchReservations();
    });

    $('resetFilterBtn').addEventListener('click', () => {
      $('filterSchedule').value = '';
      $('filterName').value = '';
      $('filterPhone').value = '';
      searchReservations();
    });

    $('exportCsvBtn').addEventListener('click', () => {
      if (state.reservations.length === 0) return showToast('내보낼 예매 내역이 없습니다.', true);
      const header = ['예매번호', '행사명', '회차', '이름', '연락처', '선택권종', '총수량', '예매일시'];
      const rows = state.reservations.map((r) => [
        r.reservationCode,
        r.eventTitle,
        fmtDate(r.scheduleStartsAt),
        r.customerName,
        fmtPhone(r.customerPhone),
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">발급된 API Key가 없습니다.</td></tr>';
        return;
      }
      tbody.innerHTML = state.apiKeys.map((k) => \`
        <tr>
          <td><strong>\${esc(k.name)}</strong></td>
          <td><span class="badge \${k.scope === 'public' ? 'badge-green' : 'badge-gray'}">\${k.scope}</span></td>
          <td><code>\${esc(k.keyPrefix)}...</code></td>
          <td class="sub-text">\${fmtDate(k.lastUsedAt)}</td>
          <td>\${k.revokedAt ? '<span class="badge badge-red">폐기됨</span>' : '<span class="badge badge-green">활성</span>'}</td>
          <td>\${k.revokedAt ? '-' : '<button type="button" class="btn-danger btn-sm" data-revoke="' + k.id + '">폐기</button>'}</td>
        </tr>
      \`).join('');
      tbody.querySelectorAll('button[data-revoke]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('이 API Key를 폐기하시겠습니까? 폐기된 키는 즉시 사용 불가합니다.')) return;
          try {
            await api('/v1/platform/tenants/' + state.selectedTenantId + '/api-keys/' + btn.dataset.revoke, { method: 'DELETE' });
            showToast('API Key를 폐기했습니다.');
            await loadTenantData();
          } catch (err) { showToast(err.message, true); }
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
        showToast('새 API Key가 발급되었습니다.');
      } catch (err) { showToast(err.message, true); }
    });

    $('copyIssuedKeyBtn').addEventListener('click', () => copyText($('issuedKeyText').textContent, 'API Key 복사됨'));
    $('copyBaseUrlBtn').addEventListener('click', () => copyText($('baseUrlCode').textContent, '서버 주소 복사됨'));
    $('copySnippetBtn').addEventListener('click', () => copyText($('sdkSnippet').textContent, '연동 코드 복사됨'));

    $('saveOriginsBtn').addEventListener('click', async () => {
      try {
        const origins = $('originsInput').value.split(',').map((s) => s.trim()).filter(Boolean);
        const updated = await api('/v1/platform/tenants/' + state.selectedTenantId, {
          method: 'PATCH',
          body: JSON.stringify({ allowedOrigins: origins }),
        });
        state.tenants = state.tenants.map((t) => (t.id === updated.id ? updated : t));
        showToast('허용 도메인이 저장되었습니다.');
      } catch (err) { showToast(err.message, true); }
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
        $('newTenantDetails').open = false;
        showToast('새 예매 사이트가 등록되었습니다.');
        await selectTenant(created.id);
      } catch (err) { showToast(err.message, true); }
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
        $('newEventDetails').open = false;
        showToast('행사가 등록되었습니다.');
        await loadTenantData();
      } catch (err) { showToast(err.message, true); }
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
        showToast('사이트 상태를 변경했습니다.');
      } catch (err) { showToast(err.message, true); }
    });

    $('deleteTenantBtn').addEventListener('click', () => {
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;
      $('deleteTenantSummary').innerHTML =
        '<div><strong>사이트 이름:</strong> ' + esc(tenant.name) + '</div>' +
        '<div><strong>Slug:</strong> <code>' + esc(tenant.slug) + '</code></div>';
      $('deleteTenantPasswordInput').value = '';
      $('deleteTenantError').classList.add('hidden');
      $('deleteTenantDialog').showModal();
    });

    $('closeDeleteTenantBtn').addEventListener('click', () => {
      $('deleteTenantDialog').close();
    });

    $('deleteTenantForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tenant = state.tenants.find((t) => t.id === state.selectedTenantId);
      if (!tenant) return;
      const confirmMasterKey = $('deleteTenantPasswordInput').value.trim();
      if (!confirmMasterKey) return;

      $('deleteTenantError').classList.add('hidden');

      const doubleChecked = confirm(
        '[' + tenant.name + ' (' + tenant.slug + ')] 사이트와 소속된 모든 행사·예매 데이터를 정말 영구 삭제하시겠습니까?\\n\\n이 작업은 되돌릴 수 없습니다.'
      );
      if (!doubleChecked) return;

      try {
        await api('/v1/platform/tenants/' + tenant.id, {
          method: 'DELETE',
          body: JSON.stringify({ confirmMasterKey }),
        }, 0);
        $('deleteTenantDialog').close();
        state.tenants = state.tenants.filter((t) => t.id !== tenant.id);
        showToast('[' + tenant.name + '] 사이트가 영구 삭제되었습니다.');
        if (state.tenants.length > 0) {
          await selectTenant(state.tenants[0].id);
        } else {
          state.selectedTenantId = null;
          renderTenantSelect();
          $('tenantWorkspace').classList.add('hidden');
          $('emptyState').classList.remove('hidden');
          $('tenantMeta').textContent = '';
        }
      } catch (err) {
        $('deleteTenantError').textContent = err.message;
        $('deleteTenantError').classList.remove('hidden');
      }
    });

    $('refreshBtn').addEventListener('click', async () => {
      try {
        await loadTenantData();
        showToast('새로고침 완료');
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTab = btn.dataset.tab;
        ['events', 'reservations', 'keys'].forEach((t) => {
          $('tab-' + t).classList.toggle('hidden', t !== state.activeTab);
        });
      });
    });

    if (state.masterKey) {
      tryConnect(state.masterKey).catch((err) => {
        if (err && err.status === 401) {
          sessionStorage.removeItem('tp_master_key');
          state.masterKey = '';
          $('appView').classList.add('hidden');
          $('logoutBtn').classList.add('hidden');
          $('loginView').classList.remove('hidden');
        } else {
          showToast('불러오기 오류: ' + (err?.message || '알 수 없는 오류'), true);
        }
      });
    }
  </script>
</body>
</html>`;
}
