export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type GroceryLine = {
  key: string;
  name: string;
  unit: string;
  quantity: number;
};

export function groceryKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

export function aggregateGroceries(groups: Ingredient[][]): GroceryLine[] {
  const lines = new Map<string, GroceryLine>();
  for (const ingredients of groups) {
    for (const ingredient of ingredients) {
      const name = ingredient.name.trim();
      const unit = ingredient.unit.trim();
      if (!name || !Number.isFinite(ingredient.quantity)) continue;
      const key = groceryKey(name, unit);
      const existing = lines.get(key);
      if (existing) {
        existing.quantity += ingredient.quantity;
      } else {
        lines.set(key, { key, name, unit, quantity: ingredient.quantity });
      }
    }
  }
  return [...lines.values()].sort((a, b) => a.name.localeCompare(b.name) || a.unit.localeCompare(b.unit));
}

export function formatQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
