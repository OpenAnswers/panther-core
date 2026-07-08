// @ts-nocheck
// Minimal replacement for the abandoned jquery-highlightRegex plugin.
// Wraps regex matches inside an element in <span class="highlight"> while
// leaving element structure untouched.
//
// Usage: $(selector).highlightRegex([re1, re2, ...])

$.fn.highlightRegex = function (regexes) {
  if (!regexes || !regexes.length) return this;
  return this.each(function () {
    highlight_in(this, regexes);
  });
};

function highlight_in(root, regexes) {
  // Collect text nodes first; mutating during walk confuses TreeWalker.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (p && p.classList.contains('highlight')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let cur;
  while ((cur = walker.nextNode())) nodes.push(cur);

  for (const node of nodes) {
    const text = node.nodeValue;
    const matches = [];
    for (const re of regexes) {
      const flags = re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags;
      const r = new RegExp(re.source, flags);
      let m;
      while ((m = r.exec(text))) {
        if (m[0].length === 0) {
          r.lastIndex++;
          continue;
        }
        matches.push({ start: m.index, end: m.index + m[0].length });
      }
    }
    if (!matches.length) continue;

    matches.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const m of matches) {
      const last = merged[merged.length - 1];
      if (last && m.start <= last.end) last.end = Math.max(last.end, m.end);
      else merged.push({ start: m.start, end: m.end });
    }

    const frag = document.createDocumentFragment();
    let i = 0;
    for (const m of merged) {
      if (m.start > i) frag.appendChild(document.createTextNode(text.slice(i, m.start)));
      const span = document.createElement('span');
      span.className = 'highlight';
      span.textContent = text.slice(m.start, m.end);
      frag.appendChild(span);
      i = m.end;
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    node.parentNode.replaceChild(frag, node);
  }
}
