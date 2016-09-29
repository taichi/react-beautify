'use strict';

import resolve = require('resolve-from');
import fs = require('fs');
import _ = require('lodash');

const formatters = {
    prettydiff: prettydiffFactory,
    esformatter: esformatterFactory
}

export interface Formatter { (src: string, options: any): string; }

export function make(root: string, impl: string, langId: string): Formatter {
    let f = formatters[impl];
    if (f) {
        return f(root, impl, langId);
    }
    return (src, opt) => src; // NullFormatter
}

function loadModue(root: string, impl: string, onFail: () => any): any {
    // load workspace module
    if (root) {
        try {
            let p = resolve(root, impl);
            if (p) {
                return require(p);
            }
        } catch (e) {
            // suppress error
        }
    }
    // load bundled module
    return onFail();
}

function prettydiffFactory(root: string, impl: string, langId: string): Formatter {
    const mod = loadModue(root, impl, () => require(impl));
    return (src, options) => {
        let output = mod.api(_.defaultsDeep({}, options, {
            insize: options.tabSize,
            inchar: options.insertSpaces ? " " : "\t",
            source: src,
            mode: 'beautify'
        }, languageOptions[langId]));
        return output[0];
    };
}

const languageOptions = {
    javascript: {
        lang: "javascript"
    },
    javascriptreact: {
        lang: "jsx",
        jsx: true
    },
    typescript: {
        lang: "typescript",
        typescript: true
    },
    typescriptreact: {
        lang: "jsx",
        typescript: true,
        jsx: true
    }
}

function esformatterFactory(root: string, impl: string, langId: string): Formatter {
    if(langId.startsWith("typescript")) {
        throw "esformatter don't support typescript. use prettydiff.";
    }
    const mod = loadModue(root, impl, () => {
        let m = require(impl);
        m.register(require("esformatter-jsx"));
        return m;
    });
    return (src, options) => {
        return mod.format(src, _.defaultsDeep({}, options, {
            indent: {
                value: options.insertSpaces ? _.repeat(" ", options.tabSize) : "\t"
            }
        }));
    };
}
