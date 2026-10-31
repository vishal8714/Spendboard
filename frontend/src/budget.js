import { api } from './api.js';
import { formatMoney, monthLabel } from './utils.js';

// After an expense is saved: if its category is now over budget for that month, show a warning.
// Best effort: a failed check never blocks or breaks saving.
export async function warnIfOverBudget(categoryId, date, notify) {
  try {
    const month = date.slice(0, 7);
    const overview = await api.budgets(month);
    const item = overview.categories.find((c) => c.categoryId === categoryId);
    if (!item || item.budget == null) return;

    const spent = Number(item.spent);
    const budget = Number(item.budget);
    if (spent > budget) {
      notify(
        'warning',
        `${item.categoryName} is over budget for ${monthLabel(month)}: ${formatMoney(spent)} spent of ` +
          `${formatMoney(budget)} (${formatMoney(spent - budget)} over).`
      );
    }
  } catch {
    // ignore: the expense itself was saved fine
  }
}
