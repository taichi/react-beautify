'use strict';
import { commands, workspace, window,
    WorkspaceConfiguration, ExtensionContext,
    languages, Range, TextDocument, Position, TextEdit, TextLine, WorkspaceEdit } from 'vscode';

import path = require('path');
import fs = require('fs');

import _ = require('lodash');
import shaver = require('strip-json-comments');

import formatters = require('./formatters');

const supported_languages = ["javascript", "javascriptreact", "typescript", "typescriptreact"];

export function activate(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand("react.beautify", () => {
        const a = window.activeTextEditor;
        if (a && a.document) {
            const r = allOf(a.document);
            return format(a.document, r, a.options)
                .then(txt => a.edit(editor => editor.replace(r, txt)))
                .catch(report);
        }
    }));
    _.each(supported_languages, l => registerFormatter(context, l));
    workspace.onDidSaveTextDocument(formatOnSave);
}

function registerFormatter(context: ExtensionContext, languageId: string) {
    context.subscriptions.push(languages.registerDocumentFormattingEditProvider(languageId, {
        provideDocumentFormattingEdits: (document, options, token) => {
            const r = allOf(document);
            return format(document, r, options)
                .then(txt => [TextEdit.replace(r, txt)])
                .catch(report);
        }
    }));
    context.subscriptions.push(languages.registerDocumentRangeFormattingEditProvider(languageId, {
        provideDocumentRangeFormattingEdits: (document, range, options, token) => {
            let begin = new Position(range.start.line, 0);
            let end = range.end.translate(0, Number.MAX_VALUE);
            let r = document.validateRange(new Range(begin, end));
            return format(document, r, options)
                .then(txt => [TextEdit.replace(r, txt)])
                .catch(report);

        }
    }));
}

function formatOnSave(doc) {
    if (doc.sentinel) {
        delete doc.sentinel;
        return;
    }
    if (supports(doc.languageId) && getConfig("onSave", false)) {
        const r = allOf(doc);
        let editor = window.visibleTextEditors.find(ed => ed.document && ed.document.fileName === doc.fileName);
        let options = editor ? editor.options : workspace.getConfiguration('editor');
        return format(doc, r, options)
            .then(txt => {
                let we = new WorkspaceEdit();
                we.replace(doc.uri, r, txt);
                doc.sentinel = true;
                return workspace.applyEdit(we);
            })
            .then(() => doc.save())
            .catch(report);
    }
}

export function deactivate() {
}

export function format(doc: TextDocument, range: Range, defaults: any): Promise<string> {
    if (doc) {
        const langId = doc.languageId;
        if (langId && supports(langId)) {
            const root = workspace.rootPath;
            return loadOptions(root, defaults)
                .then(options => {
                    let t = getConfig<string>("formatter") || "prettydiff";
                    return [options, formatters.make(root, t, langId)];
                }).then(optFmt => {
                    let src = doc.getText(doc.validateRange(range));
                    return optFmt[1](src, optFmt[0]);
                });
        }
        return Promise.reject<string>(`Unsupported languageId ${doc.languageId}`);
    }
    return Promise.reject<string>("Fail to get File Information. maybe too large.");
}

function loadOptions(root: string, defaults: any): Promise<any> {
    if (root) {
        let relpath = getConfig("configFilePath") || ".jsbeautifyrc";
        const conf = path.join(root, relpath);
        if (path.normalize(conf).startsWith(root) && fs.existsSync(conf)) {
            return new Promise((next, reject) =>
                fs.readFile(conf, "utf8", (err, buffer) => {
                    if (buffer) {
                        try {
                            let srcjson = shaver(buffer.toString());
                            next(_.defaultsDeep({}, JSON.parse(srcjson), defaults));
                        } catch (e) {
                            reject(`incorrect config file. ${conf} can't parse correctly.`);
                        }
                    } else {
                        next(defaults);
                    }
                })
            );
        }
    }
    return Promise.resolve(defaults);
}

function getConfig<T>(section: string, defaults?: T) {
    const config = workspace.getConfiguration("react.beautify");
    return config.get<T>(section, defaults);
}

function allOf(document: TextDocument): Range {
    return document.validateRange(new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));
}

function supports(languageId: string): boolean {
    return -1 < supported_languages.indexOf(languageId);
}

function report(e: string) {
    if (e) {
        window.showErrorMessage(e);
        console.error("beautify ERROR:", e);
    }
    return [];
}