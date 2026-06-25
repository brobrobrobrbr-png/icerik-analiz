/**
 * Örümcek Ağı Arka Plan Efekti
 *
 * Ekrana yayılmış noktalardan oluşan bir ağ çizer. Noktalar birbirine
 * ince çizgilerle bağlıdır. Fare bir düğüme yaklaştığında o düğüm
 * fareye doğru "yapışır" (çekilir); fare uzaklaşınca yay/sönümleme
 * fiziğiyle eski konumuna geri döner — örümcek ağına dokunma hissi.
 *
 * Bağımsız bir modüldür, mevcut app.js mantığına dokunmaz.
 */

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "webCanvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "0",
    pointerEvents: "none",
  });
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext("2d");

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  }

  // ─── Grid ayarları ──────────────────────────────────────────────
  const SPACING = 64; // düğümler arası mesafe (px)
  const PULL_RADIUS = 160; // farenin etkisini gösterdiği yarıçap (px)
  const MAX_PULL = 36; // bir düğümün maksimum kayma miktarı (px)
  const STIFFNESS = 0.08; // eski konuma dönüş sertliği (yay sabiti)
  const DAMPING = 0.82; // sönümleme (salınımı azaltır)

  let nodes = [];

  function buildGrid() {
    nodes = [];
    const cols = Math.ceil(width / SPACING) + 2;
    const rows = Math.ceil(height / SPACING) + 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = col * SPACING;
        const baseY = row * SPACING;
        nodes.push({
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          col,
          row,
        });
      }
    }
  }

  // Hızlı komşu erişimi için satır/sütuna göre index haritası
  function getNodeIndex(col, row, cols) {
    return row * cols + col;
  }

  let mouse = { x: -9999, y: -9999, active: false };

  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    },
    { passive: true }
  );

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener("resize", resize);

  function getColor() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#ffb020";
    const border = styles.getPropertyValue("--border").trim() || "rgba(255,255,255,0.07)";
    return { accent, border };
  }

  function step() {
    const cols = Math.ceil(width / SPACING) + 2;
    const { accent, border } = getColor();

    for (const node of nodes) {
      // Fareye yapışma kuvveti
      if (mouse.active) {
        const dx = mouse.x - node.baseX;
        const dy = mouse.y - node.baseY;
        const dist = Math.hypot(dx, dy);

        if (dist < PULL_RADIUS) {
          const pull = (1 - dist / PULL_RADIUS) * MAX_PULL;
          const angle = Math.atan2(dy, dx);
          const targetX = node.baseX + Math.cos(angle) * pull;
          const targetY = node.baseY + Math.sin(angle) * pull;

          node.vx += (targetX - node.x) * STIFFNESS;
          node.vy += (targetY - node.y) * STIFFNESS;
        } else {
          node.vx += (node.baseX - node.x) * STIFFNESS;
          node.vy += (node.baseY - node.y) * STIFFNESS;
        }
      } else {
        node.vx += (node.baseX - node.x) * STIFFNESS;
        node.vy += (node.baseY - node.y) * STIFFNESS;
      }

      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;

    // Yatay ve dikey bağlantılar
    for (const node of nodes) {
      const rightIndex = getNodeIndex(node.col + 1, node.row, cols);
      const downIndex = getNodeIndex(node.col, node.row + 1, cols);

      const right = nodes[rightIndex];
      const down = nodes[downIndex];

      if (right) drawLine(node, right, accent, border);
      if (down) drawLine(node, down, accent, border);
    }

    requestAnimationFrame(step);
  }

  function drawLine(a, b, accent, border) {
    // Düğümün ortalama deplasmanına göre çizgi rengini hafifçe vurgula
    const displacement =
      Math.hypot(a.x - a.baseX, a.y - a.baseY) +
      Math.hypot(b.x - b.baseX, b.y - b.baseY);
    const intensity = Math.min(displacement / (MAX_PULL * 1.5), 1);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = intensity > 0.04 ? withAlpha(accent, 0.15 + intensity * 0.5) : border;
    ctx.stroke();
  }

  function withAlpha(color, alpha) {
    // accent değişkeni hex formatında geliyor (örn. #ffb020)
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  resize();
  requestAnimationFrame(step);
})();
