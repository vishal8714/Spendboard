// Thin wrapper around fetch that understands the backend's ApiError format:
// { status, error, message, path, fieldErrors? }
// It also handles the two pieces of session security:
//  - cookies (JSESSIONID) are sent automatically by the browser
//  - every POST/PUT/DELETE carries the CSRF token in the X-XSRF-TOKEN header

export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}, code = null) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code; // e.g. "EMAIL_NOT_VERIFIED"
  }
}

// Called when any request comes back 401, so the app can show the login screen
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

function readCookie(name) {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Spring sets the XSRF-TOKEN cookie on any response. If we don't have it yet, fetch it first.
async function ensureCsrfToken() {
  if (!readCookie('XSRF-TOKEN')) {
    await fetch('/api/auth/config', { credentials: 'same-origin' }).catch(() => {});
  }
  return readCookie('XSRF-TOKEN');
}

async function request(method, url, body, { authCall = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const token = await ensureCsrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the Spring Boot app running on port 8080?');
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // A 401 on a normal call means the session ended: go back to the login screen.
    // (A 401 from the login form itself just means a wrong password.)
    if (res.status === 401 && !authCall) onUnauthorized();
    throw new ApiError(
      res.status,
      data?.message || `Request failed (${res.status})`,
      data?.fieldErrors || {},
      data?.code || null
    );
  }
  return data;
}

function query(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // Auth
  me: () => request('GET', '/api/auth/me', undefined, { authCall: true }),
  authConfig: () => request('GET', '/api/auth/config', undefined, { authCall: true }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }, { authCall: true }),
  // Returns { email, verificationRequired }: the user is NOT logged in until verifyEmail succeeds
  register: (name, email, password) =>
    request('POST', '/api/auth/register', { name, email, password }, { authCall: true }),
  verifyEmail: (email, code) => request('POST', '/api/auth/verify', { email, code }, { authCall: true }),
  resendCode: (email) => request('POST', '/api/auth/resend', { email }, { authCall: true }),
    forgotPassword: (email) => request('POST', '/api/auth/forgot-password', { email }, { authCall: true }),
  resetPassword: (email, code, newPassword) =>
    request('POST', '/api/auth/reset-password', { email, code, newPassword }, { authCall: true }),
  logout: () => request('POST', '/api/auth/logout', undefined, { authCall: true }),
  deleteAccount: () => request('DELETE', '/api/auth/me'),
  // avatarInitials / avatarColor: '' means automatic
  updateProfile: ({ name, avatarInitials, avatarColor }) =>
    request('PUT', '/api/auth/me', { name, avatarInitials, avatarColor }),
  changePassword: (currentPassword, newPassword) =>
    request('POST', '/api/auth/change-password', { currentPassword, newPassword }),
  googleLoginUrl: '/oauth2/authorization/google',

  // Expenses
  listExpenses: (filters = {}) => request('GET', `/api/expenses${query(filters)}`),
  createExpense: (body) => request('POST', '/api/expenses', body),
  updateExpense: (id, body) => request('PUT', `/api/expenses/${id}`, body),
  deleteExpense: (id) => request('DELETE', `/api/expenses/${id}`),

  // Categories
  listCategories: () => request('GET', '/api/categories'),
  createCategory: (name) => request('POST', '/api/categories', { name }),
  updateCategory: (id, name) => request('PUT', `/api/categories/${id}`, { name }),
  deleteCategory: (id) => request('DELETE', `/api/categories/${id}`),

  // Recurring expenses
  listRecurring: () => request('GET', '/api/recurring-expenses'),
  createRecurring: (body) => request('POST', '/api/recurring-expenses', body),
  updateRecurring: (id, body) => request('PUT', `/api/recurring-expenses/${id}`, body),
  setRecurringActive: (id, active) => request('POST', `/api/recurring-expenses/${id}/active`, { active }),
  deleteRecurring: (id) => request('DELETE', `/api/recurring-expenses/${id}`),

  // Budgets (one monthly amount per category)
  budgets: (month) => request('GET', `/api/budgets${query({ month })}`),
  setOverallBudget: (amount) => request('PUT', '/api/budgets/overall', { amount }),
  removeOverallBudget: () => request('DELETE', '/api/budgets/overall'),
  setBudget: (categoryId, amount) => request('PUT', `/api/budgets/${categoryId}`, { amount }),
  removeBudget: (categoryId) => request('DELETE', `/api/budgets/${categoryId}`),

  // Summary
  monthlySummary: (month) => request('GET', `/api/summary${query({ month })}`),
};
