/**
 * Prism Line Highlight Plugin - Multi-Type with Range Support
 * Syntax: [tl! type:range type:range ...] where type = highlight|add|remove
 * Range: 5 (next 5), -5 (prev 5), 1,5 (offset 1, count 5), -1,5 (offset -1, count 5)
 * Examples: [tl! highlight:3], [tl! add remove:-1], [tl! remove:-2,3 add:1,2]
 */
function init(Prism) {
    if (!Prism || typeof document === 'undefined') {
      return;
    }

    // Prevent double initialization
    if (Prism.plugins && Prism.plugins.lineHighlight) {
      return;
    }

    const TYPES = { highlight: 'line-highlight-default', add: 'line-highlight-add', remove: 'line-highlight-remove' };
    const SYNTAX = { js: '//', javascript: '//', typescript: '//', java: '//', c: '//', cpp: '//', csharp: '//', php: '//', go: '//', rust: '//', swift: '//', kotlin: '//', dart: '//', python: '#', ruby: '#', perl: '#', bash: '#', shell: '#', powershell: '#', yaml: '#', r: '#', lua: '--', haskell: '--', elm: '--', lisp: ';', clojure: ';', scheme: ';', matlab: '%', tex: '%', latex: '%', css: '/*', scss: '/*', sass: '/*', less: '/*', sql: '/*', markup: '<!--', html: '<!--', xml: '<!--', blade: '<!--' };

    const PATTERNS = Object.fromEntries(
      Object.entries(SYNTAX).map(([lang, syntax]) => [
        lang,
        syntax === '/*' ? /\/\*\s*\[tl!\s*([^\]]+)\]\s*\*\// :
        syntax === '<!--' ? /<!--\s*\[tl!\s*([^\]]+)\]\s*-->/ :
        syntax === '{{--' ? /{{--\s*\[tl!\s*([^\]]+)\]\s*--}}/ :
        new RegExp(`${syntax.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\[tl!\\s*([^\\]]+)\\]`)
      ])
    );

    const getLanguage = el => el.className.match(/language-(\w+)/)?.[1] || 'js';

    const parseRange = (str, line) => {
      const [offsetStr, countStr] = str.includes(',') ? str.split(',') : [str.startsWith('-') ? str : '0', Math.abs(+str)];
      const offset = +offsetStr, count = countStr ? +countStr : Math.abs(offset);
      return Array.from({ length: count }, (_, i) => line + offset + i).filter(n => n > 0);
    };

    const parseAnnotations = (content, line) =>
      [...content.matchAll(/(\w+)(?::([^:\s]+))?/g)]
        .filter(([, type]) => TYPES[type])
        .map(([, type, range]) => ({ type, lines: range ? parseRange(range, line) : [line] }));

    const detectAnnotation = (text, lang) => {
      const pattern = PATTERNS[lang] || PATTERNS.js;
      const match = text.match(pattern);

      // For Blade, also check for {{-- --}} syntax if <!-- --> didn't match
      if (!match && lang === 'blade') {
        const bladePattern = /{{--\s*\[tl!\s*([^\]]+)\]\s*--}}/;
        const bladeMatch = text.match(bladePattern);
        return bladeMatch ? bladeMatch[1] : null;
      }

      return match ? match[1] : null;
    };

    const processHighlightedCode = (codeElement) => {
      if (codeElement.dataset.tlProcessed) return;
      codeElement.dataset.tlProcessed = 'true';

      const lang = getLanguage(codeElement);
      const pattern = PATTERNS[lang] || PATTERNS.js;
      const linesByType = { highlight: [], add: [], remove: [] };
      const lines = codeElement.innerHTML.split('\n');

      const processedLines = lines.map((lineHTML, index) => {
        const lineNumber = index + 1;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lineHTML;
        const lineText = tempDiv.textContent || tempDiv.innerText || '';

        const annotationContent = detectAnnotation(lineText, lang);
        if (!annotationContent) return lineHTML;

        const annotations = parseAnnotations(annotationContent, lineNumber);
        annotations.forEach(({ type, lines }) => {
          linesByType[type].push(...lines);
        });

        return removeAnnotationFromHTML(lineHTML, pattern, lang);
      });

      codeElement.innerHTML = processedLines.join('\n');

      const pre = codeElement.parentNode;
      if (pre?.tagName === 'PRE') {
        Object.entries(linesByType).forEach(([type, lines]) => {
          if (lines.length) {
            pre.setAttribute(`data-line-${type}`, [...new Set(lines)].sort((a, b) => a - b).join(','));
          }
        });

        requestAnimationFrame(() => applyHighlights(pre));
      }
    };

    const removeAnnotationFromHTML = (lineHTML, pattern, lang) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = lineHTML;

      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      let fullText = textNodes.map(n => n.textContent).join('');
      let match = fullText.match(pattern);

      // For Blade, also try {{-- --}} syntax
      if (!match && lang === 'blade') {
        const bladePattern = /{{--\s*\[tl!\s*([^\]]+)\]\s*--}}/;
        match = fullText.match(bladePattern);
      }

      if (match) {
        let charIndex = 0;
        let targetStart = match.index;
        let targetEnd = match.index + match[0].length;

        for (let textNode of textNodes) {
          const nodeLength = textNode.textContent.length;
          const nodeStart = charIndex;
          const nodeEnd = charIndex + nodeLength;

          if (nodeStart < targetEnd && nodeEnd > targetStart) {
            const removeStart = Math.max(0, targetStart - nodeStart);
            const removeEnd = Math.min(nodeLength, targetEnd - nodeStart);

            if (removeStart === 0 && removeEnd === nodeLength) {
              const parent = textNode.parentNode;
              if (parent && parent.childNodes.length === 1) {
                parent.remove();
              } else {
                textNode.remove();
              }
            } else {
              const before = textNode.textContent.substring(0, removeStart);
              const after = textNode.textContent.substring(removeEnd);
              textNode.textContent = before + after;
            }
          }

          charIndex += nodeLength;
        }
      }

      return tempDiv.innerHTML;
    };

    const applyHighlights = pre => {
      if (pre.querySelector('.line-highlight-overlay')) return;

      Object.entries(TYPES).forEach(([type, cssClass]) => {
        const dataLine = pre.getAttribute(`data-line-${type}`);
        if (!dataLine) return;

        pre.classList.add('line-highlight');
        dataLine.split(',').forEach(lineNumber => {
          const div = document.createElement('div');
          div.className = `line-highlight-overlay ${cssClass}`;
          div.dataset.line = lineNumber;
          div.dataset.type = type;
          Object.assign(div.style, {
            position: 'absolute', left: '0', pointerEvents: 'none',
            lineHeight: 'inherit', whiteSpace: 'pre', zIndex: '0'
          });
          pre.appendChild(div);
        });
      });

      positionHighlights(pre);
    };

    const positionHighlights = pre => {
      const code = pre.querySelector('code');
      if (!code) return;

      const { lineHeight: lh, fontSize: fs } = getComputedStyle(code);
      const { paddingTop: pt } = getComputedStyle(pre);
      const lineHeight = parseFloat(lh) || parseFloat(fs) * 1.2 || 20;
      const paddingTop = parseFloat(pt) || 0;

      // Get the full scrollable width of the code content
      const contentWidth = Math.max(code.scrollWidth, code.offsetWidth);

      pre.querySelectorAll('.line-highlight-overlay').forEach(highlight => {
        const top = paddingTop + ((+highlight.dataset.line - 1) * lineHeight);
        Object.assign(highlight.style, {
          top: top + 'px',
          height: lineHeight + 'px',
          width: contentWidth + 'px'
        });
      });
    };

    Prism.hooks.add('after-highlight', env => {
      if (env.element?.tagName === 'CODE') {
        processHighlightedCode(env.element);
      }
    });

    if (typeof window !== 'undefined' && window.MutationObserver) {
      new MutationObserver(mutations => {
        mutations.forEach(({ addedNodes }) => {
          addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              (node.querySelectorAll?.('pre[class*="language-"]') || []).forEach(pre =>
                requestAnimationFrame(() => positionHighlights(pre))
              );
            }
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () =>
        document.querySelectorAll('pre.line-highlight').forEach(pre =>
          requestAnimationFrame(() => positionHighlights(pre))
        )
      );
    }

  // Mark as initialized
  Prism.plugins = Prism.plugins || {};
  Prism.plugins.lineHighlight = true;
}

// Browser global auto-initialization
if (typeof self !== 'undefined' && self.Prism) {
  init(self.Prism);
}

// Export for module systems
export default init;
