export function readParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function formatLb(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function mealLabel(meal: string) {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}
