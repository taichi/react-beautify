'use strict';
import {   commands, workspace, window,
    WorkspaceConfiguration, ExtensionContext,
    languages, Range, TextDocument, Position, TextEdit, TextLine, WorkspaceEdit } from 'vscode';

import path = require('path');
import fs = require('fs');
import beautifier = require('prettydiff');
import _ = require('lodash');

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand('beautify', () => {
        const a = window.activeTextEditor;
        if (a && a.document) {
            const r = a.document.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
            return format(a.document, r, toOptions(a.options))
                .then(txt => a.edit(editor => editor.replace(r, txt)))
                .catch(report);
        }
    }));
    registerFormatter(context, "javascriptreact");
    workspace.onDidSaveTextDocument(formatOnSave);
}

function registerFormatter(context: ExtensionContext, languageId: string) {
    context.subscriptions.push(languages.registerDocumentFormattingEditProvider(languageId, {
        provideDocumentFormattingEdits: (document, options, token) => {
            const r = document.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
            return format(document, r, toOptions(options), languageId)
                .then(txt => [TextEdit.replace(r, txt)], report);
        }
    }));
    context.subscriptions.push(languages.registerDocumentRangeFormattingEditProvider(languageId, {
        provideDocumentRangeFormattingEdits: (document, range, options, token) => {
            const r = document.validateRange(new Range(new Position(range.start.line, 0), range.end.translate(0, Number.MAX_VALUE)));
            return format(document, r, toOptions(options), languageId)
                .then(txt => [TextEdit.replace(r, txt)], report);
        }
    }));
}

function formatOnSave(doc) {
    if (doc.sentinel) {
        delete doc.sentinel;
        return;
    }
    if (doc.languageId !== "javascriptreact") {
        return;
    }
    if (getOptions<boolean>("onSave", false) === false) {
        return;
    }
    const r = doc.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
    const editor = window.visibleTextEditors.find(ed => ed.document && ed.document.fileName === doc.fileName);
    const options = editor ? editor.options : workspace.getConfiguration('editor');
    return format(doc, r, toOptions(options), doc.languageId)
        .then(txt => {
            const we = new WorkspaceEdit();
            we.replace(doc.uri, r, txt);
            doc.sentinel = true;
            return workspace.applyEdit(we);
        })
        .then(() => doc.save(), report)
}

export function deactivate() {
}

export function format(doc: TextDocument, range: Range, defaults: any, languageId?: string): Promise<string> {
    if (doc) {
        if ((languageId ? languageId : doc.languageId) === "javascriptreact") {
            return makeOptions(doc, defaults, "jsx")
                .then(options => {
                    options.source = doc.getText(doc.validateRange(range));
                    const output = beautifier.api(options);
                    return output[0];
                });
        }
        return Promise.reject<string>("Unsupported languageId " + doc.languageId);
    }
    return Promise.reject<string>("Beautiy fail to get File Information. maybe too large.");
}

function makeOptions(doc: TextDocument, defaults: any, lang: string): Promise<any> {
    const options = {
        mode: "beautify",
        lang: lang
    };
    options[lang] = true;
    return Promise.resolve(_.merge(_.merge(getOptions(lang), defaults), options));
}

function getOptions<T>(section: string, defaults?: T) {
    const config = workspace.getConfiguration("beautify");
    return config.get<T>(section, defaults);
}

function toOptions(editorOptions) {
    return {
        insize: editorOptions.tabSize,
        inchar: editorOptions.insertSpaces === false ? "\t" : " "
    };
}

function report(e: string) {
    if (e) {
        window.showErrorMessage(e);
        console.error("beautify ERROR:", e);
    }
    return [];
}