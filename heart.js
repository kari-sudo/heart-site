const HeartGeometry = (() => {
  const X_MIN = -1.2, X_MAX = 1.2;
  const Y_MIN = -1.05, Y_MAX = 1.3;

  function inside(x, y) {
    const a = x * x + y * y - 1;
    return a * a * a - x * x * y * y * y <= 0;
  }

  function rowIntervals(y, steps = 400) {
    const intervals = [];
    const dx = (X_MAX - X_MIN) / steps;
    let start = null;
    for (let i = 0; i <= steps; i++) {
      const x = X_MIN + i * dx;
      const inA = inside(x, y);
      if (inA && start === null) start = x;
      if (!inA && start !== null) { intervals.push([start, x - dx]); start = null; }
    }
    if (start !== null) intervals.push([start, X_MAX]);
    return intervals;
  }

  function layout({ texts, fontSize, density, heartSize, viewportW, viewportH, measure }) {
    const scale = (heartSize * Math.min(viewportW, viewportH)) / (Y_MAX - Y_MIN);
    const rowH = (fontSize * 1.25) / density;
    const gap = fontSize * 0.55 / density;
    const rowsCount = Math.floor(((Y_MAX - Y_MIN) * scale) / rowH);

    const widths = texts.map(t => measure(t));
    const items = [];
    let phraseIdx = 0;
    const centerY = (Y_MIN + Y_MAX) / 2;

    for (let r = 0; r < rowsCount; r++) {
      const yNorm = Y_MAX - (r + 0.5) * (rowH / scale);
      const intervals = rowIntervals(yNorm);

      for (const [x0, x1] of intervals) {
        const segW = (x1 - x0) * scale;
        if (segW < fontSize) continue;

        const rowItems = [];
        let used = 0;
        let guard = 0;
        while (guard++ < 200) {
          const idx = phraseIdx % texts.length;
          const w = widths[idx];
          const need = rowItems.length ? gap + w : w;
          if (used + need > segW) {
            let found = -1;
            for (let k = 0; k < texts.length; k++) {
              const j = (phraseIdx + k) % texts.length;
              const n2 = rowItems.length ? gap + widths[j] : widths[j];
              if (used + n2 <= segW) { found = j; break; }
            }
            if (found < 0) break;
            rowItems.push({ text: texts[found], w: widths[found] });
            used += rowItems.length > 1 ? gap + widths[found] : widths[found];
            phraseIdx = found + 1;
          } else {
            rowItems.push({ text: texts[idx], w });
            used += need;
            phraseIdx++;
          }
        }
        if (!rowItems.length) continue;

        const segLeft = x0 * scale;
        let cursor = segLeft + (segW - used) / 2;
        const yPx = -(yNorm - centerY) * scale;

        for (const it of rowItems) {
          items.push({ text: it.text, x: cursor + it.w / 2, y: yPx, w: it.w });
          cursor += it.w + gap;
        }
      }
    }
    return items;
  }

  return { layout, inside };
})();

window.HeartGeometry = HeartGeometry;