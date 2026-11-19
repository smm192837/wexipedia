/* Capa «Cielo» de Wexipedia: el mismo cálculo que herramientas/efemerides.py, en el
   navegador. Se calcula al vuelo, no se lee de una tabla.

   - VSOP87D (IMCCE, dominio público) para Mercurio a Neptuno
   - ELP2000-82B truncada (Meeus cap. 47) para la Luna
   - ΔT de Espenak y Meeus; nutación; tiempo de luz
   - Estrellas: posición J2000 + movimiento propio + precesión a la fecha

   Datos en window.CIELO_DATOS (cielo-datos.js, generado por herramientas/compilar_cielo.py).
   Validado contra la versión de Python: si no coincide, no se publica. */
(function () {
  "use strict";
  const DATOS = window.CIELO_DATOS || {};
  const R = Math.PI / 180;
  const U = 0.0057755183;
  const TROPICO = 2451545.0;
  const VSOP = DATOS.vsop || {};
  const LUNA = DATOS.luna || { lr: [], b: [] };
  const PLUTON = DATOS.pluton || null;  // tabla diaria de Horizons (1599-1890)
  const CUERPOS = ["Mercurio", "Venus", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno"];
  const CODIGO = { Mercurio: "mer", Venus: "ven", Marte: "mar", "Júpiter": "jup", Saturno: "sat", Urano: "ura", Neptuno: "nep" };
  const SIGNOS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Esc", "Sag", "Cap", "Acu", "Pis"];

  function jdDesdeFecha(y, m, d, hora) {
    hora = hora || 0;
    if (m <= 2) { y -= 1; m += 12; }
    const gregoriano = (y > 1582) || (y === 1582 && (m > 10 || (m === 10 && d >= 15)));
    const A = Math.floor(y / 100);
    const B = gregoriano ? 2 - A + Math.floor(A / 4) : 0;
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + hora / 24;
  }

  function fechaDesdeJd(jd) {
    jd += 0.5;
    let Z = Math.floor(jd), F = jd - Z, A = Z;
    if (Z >= 2299161) { const a = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + a - Math.floor(a / 4); }
    const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), Dd = Math.floor(365.25 * C);
    const E = Math.floor((B - Dd) / 30.6001);
    const dia = B - Dd - Math.floor(30.6001 * E) + F;
    const mes = E < 14 ? E - 1 : E - 13;
    const anyo = mes > 2 ? C - 4716 : C - 4715;
    return [anyo, mes, dia];
  }

  function deltaT(y) {
    let u, t;
    if (y < -500) { u = (y - 1820) / 100; return -20 + 32 * u * u; }
    if (y < 500) { u = y / 100; return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3 - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6; }
    if (y < 1600) { u = (y - 1000) / 100; return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3 - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6; }
    if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129; }
    if (y < 1800) { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
    if (y < 1860) { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
    if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y < 2150) { u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y); }
    u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }

  const anioDecimal = (y, m) => y + (m - 0.5) / 12;

  function julianoTT(jdUtc, y, m) { return jdUtc + deltaT(anioDecimal(y, m)) / 86400; }

  function nutacionLon(jdTT) {
    const T = (jdTT - TROPICO) / 36525;
    const om = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000) * R;
    const ls = (280.4665 + 36000.7698 * T) * R;
    const lm = (218.3165 + 481267.8813 * T) * R;
    const arc = -17.2 * Math.sin(om) - 1.32 * Math.sin(2 * ls) - 0.23 * Math.sin(2 * lm) + 0.21 * Math.sin(2 * om);
    return arc / 3600;
  }

  function serie(terminos, T) {
    let total = 0;
    for (let i = 0; i < terminos.length; i++) {
      const t = terminos[i];
      total += t[1] * Math.cos(t[2] + t[3] * T) * Math.pow(T, t[0]);
    }
    return total;
  }

  function helio(codigo, jdTT) {
    const T = (jdTT - TROPICO) / 365250;
    const d = VSOP[codigo];
    return [serie(d.L, T), serie(d.B, T), serie(d.R, T)];
  }

  function vector(codigo, jdTT) {
    const h = helio(codigo, jdTT);
    return [h[2] * Math.cos(h[1]) * Math.cos(h[0]), h[2] * Math.cos(h[1]) * Math.sin(h[0]), h[2] * Math.sin(h[1])];
  }

  function luna(jdTT) {
    const T = (jdTT - TROPICO) / 36525;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000;
    const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000;
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T, A3 = 313.45 + 481266.484 * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let sl = 0, sr = 0, sb = 0;
    for (const [d, mm, mp, ff, cl, cr] of LUNA.lr) {
      const arg = (d * D + mm * M + mp * Mp + ff * F) * R;
      const e = Math.pow(E, Math.abs(mm));
      sl += cl * e * Math.sin(arg);
      sr += cr * e * Math.cos(arg);
    }
    for (const [d, mm, mp, ff, cb] of LUNA.b) {
      const arg = (d * D + mm * M + mp * Mp + ff * F) * R;
      sb += cb * Math.pow(E, Math.abs(mm)) * Math.sin(arg);
    }
    sl += 3958 * Math.sin(A1 * R) + 1962 * Math.sin((Lp - F) * R) + 318 * Math.sin(A2 * R);
    sb += -2235 * Math.sin(Lp * R) + 382 * Math.sin(A3 * R) + 175 * Math.sin((A1 - F) * R)
        + 175 * Math.sin((A1 + F) * R) + 127 * Math.sin((Lp - Mp) * R) - 115 * Math.sin((Lp + Mp) * R);
    return [(Lp + sl / 1e6 + nutacionLon(jdTT)) % 360, sb / 1e6, 385000.56 + sr / 1000];
  }

  const norm = x => ((x % 360) + 360) % 360;

  /* Tabla diaria de JPL Horizons (cielo/pluton-horizons.json, 1599-1890). Antes de
     1885 el motor no calcula Plutón; la tabla usa el baricentro del sistema (9),
     comprobado contra el centro de Plutón (999) en el solape 1800-1890. */
  function plutonTabla(jdUtc) {
    if (!PLUTON || !PLUTON.lon) return null;
    const x = jdUtc - PLUTON.jd0;
    if (x < 0 || x > PLUTON.lon.length - 1) return null;
    const i = Math.floor(x), f = x - i;
    const a = PLUTON.lon[i];
    if (f === 0 || i === PLUTON.lon.length - 1) return norm(a);
    const b = PLUTON.lon[i + 1];
    return norm(a + ((((b - a + 180) % 360) + 360) % 360 - 180) * f);
  }

  function pluton(jdUtc, y, m) {
    if (y == null) [y, m] = fechaDesdeJd(jdUtc);
    const tabla = plutonTabla(jdUtc);
    if (tabla !== null) return tabla;
    if (y < 1885 || y > 2099) return null;
    const d = jdUtc - 2451543.5;
    const S = 50.03 + 0.033459652 * d, P = 238.95 + 0.003968789 * d;
    const lp = 238.9508 + 0.00400703 * d - 19.799 * Math.sin(P * R) + 19.848 * Math.cos(P * R) + 0.897 * Math.sin(2 * P * R)
      - 4.956 * Math.cos(2 * P * R) + 0.61 * Math.sin(3 * P * R) + 1.211 * Math.cos(3 * P * R) - 0.341 * Math.sin(4 * P * R)
      - 0.19 * Math.cos(4 * P * R) + 0.128 * Math.sin(5 * P * R) - 0.034 * Math.cos(5 * P * R) - 0.038 * Math.sin(6 * P * R)
      + 0.031 * Math.cos(6 * P * R) + 0.02 * Math.sin((S - P) * R) - 0.01 * Math.cos((S - P) * R);
    const bp = -3.9082 - 5.453 * Math.sin(P * R) - 14.975 * Math.cos(P * R) + 3.527 * Math.sin(2 * P * R) + 1.673 * Math.cos(2 * P * R)
      - 1.051 * Math.sin(3 * P * R) + 0.328 * Math.cos(3 * P * R) + 0.179 * Math.sin(4 * P * R) - 0.292 * Math.cos(4 * P * R)
      + 0.019 * Math.sin(5 * P * R) + 0.1 * Math.cos(5 * P * R) - 0.031 * Math.sin(6 * P * R) - 0.026 * Math.cos(6 * P * R)
      + 0.011 * Math.cos((S - P) * R);
    const rp = 40.72 + 6.68 * Math.sin(P * R) + 6.9 * Math.cos(P * R) - 1.18 * Math.sin(2 * P * R) - 0.03 * Math.cos(2 * P * R)
      + 0.15 * Math.sin(3 * P * R) - 0.14 * Math.cos(3 * P * R);
    const jdTT = julianoTT(jdUtc, y, m);
    const e = vector("ear", jdTT);
    const x = rp * Math.cos(bp * R) * Math.cos(lp * R) - e[0];
    const yy = rp * Math.cos(bp * R) * Math.sin(lp * R) - e[1];
    return norm(Math.atan2(yy, x) / R + nutacionLon(jdTT));
  }

  function posiciones(jdUtc, y, m) {
    const jdTT = julianoTT(jdUtc, y, m);
    const dpsi = nutacionLon(jdTT);
    const tierra = vector("ear", jdTT);
    let sol = [-tierra[0], -tierra[1], -tierra[2]];
    for (let i = 0; i < 3; i++) {
      const r = Math.hypot(sol[0], sol[1], sol[2]);
      const t2 = vector("ear", jdTT - r * U);
      sol = [-t2[0], -t2[1], -t2[2]];
    }
    const pos = { Sol: (Math.atan2(sol[1], sol[0]) / R + dpsi + 360) % 360 };
    for (const nombre of CUERPOS) {
      const cod = CODIGO[nombre];
      let p = vector(cod, jdTT);
      for (let i = 0; i < 3; i++) {
        const v = [p[0] - tierra[0], p[1] - tierra[1], p[2] - tierra[2]];
        const r = Math.hypot(v[0], v[1], v[2]);
        p = vector(cod, jdTT - r * U);
      }
      const v = [p[0] - tierra[0], p[1] - tierra[1], p[2] - tierra[2]];
      pos[nombre] = (Math.atan2(v[1], v[0]) / R + dpsi + 360) % 360;
    }
    pos.Luna = luna(jdTT)[0];
    const plu = pluton(jdUtc, y, m);
    if (plu !== null) pos["Plutón"] = plu;
    return pos;
  }

  /* Un solo cuerpo, con el mismo cálculo que posiciones() (tiempo de luz, nutación).
     Sirve para barrer muchos días sin calcular los diez cuerpos cada vez (tabla de
     tránsitos). Comprobado contra posiciones(): diferencia 0. Sin Luna. */
  function longitudCuerpo(nombre, jdUtc, y, m) {
    if (nombre === "Plutón") return pluton(jdUtc, y, m);
    const jdTT = julianoTT(jdUtc, y, m);
    const dpsi = nutacionLon(jdTT);
    const tierra = vector("ear", jdTT);
    if (nombre === "Sol") {
      let sol = [-tierra[0], -tierra[1], -tierra[2]];
      for (let i = 0; i < 3; i++) {
        const r = Math.hypot(sol[0], sol[1], sol[2]);
        const t2 = vector("ear", jdTT - r * U);
        sol = [-t2[0], -t2[1], -t2[2]];
      }
      return (Math.atan2(sol[1], sol[0]) / R + dpsi + 360) % 360;
    }
    const cod = CODIGO[nombre];
    if (!cod) return null;
    let p = vector(cod, jdTT);
    for (let i = 0; i < 3; i++) {
      const v = [p[0] - tierra[0], p[1] - tierra[1], p[2] - tierra[2]];
      const r = Math.hypot(v[0], v[1], v[2]);
      p = vector(cod, jdTT - r * U);
    }
    const v = [p[0] - tierra[0], p[1] - tierra[1], p[2] - tierra[2]];
    return (Math.atan2(v[1], v[0]) / R + dpsi + 360) % 360;
  }

  /* ---------- estrellas ---------- */
  function oblicuidad(jd) {
    const T = (jd - TROPICO) / 36525;
    return 23.43929111 - 0.0130041667 * T - 1.6389e-7 * T * T + 5.0361e-7 * T ** 3;
  }

  function precesar(ra, dec, jdDesde, jdA) {
    const T = (jdA - jdDesde) / 36525;
    const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600;
    const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) / 3600;
    const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600;
    const a = Math.cos(dec * R) * Math.sin((ra + zeta) * R);
    const b = Math.cos(th * R) * Math.cos(dec * R) * Math.cos((ra + zeta) * R) - Math.sin(th * R) * Math.sin(dec * R);
    const c = Math.sin(th * R) * Math.cos(dec * R) * Math.cos((ra + zeta) * R) + Math.cos(th * R) * Math.sin(dec * R);
    return [(Math.atan2(a, b) / R + z + 360) % 360, Math.asin(c) / R];
  }

  function ecliptica(ra, dec, eps) {
    const x = Math.cos(dec * R) * Math.cos(ra * R);
    const yy = Math.cos(dec * R) * Math.sin(ra * R);
    const z = Math.sin(dec * R);
    const ye = yy * Math.cos(eps * R) + z * Math.sin(eps * R);
    const ze = -yy * Math.sin(eps * R) + z * Math.cos(eps * R);
    return [(Math.atan2(ye, x) / R + 360) % 360, Math.asin(ze) / R];
  }

  function longitudEstrella(est, jd) {
    const anios = (jd - TROPICO) / 365.25;
    const ra = est.ra + est.pmra * anios / 3.6e6;
    const dec = est.dec + est.pmdec * anios / 3.6e6;
    const p = precesar(ra, dec, TROPICO, jd);
    return ecliptica(p[0], p[1], oblicuidad(jd))[0];
  }

  function signo(lon) {
    const x = ((lon % 360) + 360) % 360;
    return `${Math.floor(x % 30)}°${SIGNOS[Math.floor(x / 30)]}`;
  }

  const ESTRELLAS = DATOS.estrellas || [];
  const ROBSON = DATOS.robson || [];

  /* Qué entrada de Robson corresponde a cada estrella del catálogo. Viene en los datos
     (cielo/robson-hyg.json → compilar_cielo.py): la decidió herramientas/emparejar_robson.py
     con la constelación de la cabecera del libro y el grado impreso para 1920, ≤0,2°. Antes se
     emparejaba solo por el grado dentro del signo y 136 de 156 estrellas recibían el texto de
     otra (Spica el de Agena). La que no está aquí no tiene entrada de Robson legible: se dice,
     no se rellena. */
  const ROBSON_HYG = DATOS.robsonHyg || {};

  function robsonDe(est) {
    const nombreLibro = ROBSON_HYG[est.nombre];
    if (!nombreLibro) return null;
    const r = ROBSON.find(x => x.nombre === nombreLibro && x.grados != null);
    if (!r) return null;
    const dentro = longitudEstrella(est, jdDesdeFecha(1920, 1, 1, 12)) % 30;
    const desvio = Math.abs(((r.grados - dentro + 15) % 30 + 30) % 30 - 15);
    if (desvio > 0.2) return null;
    return { nombre: r.nombre, naturaleza: r.naturaleza, influencia: r.influencia, desvio };
  }

  function estrellasCerca(jd, orbe, magMax) {
    orbe = orbe == null ? 1 : orbe;
    magMax = magMax == null ? 3 : magMax;
    const [y, m] = fechaDesdeJd(jd);
    const pos = posiciones(jd, y, m);
    const salida = [];
    for (const est of ESTRELLAS) {
      if (est.mag > magMax) continue;
      const lon = longitudEstrella(est, jd);
      for (const cuerpo in pos) {
        const d = Math.abs(((lon - pos[cuerpo]) % 360 + 540) % 360 - 180); // vale también cerca de 0° Aries
        if (d <= orbe) salida.push({ cuerpo, estrella: est, orbe: d, lon, robson: robsonDe(est) });
      }
    }
    return salida.sort((a, b) => a.orbe - b.orbe);
  }

  window.MOTOR = { posiciones, longitudCuerpo, jdDesdeFecha, fechaDesdeJd, signo, estrellasCerca, longitudEstrella, robsonDe,
                   ESTRELLAS, deltaT, nutacionLon };
})();
