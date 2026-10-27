# Spendboard — Expense Tracker UI

React (Vite) frontend for the Spring Boot expense tracker API.

## Run it

1. Start the Spring Boot app (port 8080) with MySQL running.
2. In this folder:

```bash
npm install
npm run dev
```

3. Open http://localhost:5173

The Vite dev server forwards `/api`, `/oauth2` and `/login/oauth2` to `http://localhost:8080`
(see `vite.config.js`), so no CORS configuration is needed in Spring Boot, and the session
and CSRF cookies work as if everything were one site.

## Login

- On startup the app calls `GET /api/auth/me`. With a valid session cookie, it opens straight away;
  otherwise it shows the sign-in screen.
- Sign in / create account use `POST /api/auth/login` and `POST /api/auth/register`.
- **Continue with Google** appears only when the backend has Google configured (`GET /api/auth/config`).
- Every POST/PUT/DELETE sends the `XSRF-TOKEN` cookie's value in the `X-XSRF-TOKEN` header (`src/api.js`).
- Any 401 from the API (session expired) returns you to the sign-in screen.

## Screens

| Screen | API used |
|---|---|
| Expenses: list, filter by date range and category, add, edit, delete | `GET/POST /api/expenses`, `PUT/DELETE /api/expenses/{id}` |
| Categories: list, add, rename, delete | `GET/POST /api/categories`, `PUT/DELETE /api/categories/{id}` |
| Summary: monthly total and breakdown by category | `GET /api/summary?month=yyyy-MM` |

Validation errors from the backend (`fieldErrors`) appear under each form field,
and other errors (like deleting a category that's still in use) appear as toasts.

## Structure

```
src/
├── api.js                     fetch wrapper + all API calls
├── utils.js                   money/date formatting, category colors
├── App.jsx                    toolbar, left panel, page switching
└── components/
    ├── ExpensesPage.jsx       filters + table
    ├── ExpenseInspector.jsx   add/edit form (right panel)
    ├── CategoriesPage.jsx
    ├── SummaryPage.jsx
    ├── Frame.jsx, CategoryChip.jsx, Toasts.jsx, Icons.jsx
```

## Production build

```bash
npm run build
```

Output goes to `dist/`. To serve it from Spring Boot, copy the contents of `dist/`
into `src/main/resources/static/` of the backend; the app is then available at
http://localhost:8080.
