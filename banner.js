/* ============================================================
   1С-ИжТиСи · баннерная анимация
   1) печатающееся слово в заголовке
   2) «живой» редактор кода 1С
   3) рекламный баннер: ротация слайдов, пауза, свайп, таймер акции
   ============================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Печатающееся слово ---------- */
  const typer = $("typer");
  if (typer) {
    const WORDS = ["учёт", "склад", "зарплату", "торговлю", "производство", "отчётность"];
    if (RM) typer.textContent = WORDS.join(" · ");
    else {
      let w = 0, c = 0, del = false;
      const tick = () => {
        const word = WORDS[w];
        typer.textContent = word.slice(0, c);
        let delay = del ? 45 : 95;
        if (!del && c === word.length) { delay = 1600; del = true; }
        else if (del && c === 0) { del = false; w = (w + 1) % WORDS.length; delay = 350; }
        else c += del ? -1 : 1;
        setTimeout(tick, delay);
      };
      tick();
    }
  }

  /* ---------- 2. Редактор кода 1С ---------- */
  const body = $("codeBody");
  if (body) {
    /* строки настоящего языка 1С, разбитые на цветные токены */
    const LINES = [
      [["k", "Процедура "], ["f", "НавестиПорядок"], ["p", "(Компания)"]],
      [["p", "    Учёт = "], ["k", "Новый "], ["f", "УправленческийУчёт"], ["p", ";"]],
      [["p", "    Учёт.Платформа = "], ["s", "\"1С:Предприятие 8.3\""], ["p", ";"]],
      [["p", "    Учёт.Партнёр   = "], ["s", "\"1С-ИжТиСи\""], ["p", ";"]],
      [["p", "    "], ["k", "Пока "], ["p", "Компания."], ["f", "ЕстьХаос"], ["p", "() "], ["k", "Цикл"]],
      [["p", "        Учёт."], ["f", "Автоматизировать"], ["p", "();"]],
      [["p", "    "], ["k", "КонецЦикла"], ["p", ";"]],
      [["p", "    "], ["f", "Сообщить"], ["p", "("], ["s", "\"Прибыль растёт ✓\""], ["p", ");"]],
      [["k", "КонецПроцедуры"]],
      [["c", "// выполнено за 0,4 сек · ошибок: 0"]]
    ];
    const res = $("resCard");
    const caret = document.createElement("span");
    caret.className = "code__caret";
    caret.innerHTML = "&nbsp;";

    const renderFull = () => {
      body.innerHTML = "";
      LINES.forEach((tokens, i) => {
        const line = document.createElement("div");
        line.className = "cl";
        line.innerHTML = `<span class="ln">${i + 1}</span>`;
        const tx = document.createElement("span");
        tokens.forEach(([cls, text]) => {
          const s = document.createElement("span");
          if (cls !== "p") s.className = "tk-" + cls;
          s.textContent = text;
          tx.appendChild(s);
        });
        line.appendChild(tx);
        body.appendChild(line);
      });
      if (res) res.classList.add("show");
    };

    if (RM) renderFull();
    else {
      let li = 0, ti = 0, ci = 0, line = null, tx = null, span = null;
      const restart = () => {
        body.innerHTML = "";
        if (res) res.classList.remove("show");
        li = ti = ci = 0; line = tx = span = null;
        setTimeout(type, 500);
      };
      const type = () => {
        if (li >= LINES.length) {           /* код дописан */
          caret.remove();
          if (res) res.classList.add("show");
          setTimeout(restart, 4600);
          return;
        }
        if (!line) {
          line = document.createElement("div");
          line.className = "cl";
          line.innerHTML = `<span class="ln">${li + 1}</span>`;
          tx = document.createElement("span");
          line.appendChild(tx);
          body.appendChild(line);
        }
        const tokens = LINES[li];
        const [cls, text] = tokens[ti];
        if (!span) {
          span = document.createElement("span");
          if (cls !== "p") span.className = "tk-" + cls;
          tx.appendChild(span);
        }
        span.textContent += text[ci];
        tx.appendChild(caret);
        ci++;
        let delay = 16 + Math.random() * 26;
        if (ci >= text.length) {            /* токен закончился */
          ci = 0; ti++; span = null;
          if (ti >= tokens.length) {        /* строка закончилась */
            ti = 0; li++; line = tx = null;
            delay = 150;
          }
        }
        setTimeout(type, delay);
      };
      type();
    }
  }

  /* ---------- 3. Рекламный баннер ---------- */
  const ad = $("ad");
  if (ad) {
    const slides = Array.from(ad.querySelectorAll(".ad__s"));
    const dotsBox = $("adDots"), bar = $("adBar"),
          num = $("adNum"), pauseBtn = $("adPause");
    const DUR = 6000;
    let idx = 0, prog = 0, pinned = false, hover = false;

    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", "Слайд " + (i + 1));
      b.addEventListener("click", () => go(i));
      dotsBox.appendChild(b);
    });
    const dots = Array.from(dotsBox.children);

    const go = (i) => {
      idx = (i + slides.length) % slides.length;
      prog = 0;
      slides.forEach((s, k) => s.classList.toggle("on", k === idx));
      dots.forEach((d, k) => d.classList.toggle("on", k === idx));
      num.textContent = (idx + 1) + " / " + slides.length;
    };
    go(0);

    /* ротация: один интервал на весь баннер */
    setInterval(() => {
      if (pinned || hover || RM) return;
      prog += 60 / DUR;
      if (prog >= 1) go(idx + 1);
      bar.style.width = Math.min(prog * 100, 100) + "%";
    }, 60);

    pauseBtn.addEventListener("click", () => {
      pinned = !pinned;
      pauseBtn.textContent = pinned ? "▶" : "⏸";
      pauseBtn.setAttribute("aria-pressed", String(pinned));
    });
    ad.addEventListener("mouseenter", () => (hover = true));
    ad.addEventListener("mouseleave", () => (hover = false));

    /* свайп на телефоне */
    let sx = null;
    ad.addEventListener("pointerdown", (e) => (sx = e.clientX));
    ad.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });

    /* живой таймер акции до 31 декабря 2026 */
    const cdD = $("cdD"), cdH = $("cdH"), cdM = $("cdM"), cdS = $("cdS");
    if (cdD) {
      const target = new Date(2026, 11, 31, 23, 59, 59).getTime();
      const pad = (n) => String(n).padStart(2, "0");
      const tickCd = () => {
        let ms = Math.max(0, target - Date.now());
        const d = Math.floor(ms / 864e5); ms -= d * 864e5;
        const h = Math.floor(ms / 36e5);  ms -= h * 36e5;
        const m = Math.floor(ms / 6e4);   ms -= m * 6e4;
        cdD.textContent = pad(d); cdH.textContent = pad(h);
        cdM.textContent = pad(m); cdS.textContent = pad(Math.floor(ms / 1e3));
      };
      tickCd();
      setInterval(tickCd, 1000);
    }
  }
})();