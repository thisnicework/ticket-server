/**
 * 예매 사이트(프론트엔드/백엔드)에서 플랫폼 API에 간편하게 접속하기 위한
 * 무의존성(Zero-dependency) TypeScript SDK
 */

export interface TicketingClientConfig {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class TicketingApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TicketingApiError';
  }
}

export interface PublicEventSummary {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  posterUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PublicTicketType {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
  maxPerReservation: number | null;
}

export interface PublicSchedule {
  id: string;
  startsAt: string;
  endsAt: string | null;
  salesOpenAt: string | null;
  salesCloseAt: string | null;
  ticketTypes: PublicTicketType[];
}

export interface PublicEventDetail extends PublicEventSummary {
  schedules: PublicSchedule[];
}

export interface ReservationItemResult {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

export interface ReservationResult {
  id: string;
  reservationCode: string;
  scheduleId: string;
  event: {
    id: string;
    title: string;
    venue: string | null;
  };
  schedule: {
    id: string;
    startsAt: string;
    endsAt: string | null;
  };
  customerName: string;
  customerPhone: string;
  totalQuantity: number;
  totalAmount: number;
  metadata: Record<string, unknown>;
  items: ReservationItemResult[];
  createdAt: string;
}

export interface CreateReservationParams {
  scheduleId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  metadata?: Record<string, unknown>;
}

export type LookupReservationParams =
  | { customerPhone: string; customerName: string; reservationCode?: never }
  | { customerPhone: string; reservationCode: string; customerName?: never };

export function createTicketingClient(config: TicketingClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const fetchFn = config.fetchImpl ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchFn(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        ...(init?.headers ?? {}),
      },
    });

    const data = (await res.json().catch(() => null)) as T | ApiErrorPayload | null;

    if (!res.ok) {
      const err = (data as ApiErrorPayload | null)?.error;
      throw new TicketingApiError(
        res.status,
        err?.code ?? 'REQUEST_FAILED',
        err?.message ?? `HTTP ${res.status}`,
        err?.details,
      );
    }

    return data as T;
  }

  return {
    events: {
      list: () => request<{ events: PublicEventSummary[] }>('/v1/events'),
      get: (eventId: string) => request<PublicEventDetail>(`/v1/events/${encodeURIComponent(eventId)}`),
    },
    reservations: {
      create: (params: CreateReservationParams) =>
        request<ReservationResult>('/v1/reservations', {
          method: 'POST',
          body: JSON.stringify(params),
        }),
      lookup: (params: LookupReservationParams) =>
        request<{ reservations: ReservationResult[] }>('/v1/reservations/lookup', {
          method: 'POST',
          body: JSON.stringify(params),
        }),
    },
  };
}
