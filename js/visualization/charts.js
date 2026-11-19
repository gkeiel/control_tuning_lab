const COLORS = { grid: "#293842", text: "#788892", reference: "#f0a86e", output: "#65e6bd", control: "#67b9ff", error: "#ff8490" };

/** Render chart series on a responsive canvas. This module has no simulation dependencies. */
export function drawChart(canvas, series) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const width = rect.width, height = rect.height;
  const pad = { left: 43, right: 12, top: 13, bottom: 27 };
  const plotWidth = width - pad.left - pad.right, plotHeight = height - pad.top - pad.bottom;
  const values = series.flatMap((item) => Array.from(item.values));
  let minY = Math.min(0, ...values), maxY = Math.max(0, ...values);
  if (maxY === minY) { maxY += 1; minY -= 0.2; }
  const padding = (maxY - minY) * 0.1;
  minY -= padding; maxY += padding;
  const maxX = series[0].values.length - 1;
  const x = (index) => pad.left + (index / Math.max(maxX, 1)) * plotWidth;
  const y = (value) => pad.top + ((maxY - value) / (maxY - minY)) * plotHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.font = "9px 'DM Mono', monospace"; ctx.textBaseline = "middle";
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = maxY - ((maxY - minY) * tick) / 4, lineY = y(value);
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.left, lineY); ctx.lineTo(width - pad.right, lineY); ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.textAlign = "right"; ctx.fillText(value.toFixed(1), pad.left - 8, lineY);
  }
  for (let tick = 0; tick <= 4; tick += 1) {
    const index = Math.round((maxX * tick) / 4), lineX = x(index);
    ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(lineX, pad.top); ctx.lineTo(lineX, height - pad.bottom); ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.textAlign = "center"; ctx.fillText((series[0].time[index] ?? 0).toFixed(1), lineX, height - 12);
  }
  for (const item of series) {
    ctx.beginPath(); ctx.strokeStyle = item.color; ctx.lineWidth = item.width || 1.8; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const stride = Math.max(1, Math.floor(item.values.length / Math.max(plotWidth * 2, 1)));
    for (let index = 0; index < item.values.length; index += stride) {
      if (index === 0) ctx.moveTo(x(index), y(item.values[index])); else ctx.lineTo(x(index), y(item.values[index]));
    }
    ctx.lineTo(x(maxX), y(item.values[maxX])); ctx.stroke();
  }
}
export const chartColors = COLORS;

