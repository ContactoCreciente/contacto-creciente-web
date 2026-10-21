/* ==========================================================
   CONTACTO CRECIENTE · main.js
   Orden del archivo:
   0) Ajustes iniciales      5) Revelados al hacer scroll
   1) Scroll suave (Lenis)   6) Inclinación 3D y botones imán
   2) Utilidades             7) Contadores
   3) Escena 3D (Three.js)   8) Simulador y Método CRECE
   4) Animación de entrada   9) Formulario de 3 pasos
                            10) Login del equipo
   ========================================================== */
(() => {
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn("GSAP no cargó: la página se muestra sin animaciones.");
    return;
  }

  /* ---------- 0) AJUSTES INICIALES ---------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // la barra del navegador móvil no descuadra el pin
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const WHATSAPP = "51922954610"; // número de la agencia (sin + ni espacios)

  /* ---------- 1) SCROLL SUAVE (LENIS) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);          // Lenis le avisa a ScrollTrigger
    gsap.ticker.add((t) => lenis.raf(t * 1000));        // GSAP mueve a Lenis en cada frame
    gsap.ticker.lagSmoothing(0);
  }
  // Los enlaces #sección bajan suavemente
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id.length > 1 ? $(id) : null;
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { offset: -90, duration: 1.4 }) : target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- 2) UTILIDADES ---------- */
  // Parte un texto en palabras (cada una dentro de una "máscara") para animarlas una a una
  function splitWords(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = p;
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return $$(".wi", el);
  }

  /* ---------- 3) ESCENA 3D (THREE.JS) ---------- */
  // Un solo objeto 3D vive detrás de toda la página y "viaja" de sección en sección.
  const Scene = (() => {
    const none = { pose() {}, pulse() {} };
    if (!window.THREE) return none;
    const canvas = $("#scene");
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
    catch (e) { canvas.style.display = "none"; return none; }

    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 9;

    scene.add(new THREE.AmbientLight(0x9fe9ff, 0.45));
    const lightA = new THREE.PointLight(0x2ee6c5, 1.6, 40); lightA.position.set(4, 3, 6); scene.add(lightA);
    const lightB = new THREE.PointLight(0x3b82f6, 1.2, 40); lightB.position.set(-5, -2, 4); scene.add(lightB);

    const master = new THREE.Group(); scene.add(master);   // todo lo que se mueve por la página
    const core = new THREE.Group(); master.add(core);       // lo que gira

    // Núcleo: icosaedro de alambre + icosaedro sólido por dentro
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x2ee6c5, wireframe: true, transparent: true, opacity: 0.6 });
    core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), wireMat));
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x0f2a47, emissive: 0x00a98f, emissiveIntensity: 0.25, metalness: 0.7, roughness: 0.3, flatShading: true, transparent: true });
    core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), innerMat));

    // Anillos orbitales
    const ringMats = [0x2ee6c5, 0x5aa9ff].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 }));
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.012, 8, 160), ringMats[0]);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 8, 160), ringMats[1]);
    ring1.rotation.x = Math.PI / 2.4; ring2.rotation.set(Math.PI / 3, 0.6, 0);
    core.add(ring1, ring2);

    // Partículas flotando alrededor
    const COUNT = innerWidth < 900 ? 600 : 1400;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 2.6 + Math.random() * 4.2, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x7ff3df, size: 0.035, transparent: true, opacity: 0.85, depthWrite: false });
    const points = new THREE.Points(pGeo, pMat); master.add(points);

    // Gráfico de barras que "crece" (solo se ve en el hero) + línea de tendencia
    const barsGroup = new THREE.Group(); barsGroup.position.set(0, -1.9, 1.3); master.add(barsGroup);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x00a98f, emissive: 0x00a98f, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.4, transparent: true });
    const BASE = [0.7, 1.0, 1.25, 1.6, 2.1];
    const bars = BASE.map((_, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), barMat);
      m.position.x = (i - 2) * 0.56; barsGroup.add(m); return m;
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xbafff2, transparent: true });
    barsGroup.add(new THREE.Line(lineGeo, lineMat));

    // "Poses": dónde y qué tan grande/visible está el objeto en cada sección
    // x e y son fracciones de media pantalla (-1 izquierda ... 1 derecha)
    const POSES = {
      hero:        { x: 0.42,  y: -0.02, s: 1.0,  op: 1,    bars: 1 },
      servicios:   { x: 0,     y: 0,     s: 2.7,  op: 0.10, bars: 0 },
      metodo:      { x: -0.52, y: -0.08, s: 1.05, op: 1,    bars: 0 },
      resultados:  { x: 0,     y: 0,     s: 2.5,  op: 0.09, bars: 0 },
      diferencia:  { x: 0.64,  y: 0.42,  s: 0.5,  op: 0.85, bars: 0 },
      diagnostico: { x: -0.15, y: 0,     s: 2.3,  op: 0.10, bars: 0 },
    };
    const state = { x: 0.42, y: 0, s: 1, op: 1, bars: 1, spin: 1 };
    let halfW = 1, halfH = 1, mobile = false;

    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z; halfW = halfH * camera.aspect;
      mobile = w < 900;
    }
    resize(); addEventListener("resize", resize);

    let current = "hero";
    function pose(name) {
      const p = POSES[name]; if (!p) return;
      current = name;
      const t = mobile ? { ...p, x: 0, s: p.s * 0.8, op: p.op * 0.4, bars: p.bars * 0.6 } : p;
      reduce ? Object.assign(state, t) : gsap.to(state, { ...t, duration: 1.5, ease: "power3.inOut", overwrite: "auto" });
    }
    function pulse() { if (!reduce) gsap.fromTo(state, { spin: 7 }, { spin: 1, duration: 1.8, ease: "power2.out" }); }

    // Ratón y scroll
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
    let rot = 0, scrollRot = 0, lastY = scrollY, last = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min((now - last) / 1000, 0.05); last = now; const time = now / 1000;
      mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
      scrollRot += (scrollY - lastY) * 0.0022; lastY = scrollY;
      if (!reduce) rot += dt * 0.16 * state.spin;

      master.position.set(state.x * halfW, -state.y * halfH, 0);
      master.scale.setScalar(Math.max(state.s, 0.01));
      master.rotation.y = mouse.sx * 0.5;
      core.rotation.y = rot + scrollRot;
      core.rotation.x = mouse.sy * 0.4 + Math.sin(time * 0.4) * 0.1;
      ring1.rotation.z = time * 0.2; ring2.rotation.z = -time * 0.15;
      points.rotation.y = time * 0.02 + scrollRot * 0.3;

      wireMat.opacity = 0.6 * state.op; innerMat.opacity = state.op;
      ringMats.forEach((m) => (m.opacity = 0.55 * state.op)); pMat.opacity = 0.85 * state.op;

      // barras: crecen y "respiran"
      barsGroup.visible = state.bars > 0.02;
      if (barsGroup.visible) {
        const arr = lineGeo.attributes.position.array;
        bars.forEach((b, i) => {
          const h = Math.max(BASE[i] * (0.8 + 0.2 * Math.sin(time * 0.9 + i)) * state.bars, 0.001);
          b.scale.y = h; b.position.y = h / 2;
          arr[i * 3] = b.position.x; arr[i * 3 + 1] = h + 0.15; arr[i * 3 + 2] = 0;
        });
        lineGeo.attributes.position.needsUpdate = true;
        barMat.opacity = 0.9 * state.bars * state.op; lineMat.opacity = state.bars * state.op;
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    addEventListener("resize", () => pose(current));
    pose("hero");
    return { pose, pulse };
  })();

  // Cada sección con data-pose le dice a la escena a dónde ir
  $$("[data-pose]").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 55%",
      onToggle: (self) => self.isActive && Scene.pose(sec.dataset.pose),
    });
  });

  // Enlace activo en el menú + barra de progreso
  // "Nosotros" agrupa Método CRECE, resultados y diferencia
  [["inicio", "inicio"], ["servicios", "servicios"], ["metodo", "metodo"],
   ["resultados", "metodo"], ["diferencia", "metodo"], ["diagnostico", "diagnostico"]].forEach(([id, target]) => {
    const sec = $("#" + id), link = $(`.nav-links a[href="#${target}"]`);
    if (!sec || !link) return;
    ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 55%",
      onToggle: (self) => { if (self.isActive) { $$(".nav-links a").forEach((a) => a.classList.remove("is-active")); link.classList.add("is-active"); } },
    });
  });
  gsap.to(".progress span", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0 } });

  // Luz que sigue al ratón
  if (canHover) {
    const glow = $(".cursor-glow");
    const gx = gsap.quickTo(glow, "x", { duration: 0.6, ease: "power3" });
    const gy = gsap.quickTo(glow, "y", { duration: 0.6, ease: "power3" });
    addEventListener("pointermove", (e) => { document.body.classList.add("has-mouse"); gx(e.clientX); gy(e.clientY); });
  }

  /* ---------- 3a) MENÚ MÓVIL ---------- */
  const nav = $(".nav"), navToggle = $("#navToggle");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open);
    navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    $("use", navToggle).setAttribute("href", open ? "#x" : "#menu");
  };
  navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

  /* ---------- 3b) CARRUSEL DE MARCAS ---------- */
  // Se duplica la fila para que el bucle no tenga cortes; la velocidad depende de cuántas marcas haya
  const marquee = $(".marquee-track");
  if (marquee && !reduce) {
    const n = marquee.children.length;
    [...marquee.children].forEach((li) => {
      const copy = li.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      marquee.appendChild(copy);
    });
    marquee.style.setProperty("--marquee-time", `${n * 4}s`);
  }

  /* ---------- 4) ANIMACIÓN DE ENTRADA (hero) ---------- */
  // Una sola secuencia coreografiada al cargar la página
  let introDone = reduce;
  if (!reduce) {
    const heroWords = splitWords($(".hero h1"));
    gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: () => (introDone = true) })
      .from(".nav", { yPercent: -100, duration: 0.8 })
      .from(".hero .eyebrow", { opacity: 0, y: 16, duration: 0.8 }, "-=0.4")
      .from(heroWords, { yPercent: 115, duration: 1.1, stagger: 0.07 }, "-=0.6")
      .from(".hero-lead", { opacity: 0, y: 16, duration: 0.8 }, "-=0.7")
      .from(".hero-actions .btn", { opacity: 0, y: 20, stagger: 0.1, duration: 0.7 }, "-=0.6")
      .from(".gcard", { opacity: 0, scale: 0.7, y: 40, stagger: 0.15, duration: 1, ease: "back.out(1.6)" }, "-=1")
      .from(".sim-box", { opacity: 0, y: 60, duration: 1 }, "-=0.7");
  }

  // Las tarjetas de cristal del hero se mueven en profundidad con el ratón
  if (canHover && !reduce) {
    const cards = $$(".gcard").map((el) => ({
      d: +el.dataset.depth || 20,
      qx: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3" }),
      qy: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3" }),
    }));
    addEventListener("pointermove", (e) => {
      if (!introDone) return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      cards.forEach((c) => { c.qx(-nx * c.d * 2); c.qy(-ny * c.d * 2); });
    });
    // flotar suave (propiedad CSS "translate", no choca con el parallax)
    $$(".gcard").forEach((c, i) => { c.style.animation = `bob ${5 + i * 1.3}s ease-in-out ${i * 0.4}s infinite`; });
  }

  /* ---------- 5) REVELADOS AL HACER SCROLL ---------- */
  if (!reduce) {
    // Títulos de sección: palabra por palabra
    $$(".split").forEach((h) => {
      if (h.closest(".hero")) return;
      const words = splitWords(h);
      gsap.from(words, { yPercent: 115, duration: 1, stagger: 0.05, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 85%", once: true } });
    });
    $$(".sec-head .eyebrow, .sec-head .sub, .diag-copy .eyebrow").forEach((el) => {
      gsap.from(el, { opacity: 0, y: 18, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });

    const group = (trigger, targets, vars = {}) =>
      gsap.from(targets, { opacity: 0, y: 70, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger, start: "top 82%", once: true }, ...vars });

    group(".services", ".svc", { y: 90, rotationX: -10, transformOrigin: "50% 100%", transformPerspective: 1200 });

    // Servicios: la sección se fija y al bajar (rueda o dedo) las tarjetas avanzan hacia la derecha
    let hScroll = null;
    const track = $(".services");
    if (track) {
      track.classList.add("is-h");
      const section = track.closest("section");
      const dist = () => track.scrollWidth - track.offsetWidth;
      hScroll = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: section, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
          refreshPriority: 1, // se calcula antes que los triggers de menú/escena creados más arriba
          // si la sección no cabe en pantalla, se fija cuando las tarjetas quedan enteras abajo
          start: () => (section.offsetHeight > innerHeight ? "bottom bottom" : "center center"),
          end: () => "+=" + dist(),
        },
      });
    }
    group(".phases", ".phase", { y: 40, stagger: 0.08 });
    group(".phase-view", ".phase-card");
    group(".stats", ".stat", { y: 40 });
    group(".case-box", ".case-box", { y: 60 });
    group(".brands", ".brands > *", { y: 30, stagger: 0.15 });
    group(".compare", ".cmp-row", { y: 24, stagger: 0.07 });
    group(".callout", ".callout", { y: 40 });
    group(".diag .form", ".diag .form", { y: 60 });
    group(".diag-bene", ".diag-bene li", { y: 20, stagger: 0.1 });
    group(".foot", ".foot > *", { y: 30, stagger: 0.08 });

    // Mini-paneles de servicio: se "llenan" al verlos
    // En modo horizontal se activan al entrar por la derecha, no al bajar
    const seen = (trigger) => hScroll
      ? { trigger, containerAnimation: hScroll, start: "left 85%", once: true }
      : { trigger, start: "top 85%", once: true };
    gsap.from(".f-bar", { scaleX: 0, duration: 1.2, stagger: 0.12, ease: "power3.out", scrollTrigger: seen(".v-funnel") });
    gsap.fromTo(".chart", { clipPath: "inset(-10% 100% -10% 0)" }, { clipPath: "inset(-10% 0% -10% 0)", duration: 1.8, ease: "power2.out", scrollTrigger: seen(".v-chart") });
    gsap.from(".b-swatches i", { scale: 0, duration: 0.6, stagger: 0.08, ease: "back.out(2)", scrollTrigger: seen(".v-brand") });
    gsap.from(".week span, .meet", { opacity: 0, y: 12, duration: 0.6, stagger: 0.07, ease: "power3.out", scrollTrigger: seen(".v-agenda") });
  }

  /* ---------- 6) INCLINACIÓN 3D Y BOTONES IMÁN ---------- */
  if (canHover && !reduce) {
    $$("[data-tilt]").forEach((el) => {
      const max = +el.dataset.tilt || 5;
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * max * 2);
        rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
    $$("[data-magnetic]").forEach((el) => {
      const mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
      const my = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.22); my((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener("pointerleave", () => { mx(0); my(0); });
    });
  }

  /* ---------- 7) CONTADORES ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (reduce) return;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: "power2.out", onUpdate: () => (el.textContent = pre + Math.round(o.v) + suf) }),
    });
  });

  /* ---------- 8a) SIMULADOR ---------- */
  const SIM = {
    pauta: {
      title: "Fuga de Presupuesto en Clics Basura",
      warn: "Hasta 60% del presupuesto desperdiciado",
      text: "Implementamos filtro MQL estricto y seguimiento a ventas en lugar de likes.",
      cta: "Auditar mi pauta publicitaria",
    },
    lentos: {
      title: "Leads que se Enfrían sin Seguimiento",
      warn: "Primer contacto en menos de 15 minutos",
      text: "Alineamos guiones y tiempos de respuesta para que ningún lead interesado se pierda.",
      cta: "Calibrar mi equipo de ventas",
    },
    curiosos: {
      title: "Tiempo Perdido con Prospectos sin Presupuesto",
      warn: "Hasta 70% del tiempo comercial desperdiciado",
      text: "Filtramos con criterio MQL antes de enviar cada lead al vendedor.",
      cta: "Filtrar mis prospectos",
    },
  };
  $$(".sim-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".sim-opt").forEach((b) => b.classList.toggle("is-on", b === btn));
      const d = SIM[btn.dataset.key];
      const apply = () => {
        $("#simTitle").textContent = d.title; $("#simWarn").textContent = d.warn;
        $("#simText").textContent = d.text; $("#simCta span").textContent = d.cta;
      };
      if (reduce) return apply();
      gsap.timeline()
        .to(".sim-res > *", { opacity: 0, y: -12, duration: 0.18, stagger: 0.03 })
        .add(apply)
        .fromTo(".sim-res > *", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "power3.out" });
    });
  });

  /* ---------- 8b) MÉTODO CRECE ---------- */
  const PHASES = [
    { l: "C", fase: "Comprender", title: "Comprender: Auditar Fugas", label: "Fase 1 de 5 · Semana 1", dur: "Semanas 1 y 2",
      quote: "“Inmersión analítica sin suposiciones ni complacencias.”", focus: "Enfoque: Diagnóstico profundo de ventas, finanzas comerciales y capacidad operativa.",
      d1: "Matriz de fugas del embudo", d2: "Mapa de perfiles del comité de compra" },
    { l: "R", fase: "Rediseñar", title: "Rediseñar: Un Embudo Hecho para Cerrar", label: "Fase 2 de 5 · Semanas 2 a 4", dur: "Semanas 2 a 4",
      quote: "“Un embudo diseñado desde la caja, no desde la creatividad.”", focus: "Enfoque: Definir qué es un lead calificado y qué pasa en cada etapa hasta el cierre.",
      d1: "Embudo comercial con criterios MQL", d2: "Guiones y reglas de calificación para ventas" },
    { l: "E", fase: "Ejecutar", title: "Ejecutar: Encender Captación", label: "Fase 3 de 5 · Mes 2", dur: "Mes 2",
      quote: "“Pauta con intención de compra, no con ganas de likes.”", focus: "Enfoque: Campañas de alta intención en Google Ads, Meta y LinkedIn.",
      d1: "Campañas activas con negativas blindadas", d2: "Tablero de costo por lead calificado" },
    { l: "C", fase: "Calibrar", title: "Calibrar: Afinar el Cierre", label: "Fase 4 de 5 · Cada semana", dur: "Cada semana",
      quote: "“Cada semana, números en vivo y decisiones concretas.”", focus: "Enfoque: Comités semanales con ventas, tiempos de respuesta y seguimiento.",
      d1: "Comité semanal con tablero en vivo", d2: "Ajuste de guiones y tiempos de respuesta" },
    { l: "E", fase: "Escalar", title: "Escalar: Duplicar lo que Da Caja", label: "Fase 5 de 5 · Mes 3 en adelante", dur: "Mes 3 en adelante",
      quote: "“Duplicamos lo que da caja y cortamos lo que no.”", focus: "Enfoque: Crecer solo en los canales que ya demostraron retorno.",
      d1: "Plan de escalamiento por canal rentable", d2: "Proyección de ingresos y punto de equilibrio" },
  ];
  const wrap = $("#phases");
  PHASES.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "phase" + (i === 0 ? " is-on" : ""); b.setAttribute("role", "tab");
    b.innerHTML = `<span class="letter">${p.l}</span><span class="name">${p.fase}</span>`;
    b.addEventListener("click", () => setPhase(i));
    wrap.appendChild(b);
  });
  let phaseIdx = 0;
  function setPhase(i) {
    if (i === phaseIdx) return;
    phaseIdx = i;
    $$(".phase", wrap).forEach((b, k) => b.classList.toggle("is-on", k === i));
    const p = PHASES[i];
    const apply = () => {
      $("#pLabel").textContent = p.label; $("#pDur").textContent = p.dur; $("#pTitle").textContent = p.title;
      $("#pQuote").textContent = p.quote; $("#pFocus").textContent = p.focus; $("#pD1").textContent = p.d1; $("#pD2").textContent = p.d2;
    };
    Scene.pulse(); // el objeto 3D da un giro rápido
    if (reduce) return apply();
    gsap.timeline()
      .to("#phaseCard", { opacity: 0, x: 24, duration: 0.2, ease: "power2.in" })
      .add(apply)
      .fromTo("#phaseCard", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" });
  }

  /* ---------- 9) FORMULARIO DE 3 PASOS ---------- */
  const form = $("#diagForm");
  let step = 1;
  const NEXT_LABEL = { 1: "Siguiente: Cuello de botella", 2: "Siguiente: Tus datos", 3: "Enviar por WhatsApp" };
  const answers = () => {
    const get = (n) => ($(`[data-name="${n}"] .is-on`, form) || {}).dataset?.val || "";
    return { rubro: get("rubro"), equipo: get("equipo"), desafio: get("desafio") };
  };
  $$("[data-name]", form).forEach((group) => {
    $$("button", group).forEach((b) => b.addEventListener("click", () => {
      $$("button", group).forEach((x) => x.classList.toggle("is-on", x === b));
    }));
  });
  function showStep(n) {
    step = n;
    $$(".step", form).forEach((s) => s.classList.toggle("is-on", +s.dataset.step === n));
    $$(".steps span", form).forEach((s, i) => s.classList.toggle("on", i === n - 1));
    gsap.to("#track", { width: (n / 3) * 100 + "%", duration: 0.6, ease: "power3.out" });
    $("#btnNext span").textContent = NEXT_LABEL[n];
    $("#btnBack").hidden = n === 1;
    $("#formErr").textContent = "";
    if (!reduce) gsap.from(`.step[data-step="${n}"] > *`, { opacity: 0, x: 30, duration: 0.5, stagger: 0.05, ease: "power3.out" });
  }
  $("#btnBack").addEventListener("click", () => step > 1 && showStep(step - 1));
  $("#btnNext").addEventListener("click", () => {
    if (step < 3) return showStep(step + 1);
    const nombre = form.nombre.value.trim(), empresa = form.empresa.value.trim(), wa = form.whatsapp.value.trim();
    if (nombre.length < 2) return ($("#formErr").textContent = "Escribe tu nombre para que sepamos a quién responder.");
    if (wa.replace(/\D/g, "").length < 7) return ($("#formErr").textContent = "Escribe un número de WhatsApp válido (mínimo 7 dígitos).");
    const a = answers();
    const msg = `Hola, soy ${nombre}${empresa ? " de " + empresa : ""}. Rubro: ${a.rubro}. Equipo de ventas: ${a.equipo}. Mi mayor desafío: ${a.desafio}. Mi WhatsApp: ${wa}. Quiero mi diagnóstico comercial.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    $("#btnNext span").textContent = "Abierto en WhatsApp. ¡Gracias!";
  });
  form.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); $("#btnNext").click(); } });

  /* ---------- 10) LOGIN DEL EQUIPO (solo diseño) ---------- */
  const login = $("#loginDialog"), loginForm = $("#loginForm"), loginErr = $("#loginErr");
  $("#btnLogin").addEventListener("click", () => {
    login.showModal();
    lenis?.stop();                                       // la página de fondo no se mueve
    if (!reduce) gsap.from(loginForm, { opacity: 0, y: 30, scale: 0.97, duration: 0.5, ease: "power3.out" });
  });
  login.addEventListener("close", () => { lenis?.start(); loginErr.textContent = ""; });
  $("#loginClose").addEventListener("click", () => login.close());
  login.addEventListener("click", (e) => { if (e.target === login) login.close(); }); // clic fuera = cerrar
  $("#loginForgot").addEventListener("click", (e) => {
    e.preventDefault();
    loginErr.textContent = "Pide a la administración que restablezca tu contraseña.";
  });
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const correo = loginForm.correo.value.trim(), clave = loginForm.clave.value;
    if (!/^\S+@\S+\.\S+$/.test(correo)) return (loginErr.textContent = "Escribe un correo válido.");
    if (clave.length < 6) return (loginErr.textContent = "La contraseña debe tener al menos 6 caracteres.");
    // Aquí irá la validación real (Supabase, Firebase, etc.)
    loginErr.textContent = "El acceso aún no está habilitado. Pronto podrás ingresar al panel.";
  });

  // Al terminar de cargar todo, recalcula las posiciones de ScrollTrigger
  addEventListener("load", () => ScrollTrigger.refresh());
})();
