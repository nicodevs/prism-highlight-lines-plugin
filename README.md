# Prism Highlight Lines Plugin

A powerful Prism.js plugin that enables line highlighting with annotations embedded directly in code comments. Perfect for tutorials, documentation, and code diffs.

## Features

- **Multiple highlight types**: highlight, add (green), remove (red)
- **Flexible range syntax**: highlight single lines, ranges, or multiple groups
- **Language-agnostic**: works with all Prism.js supported languages
- **Inline annotations**: write highlighting instructions directly in your code comments
- **Zero configuration**: works out of the box with Prism.js

## Installation

```bash
npm install prism-highlight-lines-plugin
```

## Usage

### 1. Import the plugin

```javascript
// After importing Prism
import Prism from 'prismjs';
import 'prism-highlight-lines-plugin';
import 'prism-highlight-lines-plugin/src/style.css';
```

### 2. Or use via CDN

```html
<!-- Prism Core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism.min.css">
<script src="https://cdn.jsdelivr.net/npm/prismjs@1/prism.min.js"></script>

<!-- Add language components as needed -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-javascript.min.js"></script>

<!-- Prism Highlight Lines Plugin -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prism-highlight-lines-plugin@latest/src/style.css">
<script src="https://cdn.jsdelivr.net/npm/prism-highlight-lines-plugin@latest/dist/index.min.js"></script>
```

### 3. Add annotations to your code

Simply add highlighting annotations as comments in your code blocks:

```javascript
function example() {
  console.log('This line is normal');
  console.log('This line will be highlighted'); // [tl! highlight]
  console.log('This was added'); // [tl! add]
  console.log('This was removed'); // [tl! remove]
}
```

## Annotation Syntax

### Basic Format

```
// [tl! type:range type:range ...]
<!-- [tl! type:range type:range ...] -->
/* [tl! type:range type:range ...] */
```

### Highlight Types

- `highlight` - Default yellow highlighting
- `add` - Green highlighting (for additions/new code)
- `remove` - Red highlighting (for deletions/old code)

### Range Syntax

- `3` - Highlight the next 3 lines (including current)
- `-2` - Highlight the previous 2 lines (including current)
- `1,3` - Offset +1, count 3 lines (skip 1, highlight next 3)
- `-1,2` - Offset -1, count 2 lines (go back 1, highlight 2)

### Examples

#### Single line highlight
```javascript
const name = 'John'; // [tl! highlight]
```

#### Highlight next 3 lines
```javascript
// [tl! highlight:3]
const a = 1;
const b = 2;
const c = 3;
```

#### Multiple types
```javascript
const old = 'value'; // [tl! remove]
const new = 'value'; // [tl! add]
```

#### Complex ranges
```javascript
// [tl! remove:-2,3 add:1,2]
// This will:
// - Remove 3 lines starting 2 lines before this comment
// - Add 2 lines starting 1 line after this comment
```

## Supported Languages

Works with all Prism.js supported languages including:
- JavaScript, TypeScript, Java, C, C++, C#, PHP, Go, Rust, Swift, Kotlin, Dart
- Python, Ruby, Perl, Bash, Shell, PowerShell, YAML, R
- Lua, Haskell, Elm, Lisp, Clojure, Scheme
- MATLAB, TeX, LaTeX
- CSS, SCSS, Sass, Less, SQL
- HTML, XML, Blade templates

## Browser Support

Works in all modern browsers that support:
- ES6+
- MutationObserver
- Prism.js

## License

MIT
