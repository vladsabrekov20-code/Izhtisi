/* ============================================================
   1С-ИжТиСи · общие скрипты сайта
   Каждый блок проверяет наличие своих элементов,
   поэтому один файл безопасно работает на всех страницах.
   ============================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n) => Math.round(n).toLocaleString("ru-RU");

  /* ---------- тосты (всплывающие уведомления) ---------- */
  let toastBox = null;
  window.showToast = function (msg, actLabel, cb) {
    if (!toastBox) {
      toastBox = document.createElement("div");
      toastBox.className = "toasts";
      document.body.appendChild(toastBox);
    }
    while (toastBox.children.length >= 3) toastBox.firstChild.remove();
    const t = document.createElement("div");
    t.className = "toast";
    const s = document.createElement("span");
    s.textContent = msg;
    t.appendChild(s);
    let killed = false;
    const kill = () => { if (!killed) { killed = true; t.remove(); } };
    if (actLabel && cb) {
      const b = document.createElement("button");
      b.className = "toast__act";
      b.textContent = actLabel;
      b.onclick = () => { cb(); kill(); };
      t.appendChild(b);
    }
    toastBox.appendChild(t);
    setTimeout(kill, 4500);
  };

  /* ---------- шапка: прогресс чтения + фон ---------- */
  const hdr = $("hdr"), prog = $("prog");
  if (hdr) {
    let tick = false;
    const onScroll = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        hdr.classList.toggle("scrolled", y > 10);
        if (prog) {
          const max = document.documentElement.scrollHeight - innerHeight;
          prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
        }
        tick = false;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- мобильное меню ---------- */
  const burger = $("burger"), nav = $("nav");
  if (burger && nav) {
    const close = () => {
      nav.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    };
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    addEventListener("resize", () => { if (innerWidth > 900) close(); });
  }

  /* ---------- год в подвале ---------- */
  document.querySelectorAll(".yr").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- появление блоков при прокрутке ---------- */
  const rvs = document.querySelectorAll(".rv");
  document.querySelectorAll("[data-stag]").forEach((p) => {
    p.querySelectorAll(".rv").forEach((el, i) => (el.style.transitionDelay = (i * 80) + "ms"));
  });
  if (RM || !("IntersectionObserver" in window)) {
    rvs.forEach((el) => el.classList.add("in"));
  } else {
    rvs.forEach((el) => el.classList.add("pre"));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    rvs.forEach((el) => io.observe(el));
  }

  /* ---------- анимированные счётчики ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = +el.dataset.count;
      if (RM) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1300;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const io2 = new IntersectionObserver((ents) => {
        ents.forEach((en) => { if (en.isIntersecting) { run(en.target); io2.unobserve(en.target); } });
      }, { threshold: 0.5 });
      counters.forEach((el) => io2.observe(el));
    } else counters.forEach(run);
  }

  /* ---------- параллакс чипов в герое ---------- */
  const hero = $("hero");
  if (hero && !RM && matchMedia("(pointer: fine)").matches) {
    const chips = hero.querySelectorAll(".fchip");
    let raf = null;
    hero.addEventListener("mousemove", (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        chips.forEach((c) => {
          const d = +c.dataset.depth || 20;
          c.style.transform = `translate(${(-dx * d).toFixed(1)}px, ${(-dy * d).toFixed(1)}px)`;
        });
        raf = null;
      });
    });
  }

  /* ---------- оргструктура (about) ---------- */
  const orgBtns = $("orgBtns");
  if (orgBtns) {
    const DEPTS = {
      impl: { name: "Отдел внедрения", goal: "запустить 1С у клиента быстро и без потери данных.",
        tasks: ["Обследование бизнеса и выбор конфигурации", "Установка, настройка, перенос данных", "Запуск и передача в сопровождение"],
        link: "получает задачи от директора, передаёт готовые проекты линии консультаций, заказывает доработки у отдела разработки." },
      dev: { name: "Отдел разработки", goal: "адаптировать типовые 1С под процессы клиента.",
        tasks: ["Отчёты, обработки, печатные формы", "Обмены с сайтами, CRM и оборудованием", "Оценка трудозатрат в часах"],
        link: "работает по заявкам внедрения и линии консультаций, результат проверяет руководитель проектов." },
      support: { name: "Линия консультаций", goal: "решать вопросы пользователей круглосуточно.",
        tasks: ["Ответ на звонок за 30 секунд", "Обновления и сдача отчётности", "Эскалация сложных задач разработке"],
        link: "принимает клиентов после внедрения; сложные случаи передаёт разработке, счета — бухгалтерии." },
      edu: { name: "Учебный центр", goal: "научить сотрудников клиента работать в 1С самостоятельно.",
        tasks: ["Курсы для бухгалтеров, кадровиков, кладовщиков", "Инструкции под конфигурацию клиента", "Сертификация по итогам обучения"],
        link: "получает группы от отдела внедрения и линии консультаций, использует методики разработчиков." },
      acc: { name: "Бухгалтерия", goal: "вести учёт самой компании и расчёты с клиентами.",
        tasks: ["Счета, акты, договоры", "Зарплата сотрудникам", "Налоги и отчётность компании"],
        link: "вспомогательное подразделение: обслуживает все отделы, работает в собственной 1С:Бухгалтерии." },
      adm: { name: "Администрация", goal: "обеспечивать работу офиса и найм специалистов.",
        tasks: ["Офис, техника, связь", "Подбор и оформление сотрудников", "Документооборот и закупки"],
        link: "вспомогательное подразделение: поддерживает основные отделы ресурсами и людьми." }
    };
    const btns = orgBtns.querySelectorAll(".dept");
    const pick = (key) => {
      const d = DEPTS[key];
      if (!d) return;
      btns.forEach((b) => b.classList.toggle("on", b.dataset.dept === key));
      $("orgTitle").textContent = d.name;
      $("orgGoal").textContent = d.goal;
      $("orgTasks").innerHTML = d.tasks.map((t) => `<li>${t}</li>`).join("");
      $("orgLink").textContent = d.link;
    };
    orgBtns.addEventListener("click", (e) => {
      const b = e.target.closest(".dept");
      if (b) pick(b.dataset.dept);
    });
    pick("impl");
  }

  /* ---------- сравнение «до / после» (about) ---------- */
  const ba = $("ba");
  if (ba) {
    const after = $("baAfter"), handle = $("baHandle"), range = $("baRange");
    const set = (p) => {
      p = Math.max(2, Math.min(98, p));
      after.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      handle.style.left = p + "%";
      range.value = p;
    };
    const fromEvent = (e) => {
      const r = ba.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    let down = false;
    ba.addEventListener("pointerdown", (e) => { down = true; ba.setPointerCapture(e.pointerId); fromEvent(e); });
    ba.addEventListener("pointermove", (e) => { if (down) fromEvent(e); });
    ba.addEventListener("pointerup", () => (down = false));
    ba.addEventListener("pointercancel", () => (down = false));
    range.addEventListener("input", () => set(+range.value));
    set(50);
  }

  /* ---------- тарифы: переключатель периода (services) ---------- */
  const seg = document.querySelector(".seg");
  if (seg) {
    const nums = document.querySelectorAll(".tar__num [data-m]");
    const per = document.querySelectorAll(".tar__per");
    const note = $("perNote");
    seg.addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn");
      if (!b) return;
      seg.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("on", x === b));
      const p = +b.dataset.per;
      nums.forEach((n) => {
        const m = +n.dataset.m;
        n.textContent = fmt(p === 12 ? Math.round((m * 12 * 0.85) / 10) * 10 : m * 6);
      });
      per.forEach((el) => (el.textContent = p === 12 ? "₽ / год" : "₽ / 6 мес"));
      if (note) note.textContent = p === 12
        ? "Годовая оплата: скидка 15% уже включена в цены."
        : "Цены за 6 месяцев. При оплате года — скидка 15%.";
    });
  }

  /* ---------- калькулятор (services) ---------- */
  const calcCfg = $("cCfg");
  if (calcCfg) {
    const CFG = {
      buh: { name: "1С:Бухгалтерия", base: 25000 },
      zup: { name: "1С:ЗУП", base: 30000 },
      ut:  { name: "1С:Управление торговлей", base: 45000 },
      erp: { name: "1С:ERP", base: 180000 }
    };
    const ITS = { none: 0, base: 2300, prof: 4800, corp: 8900 };
    const ITSNAME = { none: "", base: "ИТС Базовый", prof: "ИТС ПРОФ", corp: "ИТС ПРОФ + Отраслевой" };
    const seats = $("cSeats"), its = $("cIts"),
          oMove = $("optMove"), oDev = $("optDev"), oEdu = $("optEdu");
    const rows = $("calcRows"), totalEl = $("calcTotal"), link = $("calcLink");
    let shown = 0, anim = null;

    const calc = () => {
      const cfg = CFG[calcCfg.value];
      const n = +seats.value;
      $("cSeatsOut").textContent = n;
      const items = [[`Внедрение «${cfg.name}»`, cfg.base]];
      if (n > 1) items.push([`Доп. рабочие места: ${n - 1} × 1 200 ₽`, (n - 1) * 1200]);
      if (its.value !== "none") {
        const y = Math.round((ITS[its.value] * 12 * 0.85) / 10) * 10;
        items.push([`${ITSNAME[its.value]}, 12 мес (−15%)`, y]);
      }
      if (oMove.checked) items.push(["Перенос данных", 12000]);
      if (oDev.checked) items.push(["Доработка, 10 часов", 26000]);
      if (oEdu.checked) items.push(["Обучение, 5 сотрудников", 9500]);
      const total = items.reduce((s, i) => s + i[1], 0);

      rows.innerHTML = items.map((i) =>
        `<div class="crow"><span>${i[0]}</span><b>${fmt(i[1])} ₽</b></div>`).join("");

      if (anim) cancelAnimationFrame(anim);
      if (RM) { shown = total; totalEl.textContent = fmt(total); }
      else {
        const from = shown, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / 450);
          shown = from + (total - from) * (1 - Math.pow(1 - k, 3));
          totalEl.textContent = fmt(shown);
          if (k < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
      }
      link.href = `contacts.html?sum=${total}&cfg=${encodeURIComponent(cfg.name)}`;
    };
    [calcCfg, seats, its, oMove, oDev, oEdu].forEach((el) => el.addEventListener("input", calc));
    calc();

    /* кнопки «Рассчитать» на карточках услуг */
    document.querySelectorAll("[data-cfg]").forEach((b) =>
      b.addEventListener("click", () => {
        calcCfg.value = b.dataset.cfg;
        calc();
        $("calc").scrollIntoView({ behavior: RM ? "auto" : "smooth" });
      }));
    document.querySelectorAll("[data-opt]").forEach((b) =>
      b.addEventListener("click", () => {
        const map = { move: oMove, dev: oDev, edu: oEdu };
        const box = map[b.dataset.opt];
        if (box) box.checked = true;
        calc();
        $("calc").scrollIntoView({ behavior: RM ? "auto" : "smooth" });
      }));
  }

  /* ---------- FAQ ---------- */
  document.querySelectorAll(".faq__q").forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.parentElement;
      const a = item.querySelector(".faq__a");
      const open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", String(open));
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
    });
  });

  /* ---------- лаборатория логотипа (studio) ---------- */
  const lgStage = $("lgStage");
  if (lgStage) {
    const MARK = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s / 96})">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD23F"/><stop offset="1" stop-color="#FF9E00"/>
    </linearGradient></defs>
    <rect width="96" height="96" rx="20" fill="url(#lg)"/>
    <path d="M96 0v28L68 0z" fill="#E8362D"/>
    <path d="M12 78h72M12 66h72" stroke="#C21F17" stroke-width="1.4" opacity=".18"/>
    <text x="46" y="66" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="44" fill="#C21F17" text-anchor="middle">1С</text>
  </g>`;
    const build = (v) => {
      if (v === "sign")
        return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${MARK(16, 16, 480)}\n</svg>`;
      const dark = v === "dark";
      const bg = dark ? `<rect width="900" height="300" rx="24" fill="#1B1206"/>` : "";
      const t1 = dark ? "#FFF2CF" : "#221708";
      const t2 = dark ? "#C9B98F" : "#6E5F45";
      return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  ${bg}${MARK(50, 50, 200)}
  <text x="290" y="150" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="64"><tspan fill="#E8362D">1С</tspan><tspan fill="${t1}">-ИжТиСи</tspan></text>
  <text x="292" y="205" font-family="Arial, sans-serif" font-size="26" fill="${t2}">Ижевск · официальный партнёр фирмы «1С»</text>
