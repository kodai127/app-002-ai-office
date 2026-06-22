const htmlTagPattern = /<[^>]*>/g;
const scriptProtocolPattern = /\b(?:javascript|data):/gi;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/g;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeText(value: string | null | undefined, maxLength: number) {
  return (value ?? '')
    .replace(htmlTagPattern, '')
    .replace(scriptProtocolPattern, '')
    .replace(controlCharacterPattern, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(value: string | null | undefined, maxLength: number) {
  const sanitized = sanitizeText(value, maxLength);

  return sanitized || null;
}

export function validateAmount(value: number, label = '金額') {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label}は0以上の数値で入力してください。`);
  }

  return value;
}

export function validateEmail(value: string | null | undefined) {
  const email = sanitizeText(value, 254);

  if (email && !emailPattern.test(email)) {
    throw new Error('有効なメールアドレスを入力してください。');
  }

  return email || null;
}

export function getSafeErrorMessage(error: unknown, fallback = '処理に失敗しました。時間をおいて再度お試しください。') {
  if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
    return error.message;
  }

  return fallback;
}
