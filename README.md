# react-beautify

This extension wraps prettydiff/esformatter to format your javascript, JSX, typescript, TSX file.

### Local Version

If this extension found a locally installed prettydiff/esformatter, this extension uses that instead of bundled module.

It is strongly recommended that you install formatter implementation locally.

## How To Use

* open Context Menu and choose `Format Code` on `javascript`/`javascriptreact`/`typescript`/`typescriptreact`
* shortcuts: Alt+Shift+F
* Press F1, enter `react.beautify`

## Extension Settings

This extension contributes the following settings:

* `react.beautify.onSave`: by default is `false`. if you set `true`, Automatically format files on save.
* `react.beautify.formatter`: select the formatter implementation. Accepted values are `prettydiff` and `esformatter`. default value is `prettydiff`. 
* `react.beautify.configFilePath`: Specifies the workspace relative config filepath. default value is `.jsbeautifyrc`.
  * Comments in your settings file are acceptable (they're removed before the file is parsed).

## Formatter Settings

* [Pretty Diff](http://prettydiff.com/documentation.xhtml)
* [esformatter](https://github.com/millermedeiros/esformatter/blob/master/doc/config.md)
  * [esformatter-jsx](https://github.com/royriojas/esformatter-jsx#config)

## Releases
### 0.2.0: 2016-09-30
* add typescript support

### 0.1.0: 2016-09-23
* add javascript support

### 0.0.1: 2016-09-22
* initial release
