export function labelOptions<K extends string>(
  labels: Record<K, string>,
  keys: readonly K[],
): { value: K; label: string }[] {
  return keys.map((value) => ({ value, label: labels[value] }));
}
