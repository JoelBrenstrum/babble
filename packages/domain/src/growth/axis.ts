export function niceStep(range: number): number {
  const raw = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * magnitude).find((step) => step >= raw) ?? raw;
}

export function chartAxis(chart: { yMin: number; yMax: number; xMax: number }): { yTicks: number[]; xTicks: number[] } {
  const yStep = niceStep(chart.yMax - chart.yMin);
  const yTicks: number[] = [];
  for (let value = Math.ceil(chart.yMin / yStep) * yStep; value <= chart.yMax; value += yStep) yTicks.push(value);
  const xStep = chart.xMax <= 6 ? 1 : chart.xMax <= 12 ? 2 : chart.xMax <= 24 ? 3 : 6;
  const xTicks: number[] = [];
  for (let months = 0; months <= chart.xMax; months += xStep) xTicks.push(months);
  return { yTicks, xTicks };
}
