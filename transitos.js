/* Portada de tránsitos de Wexipedia (REGLAS §9, 2026-11-19).
   Renderiza window.TRANSITOS, generado por herramientas/compilar.py a partir de
   cielo/ingresos.json. No calcula el cielo: solo presenta los ingresos ya
   calculados y las fichas. El cielo es calculado y sin autor. */
(function () {
  "use strict";
  const D = window.TRANSITOS;
  if (!D) return;
  const SIG = D.signos;
  const GLIFO = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  const ELEM = ["fuego", "tierra", "aire", "agua"];
  const MOD = ["cardinal", "fijo", "mutable"];
  const REGENTE = ["Marte", "Venus", "Mercurio", "Luna", "Sol", "Mercurio", "Venus", "Marte · Plutón", "Júpiter", "Saturno", "Saturno · Urano", "Júpiter · Neptuno"];
  const flag = i => `<span class="t-flag"><i class="el-${ELEM[i % 4]}"></i><i class="mod-${MOD[i % 3]}"></i></span>`;
  const casa = i => `Casa ${i + 1} · ${REGENTE[i]}`;
  const PL = {
    saturno: { n: "Saturno", g: "♄", per: "29,5 años; unos 2,5 por signo" },
    urano: { n: "Urano", g: "♅", per: "84 años; unos 7 por signo" },
    neptuno: { n: "Neptuno", g: "♆", per: "165 años; unos 14 por signo" },
    pluton: { n: "Plutón", g: "♇", per: "248 años; entre 12 y 30 por signo" }
  };
  const HOY = new Date();
  const HOYA = HOY.getFullYear() + (HOY.getMonth() + 0.5) / 12;
  const DESDE = D.desde || 1700;
  const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const t = e => e[0] + (e[1] - 1) / 12 + (e[2] - 1) / 365.25;
  const fmt = e => `${e[2]}-${e[1]}-${e[0]}`;
  const anyos = v => `${Math.floor(v.ini)}–${v.fin ? Math.floor(v.fin) : "…"}`;

  /* Un tramo de signo va de un ingreso al siguiente. Si el planeta vuelve al
     mismo signo en menos de 3 años (retrogradación), es la misma ventana: de la
     primera entrada a la salida definitiva. Misma regla que el prototipo. */
  function ventanas(pk) {
    const ev = (D.ingresos[PL[pk].n] || []).map(e => ({ t: t(e), f: fmt(e), a: SIG.indexOf(e[4]) }));
    const tr = [];
    ev.forEach((e, i) => {
      const n = ev[i + 1];
      tr.push({ s: e.a, ini: e.t, fi: e.f, fin: n ? n.t : null, ff: n ? n.f : null });
    });
    const V = [];
    tr.forEach(x => {
      let v = null;
      for (let i = V.length - 1; i >= 0; i--) if (V[i].s === x.s) { v = V[i]; break; }
      if (v && v.fin !== null && x.ini - v.fin < 3) {
        v.idas.push(`sale ${v.ff} · vuelve ${x.fi}`);
        v.fin = x.fin; v.ff = x.ff;
      } else {
        V.push({ s: x.s, ini: x.ini, fi: x.fi, fin: x.fin, ff: x.ff, idas: [] });
      }
    });
    return V
      .filter(v => (v.fin === null ? 9999 : v.fin) >= DESDE && v.ini <= HOYA)
      .sort((a, b) => a.ini - b.ini);
  }
  const CACHE = {};
  const V = pk => CACHE[pk] || (CACHE[pk] = ventanas(pk));
  const actual = pk => V(pk).find(v => v.ini <= HOYA && (v.fin === null || v.fin > HOYA));

  function nav(pk) {
    return `<nav class="t-nav"><a href="#/transitos" class="${pk ? "" : "on"}">Todos</a>` +
      Object.keys(PL).map(k => `<a href="#/transitos/${k}" class="${k === pk ? "on" : ""}">${PL[k].g} ${PL[k].n}</a>`).join("") +
      `<a href="#/eje" class="t-eje">Eje cronológico →</a></nav>`;
  }

  function cabecera(pk, titulo, sub) {
    return `<header class="t-cab"><div class="t-marca"><h1>Wexipedia · Tránsitos</h1><span>${esc(titulo || "El cielo calculado, sin autor")}</span></div>${nav(pk)}</header>` +
      `<main class="t-main">${sub ? `<p class="t-sub">${sub}</p>` : ""}`;
  }

  function leyenda() {
    return `<div class="t-leyenda">` + SIG.map((x, i) =>
      `<span>${flag(i)}<b>${GLIFO[i]} ${esc(x)}</b> · ${casa(i)}</span>`).join("") + `</div>` +
      `<p class="t-nota">Bandera: arriba el elemento (fuego, tierra, aire, agua); abajo la modalidad (cardinal, fijo, mutable).</p>`;
  }

  function portada() {
    const h = cabecera(null, "Los planetas lentos por los 12 signos",
      `Cada casilla dice cuántas veces ha recorrido el planeta ese signo desde ${DESDE} y los años de la última vuelta. ` +
      `El recuadro marca el signo de hoy. Pulsa un signo para ver todas sus vueltas con los hechos de Wexipedia.`);
    let s = `<div class="t-scroll"><table class="t-tabla t-portada"><thead><tr><th></th>` +
      SIG.map((x, i) => `<th style="border-top-color:var(--el-${ELEM[i % 4]})" title="${casa(i)}">${flag(i)}<span class="t-gl" style="color:var(--el-${ELEM[i % 4]})">${GLIFO[i]}</span>${esc(x)}</th>`).join("") +
      `</tr></thead><tbody>`;
    for (const k in PL) {
      const vv = V(k), hoy = actual(k);
      s += `<tr><th class="t-planeta"><a href="#/transitos/${k}">${PL[k].g} ${PL[k].n}</a><br><span>${PL[k].per}</span></th>`;
      SIG.forEach((x, i) => {
        const w = vv.filter(v => v.s === i);
        s += w.length
          ? `<td class="${hoy && hoy.s === i ? "t-ahora" : ""}"><a href="#/transitos/${k}/${slug(x)}"><b>${w.length}</b><br><span>${anyos(w[w.length - 1])}</span></a></td>`
          : `<td class="t-vac">—</td>`;
      });
      s += `</tr>`;
    }
    s += `</tbody></table></div>`;
    s += leyenda();
    s += `<p class="t-nota">Rango: de ${DESDE} a hoy, más las ventanas que siguen abiertas. Solo Saturno, Urano, Neptuno y Plutón; Júpiter no entra. ` +
      `Plutón se calcula con la tabla diaria de JPL Horizons (baricentro del sistema, ID 9) de 1599 a 1890 y con el motor desde 1885; ` +
      `en el solape 1885–1890 la diferencia máxima es 0,0212°. El cielo es calculado y no tiene autor: no hay carta natal.</p>`;
    s += `<p class="t-nota"><a href="#/eje">Ver la cronología completa en el eje →</a></p>`;
    return h + s + `</main>`;
  }

  function planeta(pk) {
    const vv = V(pk), hoy = actual(pk);
    let h = cabecera(pk, `${PL[pk].g} ${PL[pk].n} por los 12 signos`,
      `Vuelta completa: ${PL[pk].per}. Cada fila es una vuelta, de Aries a Piscis; leyendo una columna hacia abajo ves todas las veces que ha estado en ese signo.`);
    // Banda de un vistazo: una barra por ventana, colocada por año.
    const ini = Math.max(DESDE, Math.floor(vv.length ? vv[0].ini : DESDE));
    const fin = Math.max(HOYA, ...vv.map(v => v.fin || HOYA));
    const ancho = Math.max(1, fin - ini);
    h += `<div class="t-banda" aria-hidden="true">` +
      vv.map(v => {
        const a = Math.max(0, (Math.max(v.ini, ini) - ini) / ancho * 100);
        const b = Math.min(100, ((v.fin || HOYA) - ini) / ancho * 100);
        return `<i class="t-barra${v === hoy ? " t-barra-ahora" : ""}" style="left:${a.toFixed(3)}%;width:${Math.max(0.25, b - a).toFixed(3)}%;top:${2 + (v.s % 6) * 5}px;background:linear-gradient(to bottom,var(--el-${ELEM[v.s % 4]}) 0 50%,var(--mod-${MOD[v.s % 3]}) 50% 100%)" title="${SIG[v.s]} · ${anyos(v)}"></i>`;
      }).join("") +
      `</div><div class="t-anios"><span>${ini}</span><span>${Math.round((ini + fin) / 2)}</span><span>${Math.floor(fin)}</span></div>`;
    const filas = [];
    let f = null, ult = -1;
    vv.forEach(v => {
      if (!f || v.s < ult) { f = new Array(12).fill(null); filas.push(f); }
      f[v.s] = v; ult = v.s;
    });
    h += `<div class="t-scroll"><table class="t-tabla"><thead><tr><th>Vuelta</th>` +
      SIG.map((x, i) => `<th style="border-top-color:var(--el-${ELEM[i % 4]})" title="${casa(i)}"><a href="#/transitos/${pk}/${slug(x)}">${flag(i)}<span class="t-gl" style="color:var(--el-${ELEM[i % 4]})">${GLIFO[i]}</span>${esc(x)}</a></th>`).join("") +
      `</tr></thead><tbody>`;
    filas.forEach((r, n) => {
      h += `<tr><th>${n + 1}</th>` + r.map((v, i) => v
        ? `<td class="${v === hoy ? "t-ahora" : ""}"><a href="#/transitos/${pk}/${slug(SIG[i])}">${anyos(v)}</a></td>`
        : `<td class="t-vac">—</td>`).join("") + `</tr>`;
    });
    h += `</tbody></table></div>`;
    h += leyenda();
    if (hoy) h += `<p class="t-nota">Ahora: <b>${PL[pk].n} en ${SIG[hoy.s]}</b>, ${anyos(hoy)}. ` +
      `<a href="#/transitos/${pk}/${slug(SIG[hoy.s])}">Ver esta vuelta con sus hechos →</a></p>`;
    return h + `</main>`;
  }

  function signo(pk, sg, q) {
    const i = SIG.findIndex(x => slug(x) === sg);
    if (i < 0) return planeta(pk);
    const per = q.get("personas") === "1";
    const vv = V(pk).filter(v => v.s === i);
    let h = cabecera(pk, `${PL[pk].g} ${PL[pk].n} en ${GLIFO[i]} ${SIG[i]}`,
      `${flag(i)} ${vv.length} vueltas desde ${DESDE}, una al lado de otra y alineadas por el año dentro de la ventana. Cada hecho abre su ficha en el eje. ${casa(i)}.`);
    h += `<div class="t-filtros"><label><input type="checkbox" id="t-per" ${per ? "checked" : ""}> Incluir personas nacidas en la ventana</label>` +
      `<span>${SIG.map((x, j) => `<a href="#/transitos/${pk}/${slug(x)}${per ? "?personas=1" : ""}" style="color:var(--el-${ELEM[j % 4]});${j === i ? "font-weight:700" : ""}">${GLIFO[j]}</a>`).join(" ")}</span></div>`;
    if (!vv.length) {
      h += `<p class="t-vacio">Ninguna vuelta de ${PL[pk].n} por ${SIG[i]} desde ${DESDE}.</p>`;
    } else {
      h += `<div class="t-cols">`;
      vv.forEach(v => {
        const fin = v.fin || HOYA;
        const dentro = D.fichas
          .filter(f => (f[2] !== "persona" || per) && f[4] >= Math.floor(v.ini) && f[4] <= Math.floor(fin))
          .sort((a, b) => a[4] - b[4] || a[1].localeCompare(b[1]));
        h += `<section class="t-col" style="border-top:3px solid var(--el-${ELEM[i % 4]})"><div class="t-col-cab"><h3>${anyos(v)}</h3>` +
          `<a class="t-eje-mini" href="#/eje?desde=${Math.floor(v.ini)}&hasta=${Math.floor(fin)}">ver en el eje →</a></div>` +
          `<div class="t-fechas">entra ${v.fi}${v.ff ? ` · sale ${v.ff}` : " · en curso"}</div>`;
        if (v.idas.length) h += `<div class="t-idas">Retrogradación: ${v.idas.map(esc).join(" · ")}</div>`;
        if (!dentro.length) h += `<p class="t-nota">Ningún hecho de Wexipedia en esta ventana.</p>`;
        let ya = null;
        dentro.forEach(f => {
          const a = f[4];
          if (a !== ya) { h += `<div class="t-ano">${a} · año ${a - Math.floor(v.ini) + 1}</div>`; ya = a; }
          const cls = f[2] === "persona" ? "t-persona" : `t-${f[3]}`;
          h += `<a class="t-f ${cls}${f[7] ? "" : " t-borr"}" href="#${esc(f[0])}" title="${f[7] ? "aprobada" : "borrador"}">${esc(f[1])}` +
            `${f[6] ? ` <small>aprox.</small>` : ""}${f[7] ? "" : ` <small>borrador</small>`}</a>`;
        });
        h += `</section>`;
      });
      h += `</div>`;
    }
    h += `<p class="t-nota">Solo se cuenta la fecha de inicio de cada hecho. Ingresos calculados con el motor de la capa Cielo (VSOP87D; Plutón con JPL Horizons hasta 1890), en UT y al día. ` +
      `El cielo es calculado y sin autor; no se usa ninguna carta natal.</p>`;
    return h + `</main>`;
  }

  function render(hash) {
    const raw = (hash || location.hash || "#/transitos").replace(/^#/, "");
    const [p, qs] = raw.split("?");
    const q = new URLSearchParams(qs || "");
    const r = p.split("/").filter(Boolean);
    const cont = document.getElementById("transitos");
    if (!cont) return;
    if (r[0] !== "transitos" || !r[1] || !PL[r[1]]) {
      cont.innerHTML = portada();
      return;
    }
    cont.innerHTML = r[2] ? signo(r[1], r[2], q) : planeta(r[1]);
    const per = document.getElementById("t-per");
    if (per) per.onchange = e => {
      location.hash = `#/transitos/${r[1]}/${r[2]}${e.target.checked ? "?personas=1" : ""}`;
    };
    window.scrollTo(0, 0);
  }

  window.TRANSITOS_APP = { render, ventanas: V, actual };
})();
