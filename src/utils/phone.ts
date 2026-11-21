/**
 * 연락처 정규화: 숫자만 추출하고, 한국 국가번호(+82 / 82)로 시작하는 경우 0으로 변환합니다.
 * 예: "010-1234-5678" -> "01012345678"
 *     "+82 10-1234-5678" -> "01012345678"
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8210') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith('82010') && digits.length === 13) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * 이름 정규화: 앞뒤 공백 제거 및 연속 공백 1칸 통일
 */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}