</svg>`;
    };
    const sel = $("lgVar"), code = $("lgCode");
    let current = "", variant = "light";
    const render = () => {
      variant = sel.value;
      current = build(variant);
      lgStage.dataset.theme = variant === "dark" ? "dark" : "light";
      lgStage.innerHTML = current;
      code.textContent = current;
    };
    sel.addEventListener("change", render);
    render();

    const dl = (href, name) => {
      const a = document.createElement("a");
      a.href = href; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    };
    $("lgSvg").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([current], { type: "image/svg+xml" }));
      dl(url, `logo-1c-izhtisi-${variant}.svg`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast("SVG-логотип сохранён ✓");
    });
    $("lgPng").addEventListener("click", () => {
      const img = new Image();
      const wide = variant !== "sign";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = wide ? 1800 : 1024; c.height = wide ? 600 : 1024;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        dl(c.toDataURL("image/png"), `logo-1c-izhtisi-${variant}.png`);
        showToast("PNG-логотип сохранён ✓");
      };
      img.onerror = () => showToast("Не удалось создать PNG в этом браузере");
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(current);
    });
    $("lgCpy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(current);
        showToast("Код SVG скопирован в буфер ✓");
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = current; document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        showToast(ok ? "Код SVG скопирован ✓" : "Скопируйте код из блока справа вручную");
      }
    });
  }

  /* ---------- контакты: статус офиса ---------- */
  const openState = $("openState");
  if (openState) {
    const upd = () => {
      const d = new Date(), day = d.getDay(), h = d.getHours();
      const open = day >= 1 && day <= 5 && h >= 9 && h < 18;
      openState.innerHTML = `<span class="open-dot${open ? "" : " closed"}"></span>` +
        (open ? "Открыто · работаем до 18:00" : "Закрыто · откроемся в 9:00 (Пн–Пт)");
    };
    upd();
    setInterval(upd, 60000);
  }

  /* ---------- контакты: форма + список заявок ---------- */
  const form = $("reqForm");
  if (form) {
    const KEY = "izhtisi_requests";
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; } };
    const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {} };
    let reqs = load();

    /* смета из калькулятора приходит через адрес страницы */
    const q = new URLSearchParams(location.search);
    if (q.get("sum")) {
      $("fMsg").value = `Здравствуйте! Интересует: ${q.get("cfg") || "внедрение 1С"}. ` +
        `Ориентир по калькулятору: ${fmt(+q.get("sum"))} ₽. Прошу связаться со мной.`;
    }

    const list = $("reqList"), empty = $("reqEmpty");
    const renderList = () => {
      list.innerHTML = "";
      empty.style.display = reqs.length ? "none" : "";
      reqs.forEach((r) => {
        const li = document.createElement("li");
        li.className = "req";
        li.innerHTML =
          `<span class="req__num">${r.num}</span><span>${r.name}</span>` +
          `<span class="req__chip">Новая</span>` +
          (r.sum ? `<span class="req__chip">≈ ${fmt(r.sum)} ₽</span>` : "") +
          `<span class="req__date">${r.date}</span>`;
        const del = document.createElement("button");
        del.className = "req__del";
        del.textContent = "✕";
        del.setAttribute("aria-label", "Удалить заявку " + r.num);
        del.onclick = () => {
          const idx = reqs.indexOf(r);
          reqs.splice(idx, 1);
          save(reqs); renderList();
          showToast(`Заявка ${r.num} удалена`, "Отменить", () => {
            reqs.splice(Math.min(idx, reqs.length), 0, r);
            save(reqs); renderList();
          });
        };
        li.appendChild(del);
        list.appendChild(li);
      });
    };
    renderList();

    const err = (id, msg) => {
      const el = $(id);
      el.textContent = msg;
      const field = el.closest(".field");
      if (field) field.classList.toggle("invalid", !!msg);
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("fName").value.trim();
      const phone = $("fPhone").value.trim();
      const mail = $("fMail").value.trim();
      let ok = true;
      err("eName", ""); err("ePhone", ""); err("eMail", ""); err("eOk", "");
      if (name.length < 2) { err("eName", "Напишите имя (минимум 2 буквы)"); ok = false; }
      const phoneOk = /^[+\d()][\d\s()-]{5,}$/.test(phone);
      const mailOk = /^\S+@\S+\.\S+$/.test(mail);
      if (!phone && !mail) { err("ePhone", "Укажите телефон или почту →"); err("eMail", "← или почту"); ok = false; }
      else {
        if (phone && !phoneOk) { err("ePhone", "Телефон выглядит неверно"); ok = false; }
        if (mail && !mailOk) { err("eMail", "Почта выглядит неверно"); ok = false; }
      }
      if (!$("fOk").checked) { err("eOk", "Нужно согласие на обработку данных"); ok = false; }
      if (!ok) return;

      const num = "ИЖ-" + String(Date.now()).slice(-5);
      reqs.unshift({
        num, name,
        sum: q.get("sum") ? +q.get("sum") : 0,
        date: new Date().toLocaleDateString("ru-RU")
      });
      save(reqs); renderList();
      $("doneNum").textContent = num;
      $("formWrap").hidden = true;
      $("doneWrap").hidden = false;
      showToast(`Заявка ${num} принята ✓`);
    });
    $("newReq").addEventListener("click", () => {
      form.reset();
      $("doneWrap").hidden = true;
      $("formWrap").hidden = false;
      $("fName").focus();
    });
  }
})();