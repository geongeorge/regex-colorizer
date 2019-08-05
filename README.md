 <div align="center">
 
  <h2>Regex Colorizer</h2>
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
npm install regex-colorizer --save
```
**yarn**
```
yarn add regex-colorizer 
```

## Install

### npm
```
import RegexColorizer from 'regex-colorizer';
import 'regex-colorizer/themes/default.css' // If you import a css file in your library

RegexColorizer.colorizeAll();
...
```

### self-host/cdn
```
<link href="./themes/default.css" rel="stylesheet">
<script src="build/index.js"></script>

let RegexColorizer = window.RegexColorizer.default;

RegexColorizer.colorizeAll();
...
```

## Usage

```js
// Don't run this line if you provide your own stylesheet
RegexColorizer.addStyleSheet();

// Can provide a class name for elements to process (defaults to class 'regex')
RegexColorizer.colorizeAll();
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