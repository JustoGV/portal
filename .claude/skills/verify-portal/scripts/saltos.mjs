// Chequeo de saltos de línea (regla global del 2026-10-26): corta con lugar, palabra sola abajo, línea que termina en
// palabra de enlace, texto que se sale. Corre adentro de la página con page.evaluate(revisar, [ENLACE, selector]).
export const ENLACE = "a al ante con como de del desde e el en entre es hasta la las le lo los mi más muy no ni o para pero por que se sin sobre su sus tu tus te u un una unos unas y".split(" ");

export function revisar([enlace, solo]) {
  const SEL = "h1,h2,h3,h4,p,li,dd,dt,button,a,label,figcaption";
  const out = [];
  const visible = (el) => {
    if (el.closest("[aria-hidden='true'],.sr-solo,[hidden]")) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && Number(s.opacity) > 0.05 && s.whiteSpace !== "nowrap";
  };
  // adentro de un contenedor que corre de costado (overflow-x auto/scroll) el texto fuera de la pantalla es a propósito
  const enCarril = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (a.matches("[data-carril]") || /auto|scroll/.test(getComputedStyle(a).overflowX)) return true;
    }
    return false;
  };
  const raices = solo ? [...document.querySelectorAll(solo)] : [document.body];
  const els = raices.flatMap((r) => [...r.querySelectorAll(SEL)]);
  // 4. texto que no corta (nowrap) y se sale de la pantalla
  for (const r of raices)
    for (const el of r.querySelectorAll(`${SEL},span`)) {
      if (el.closest("[aria-hidden='true'],.sr-solo,[hidden]") || getComputedStyle(el).whiteSpace !== "nowrap") continue;
      const b = el.getBoundingClientRect();
      if (b.width > 2 && b.height > 2 && b.top < innerHeight * 50 && (b.right > innerWidth + 1 || b.left < -1) && !enCarril(el))
        out.push(`se sale de la pantalla: ${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 60)}»`);
    }
  for (let k = 0; k < els.length; k++) {
    const el = els[k];
    if (!visible(el)) continue;
    // flex/grid: sus partes van una al lado de la otra a propósito; se revisan por separado
    if (/flex|grid/.test(getComputedStyle(el).display)) continue;
    // si adentro hay renglones de bloque (spans con display:block), se revisa cada uno por separado
    const renglones = [...el.querySelectorAll("span")].filter((s) => getComputedStyle(s).display === "block" && !s.querySelector("span") && s.textContent.trim().includes(" "));
    if (renglones.length) {
      for (const s of renglones) els.push(s);
      continue;
    }
    // solo el bloque de texto más interno: si adentro hay otro bloque de la lista, se revisa ese.
    // Un link en medio del párrafo (inline) no cuenta: el párrafo se revisa entero (antes se salteaba
    // y "…donde / comprás. Sacá turno por WhatsApp." pasó como 0, 2026-10-27)
    if ([...el.querySelectorAll(SEL)].some((c) => getComputedStyle(c).display !== "inline")) continue;
    const texto = el.textContent.replace(/\s+/g, " ").trim();
    if (texto.split(" ").length < 2) continue;
    // palabras y su línea
    const palabras = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement.closest(".sr-solo,[aria-hidden='true']")) continue;
      const re = /[^\s ]+/g;
      let m;
      while ((m = re.exec(n.data))) {
        const rg = document.createRange();
        rg.setStart(n, m.index);
        rg.setEnd(n, m.index + m[0].length);
        const rects = rg.getClientRects();
        if (!rects.length) continue;
        palabras.push({ w: m[0], top: Math.round(rects[0].top), right: rects[rects.length - 1].right, sep: n.data[m.index + m[0].length] });
      }
    }
    if (palabras.length < 2) continue;
    // 4b. una palabra (o un grupo pegado con espacio duro) que se sale de su caja o de la pantalla
    // dentro de un carril que corre de costado (data-carril) el texto está fuera de la pantalla a propósito: se mide contra su caja
    const caja = el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
    const borde = enCarril(el) ? caja : Math.min(innerWidth, caja);
    if (palabras.some((p) => p.right > borde + 1)) out.push(`se sale de la pantalla: ${el.tagName.toLowerCase()} «${el.textContent.replace(/\s+/g, " ").trim().slice(0, 60)}»`);
    const lineas = [];
    for (const p of palabras) {
      const ult = lineas[lineas.length - 1];
      if (ult && Math.abs(ult.top - p.top) < 8) ult.w.push(p);
      else lineas.push({ top: p.top, w: [p] });
    }
    if (lineas.length < 2) continue;
    const id = `${el.tagName.toLowerCase()} «${texto.slice(0, 60)}»`;
    // renglones armados a propósito (un hijo en bloque, p. ej. "Nuestros / servicios" en el celular)
    const bloques = [...el.children].some((c) => /block|flex|grid/.test(getComputedStyle(c).display) && !c.matches(".sr-solo"));
    // 2. palabra sola abajo (si no es un renglón armado a propósito)
    if (!bloques && lineas[lineas.length - 1].w.length === 1) out.push(`palabra sola: ${id}`);
    // 3. línea que termina en palabra de enlace (pegada con espacio duro no cuenta)
    for (const l of lineas.slice(0, -1)) {
      const fin = l.w[l.w.length - 1].w.toLowerCase().replace(/[«“¿¡(]/g, "");
      if (enlace.includes(fin)) out.push(`termina en «${fin}»: ${id}`);
    }
    // 1. corta teniendo lugar (no aplica si adentro hay bloques: son dos líneas a propósito)
    if (bloques) continue;
    const clon = el.cloneNode(true);
    Object.assign(clon.style, { position: "absolute", visibility: "hidden", whiteSpace: "nowrap", width: "auto", maxWidth: "none", left: "-9999px", top: "0" });
    el.parentElement.appendChild(clon);
    const ancho = clon.getBoundingClientRect().width;
    clon.remove();
    const cont = el.parentElement.getBoundingClientRect().width;
    const ps = getComputedStyle(el.parentElement);
    const libre = cont - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) - parseFloat(ps.borderLeftWidth) - parseFloat(ps.borderRightWidth); // el borde también ocupa
    if (ancho <= libre - 1 && getComputedStyle(el.parentElement).display !== "flex") out.push(`corta con lugar (${Math.round(ancho)} de ${Math.round(libre)} px): ${id}`);
  }
  return out;
}

