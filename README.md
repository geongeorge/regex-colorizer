 <div align="center">
 
  <h2>Regex Colorize</h2>
  <blockquote>Color highlight your regex</blockquote>

  <img align="center" width="380" src="https://i.imgur.com/8kyJODb.png" /> 
<br />

 <img align="center" width="380" src="https://i.imgur.com/QGRly2q.png" /> 
</div>

## Demo

See Slevithan's [demo page](http://stevenlevithan.com/regex/colorizer/)

## 📦 Getting Started
**npm**
```
npm install regex-colorize --save
```
**yarn**
```
yarn add regex-colorize 
```

## Install

### npm
```js
import RegexColorize from 'regex-colorize';
import 'regex-colorize/themes/default.css' // If you import a css file in your library

var rgx = new RegexColorize();
rgx.colorizeAll();
...
```

### self-host/cdn
```js
<link href="https://unpkg.com/regex-colorize/themes/default.css" rel="stylesheet">

<script src="//unpkg.com/regex-colorize"></script>

var RegexColorize = window.RegexColorize.default;

var rgx = new RegexColorize();
// rgx.addStyleSheet();
rgx.colorizeAll();
...
```

## Usage

```js

var rgx = new RegexColorize();

// Don't run this line if you provide your own stylesheet
rgx.addStyleSheet();

// Can provide a class name for elements to process (defaults to class 'regex')
rgx.colorizeAll();
```

```html
<code class="regex">/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/</code>
```


## Themes

- default.css
- nobg.css
- regexbuddy.css
- regexpal.css
- sweetest.css (**NEW**)

## Credits 

The code is extracted from 
[Regex Colorizer by slevithan](https://github.com/slevithan/regex-colorizer)