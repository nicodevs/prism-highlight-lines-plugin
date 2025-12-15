import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prism object
const createMockPrism = () => ({
  hooks: {
    callbacks: {},
    add: vi.fn(function(name, callback) {
      this.callbacks[name] = this.callbacks[name] || [];
      this.callbacks[name].push(callback);
    }),
    run: vi.fn(function(name, env) {
      if (this.callbacks[name]) {
        this.callbacks[name].forEach(callback => callback(env));
      }
    })
  },
  plugins: {}
});

describe('Prism Line Highlight Plugin', () => {
  let mockPrism;
  let init;

  beforeEach(async () => {
    // Reset DOM
    document.body.innerHTML = '';

    // Create fresh mock Prism
    mockPrism = createMockPrism();

    // Clear module cache and re-import
    vi.resetModules();

    // Load plugin - it exports the init function via module.exports
    const pluginModule = await import('../src/index.js');
    init = pluginModule.default;
  });

  describe('Module Exports', () => {
    it('should export init function', () => {
      expect(init).toBeDefined();
      expect(typeof init).toBe('function');
    });

    it('should initialize plugin when called with Prism instance', () => {
      init(mockPrism);
      expect(mockPrism.hooks.add).toHaveBeenCalledWith('after-highlight', expect.any(Function));
    });

    it('should prevent double initialization', () => {
      init(mockPrism);
      const firstCallCount = mockPrism.hooks.add.mock.calls.length;

      init(mockPrism);
      const secondCallCount = mockPrism.hooks.add.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should not initialize without Prism instance', () => {
      // Should return early without throwing errors when passed null
      expect(() => init(null)).not.toThrow();

      // Should also handle undefined
      expect(() => init(undefined)).not.toThrow();
    });
  });

  describe('Range Parsing', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should parse simple forward range (5)', () => {
      // Testing the parseRange function indirectly through annotation processing
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2 // [tl! highlight:5]',
        'line 3',
        'line 4',
        'line 5',
        'line 6',
        'line 7'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('2,3,4,5,6');
    });

    it('should parse backward range (-3)', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2',
        'line 3',
        'line 4',
        'line 5 // [tl! highlight:-3]',
        'line 6'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      // -3 from line 5 means: offset -3, count 3 → lines 2,3,4
      expect(pre.getAttribute('data-line-highlight')).toBe('2,3,4');
    });

    it('should parse offset with count (1,3)', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2 // [tl! highlight:1,3]',
        'line 3',
        'line 4',
        'line 5',
        'line 6'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('3,4,5');
    });

    it('should parse negative offset with count (-1,2)', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2',
        'line 3 // [tl! highlight:-1,2]',
        'line 4',
        'line 5'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('2,3');
    });
  });

  describe('Annotation Types', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should handle highlight annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! highlight]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('2');
    });

    it('should handle add annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! add]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-add')).toBe('2');
    });

    it('should handle remove annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! remove]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-remove')).toBe('2');
    });

    it('should handle multiple annotation types', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1 // [tl! highlight]',
        'line 2 // [tl! add]',
        'line 3 // [tl! remove]',
        'line 4'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
      expect(pre.getAttribute('data-line-add')).toBe('2');
      expect(pre.getAttribute('data-line-remove')).toBe('3');
    });

    it('should handle multiple types in single annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! add remove:-1]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-add')).toBe('2');
      // remove:-1 from line 2 means: offset -1, count 1 → line 1
      expect(pre.getAttribute('data-line-remove')).toBe('1');
    });
  });

  describe('Language Comment Syntax', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should detect JavaScript // comments', () => {
      const code = document.createElement('code');
      code.className = 'language-javascript';
      code.innerHTML = 'const x = 1; // [tl! highlight]';

      const pre = document.createElement('pre');
      pre.className = 'language-javascript';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'javascript'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });

    it('should detect Python # comments', () => {
      const code = document.createElement('code');
      code.className = 'language-python';
      code.innerHTML = 'x = 1 # [tl! highlight]';

      const pre = document.createElement('pre');
      pre.className = 'language-python';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'python'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });

    it('should detect CSS /* */ comments', () => {
      const code = document.createElement('code');
      code.className = 'language-css';
      code.innerHTML = 'body { color: red; } /* [tl! highlight] */';

      const pre = document.createElement('pre');
      pre.className = 'language-css';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'css'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });

    it('should detect HTML <!-- --> comments', () => {
      const code = document.createElement('code');
      code.className = 'language-markup';
      // Use plain text instead of HTML entities to match actual behavior
      code.textContent = '<div>test</div> <!-- [tl! highlight] -->';

      const pre = document.createElement('pre');
      pre.className = 'language-markup';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'markup'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });

    it('should detect Lua -- comments', () => {
      const code = document.createElement('code');
      code.className = 'language-lua';
      code.innerHTML = 'local x = 1 -- [tl! highlight]';

      const pre = document.createElement('pre');
      pre.className = 'language-lua';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'lua'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });
  });

  describe('Annotation Removal', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should remove annotation from rendered code', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'const x = 1; // [tl! highlight]';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(code.innerHTML).not.toContain('[tl! highlight]');
      expect(code.innerHTML).toContain('const x = 1;');
    });

    it('should preserve code before annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'const x = 1; const y = 2; // [tl! add]';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(code.innerHTML).toContain('const x = 1; const y = 2;');
      expect(code.innerHTML).not.toContain('[tl! add]');
    });
  });

  describe('Line Highlight Overlays', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should create highlight overlays', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! highlight]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      // Wait for requestAnimationFrame
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          const overlays = pre.querySelectorAll('.line-highlight-overlay');
          expect(overlays.length).toBeGreaterThan(0);

          const highlightOverlay = pre.querySelector('.line-highlight-default');
          expect(highlightOverlay).toBeTruthy();
          expect(highlightOverlay.dataset.line).toBe('2');
          resolve();
        });
      });
    });

    it('should create add overlays', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! add]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      return new Promise(resolve => {
        requestAnimationFrame(() => {
          const addOverlay = pre.querySelector('.line-highlight-add');
          expect(addOverlay).toBeTruthy();
          expect(addOverlay.dataset.line).toBe('2');
          expect(addOverlay.dataset.type).toBe('add');
          resolve();
        });
      });
    });

    it('should create remove overlays', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! remove]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      return new Promise(resolve => {
        requestAnimationFrame(() => {
          const removeOverlay = pre.querySelector('.line-highlight-remove');
          expect(removeOverlay).toBeTruthy();
          expect(removeOverlay.dataset.line).toBe('2');
          expect(removeOverlay.dataset.type).toBe('remove');
          resolve();
        });
      });
    });

    it('should add line-highlight class to pre element', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! highlight]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      return new Promise(resolve => {
        requestAnimationFrame(() => {
          expect(pre.classList.contains('line-highlight')).toBe(true);
          resolve();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should handle code without annotations', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'const x = 1;\nconst y = 2;';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBeNull();
      expect(pre.getAttribute('data-line-add')).toBeNull();
      expect(pre.getAttribute('data-line-remove')).toBeNull();
    });

    it('should not process same element twice', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\nline 2 // [tl! highlight]\nline 3';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      const firstHTML = code.innerHTML;

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(code.innerHTML).toBe(firstHTML);
    });

    it('should handle empty lines', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = 'line 1\n\nline 3 // [tl! highlight]\nline 4';

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-highlight')).toBe('3');
    });

    it('should filter out negative line numbers from range', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2',
        'line 3 // [tl! highlight:-2]',
        'line 4'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      // -2 from line 3 means: offset -2, count 2 → lines 1,2
      expect(pre.getAttribute('data-line-highlight')).toBe('1,2');
    });

    it('should handle unknown language gracefully', () => {
      const code = document.createElement('code');
      code.className = 'language-unknown';
      code.innerHTML = 'some code // [tl! highlight]';

      const pre = document.createElement('pre');
      pre.className = 'language-unknown';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'unknown'
      });

      // Should default to JS syntax
      expect(pre.getAttribute('data-line-highlight')).toBe('1');
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(() => {
      init(mockPrism);
    });

    it('should handle multiple ranges in single annotation', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2',
        'line 3 // [tl! highlight:-1 highlight:2]',
        'line 4',
        'line 5',
        'line 6'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      // highlight:-1 from line 3 → line 2
      // highlight:2 from line 3 → lines 3,4
      // Combined: 2,3,4
      expect(pre.getAttribute('data-line-highlight')).toBe('2,3,4');
    });

    it('should deduplicate overlapping ranges', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2 // [tl! highlight:3]',
        'line 3 // [tl! highlight:3]',
        'line 4',
        'line 5',
        'line 6'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      // Line 2 with highlight:3 → lines 2,3,4
      // Line 3 with highlight:3 → lines 3,4,5
      // Combined and deduplicated: 2,3,4,5
      expect(pre.getAttribute('data-line-highlight')).toBe('2,3,4,5');
    });

    it('should handle mixed annotation types with ranges', () => {
      const code = document.createElement('code');
      code.className = 'language-js';
      code.innerHTML = [
        'line 1',
        'line 2 // [tl! remove:-1,3 add:1,2]',
        'line 3',
        'line 4',
        'line 5'
      ].join('\n');

      const pre = document.createElement('pre');
      pre.className = 'language-js';
      pre.appendChild(code);
      document.body.appendChild(pre);

      mockPrism.hooks.run('after-highlight', {
        element: code,
        language: 'js'
      });

      expect(pre.getAttribute('data-line-remove')).toBe('1,2,3');
      expect(pre.getAttribute('data-line-add')).toBe('3,4');
    });
  });
});
