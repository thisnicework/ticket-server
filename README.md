# ticket-server (예매 서버)

여러 개의 예매 사이트가 **단일 Supabase PostgreSQL 프로젝트**를 공유하고, 각 사이트는 발급받은 API Key(`pk_live_*`, `sk_live_*`)로 접속하는 수량제 비회원 예매 백엔드 플랫폼입니다.

## 주요 특징
- **단일 Supabase 멀티테넌트**: 모든 테이블이 `tenant_id`로 격리되어 예매 사이트가 늘어나도 Supabase 프로젝트는 1개만 유지
- **수량제 예매 & 동시성 제어**: DB 트랜잭션 내 원자적 수량 차감(`remaining_quantity >= qty`)으로 초과 예매 방지
- **비회원 전용 (이름 + 연락처)**: 별도 회원가입 없이 이름과 연락처만으로 예매 및 조회 가능 (취소 API 없음)
- **자동 API 문서**: 서버 실행 후 `/docs`에서 Swagger UI로 모든 API 테스트 가능
- **경량 TypeScript SDK**: `sdk/index.ts`를 각 예매 사이트에 복사하거나 패키지로 불러와 즉시 연동

---

## 1. 새 Supabase 프로젝트 연결 및 DB 마이그레이션

1. Supabase에서 새 프로젝트를 생성합니다.
2. **Project Settings → Database → Connection string**에서 **Transaction pooler (포트 6543)** URL을 복사합니다.
3. `.env.example`을 `.env`로 복사하고 값을 채웁니다.
   ```bash
   cp .env.example .env
   ```
4. 마이그레이션을 실행하여 테이블을 생성합니다.
   ```bash
   npm run db:migrate
   ```
   *(또는 `drizzle/` 폴더에 생성된 SQL 파일을 Supabase SQL Editor에 직접 붙여넣어 실행해도 됩니다.)*

---

## 2. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드 및 실행
npm run build
npm start
```

- 헬스 체크: `GET http://localhost:3000/health`
- Swagger API 문서: `GET http://localhost:3000/docs`

---

## 3. 새 예매 사이트 등록 및 API Key 발급

### (1) 예매 사이트(Tenant) 등록
```bash
curl -X POST http://localhost:3000/v1/platform/tenants \
  -H "Authorization: Bearer $PLATFORM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "spring-concert-2026",
    "name": "2026 봄 정기공연",
    "allowedOrigins": ["https://spring-concert.example.com", "http://localhost:5173"]
  }'
```

### (2) API Key 발급 (`public` 프론트엔드용 / `admin` 관리용)
```bash
# 프론트엔드용 Public Key (pk_live_...)
curl -X POST http://localhost:3000/v1/platform/tenants/<TENANT_ID>/api-keys \
  -H "Authorization: Bearer $PLATFORM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "웹 프론트엔드", "scope": "public" }'

# 관리자/서버용 Admin Key (sk_live_...)
curl -X POST http://localhost:3000/v1/platform/tenants/<TENANT_ID>/api-keys \
  -H "Authorization: Bearer $PLATFORM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "운영 관리용", "scope": "admin" }'
```

---

## 4. 예매 사이트에서 SDK로 연동하기

```ts
import { createTicketingClient } from './sdk';

const ticketing = createTicketingClient({
  baseUrl: 'https://api.your-platform.com',
  apiKey: 'pk_live_...', // 사이트별 Public API Key
});

// 1) 행사 목록 및 상세(잔여 수량 포함) 조회
const { events } = await ticketing.events.list();
const detail = await ticketing.events.get(events[0].id);

// 2) 비회원 예매 생성 (이름 + 연락처)
const reservation = await ticketing.reservations.create({
  scheduleId: detail.schedules[0].id,
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
  items: [
    { ticketTypeId: detail.schedules[0].ticketTypes[0].id, quantity: 2 },
  ],
});
console.log('예매번호:', reservation.reservationCode);

// 3) 비회원 예매 조회 (이름 + 연락처)
const { reservations } = await ticketing.reservations.lookup({
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
});
```
