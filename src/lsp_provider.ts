import {
  Completer,
  CompletionHandler,
  ICompletionContext,
  ICompletionProvider
} from '@jupyterlab/completer';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ILSPDocumentConnectionManager } from '@jupyterlab/lsp';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { VirtualDocument } from '@jupyterlab/lsp';
import { IEditorPosition, ISourcePosition } from '@jupyterlab/lsp';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Document } from '@jupyterlab/lsp';
import { IRootPosition } from '@jupyterlab/lsp/lib/positioning';
import { CompletionTriggerKind } from '@jupyterlab/lsp/lib/lsp';
import type * as protocol from 'vscode-languageserver-protocol';
import { CustomRenderer } from './renderer';
import { CompletionItemKind } from '@jupyterlab/lsp/lib/lsp';

export class LspCompletionProvider implements ICompletionProvider {
  private _app: JupyterFrontEnd;
  private _rendermime: IRenderMimeRegistry;

  constructor(options: LspCompletionProvider.IOptions) {
    this._manager = options.manager;
    this._app = options.app;
    this._rendermime = options.renderMimeRegistry;
    this.renderer = new CustomRenderer(this._app, this._rendermime);
  }

  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return (
      !!context.editor && !!(context.widget as IDocumentWidget).context.path
    );
  }
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<any> {
    const path = (context.widget as IDocumentWidget).context.path;
    const adapter = this._manager.adapters.get(path);
    const editor = adapter?.activeEditor;
    const ceEditor = adapter?.activeEditor?.getEditor();
    if (!adapter || !editor || !ceEditor) {
      console.debug('No adapter');
      return { start: 0, end: 0, items: [] };
    }
    await adapter.ready;
    this._manager.connections.forEach((val, key) =>
      console.debug('key:', key, val)
    );
    if (!this.lspConnection) {
      const lspConnection = this._manager.connections.get(
        adapter.virtualDocument.uri
      );
      if (!lspConnection) {
        console.debug('No connection');
        return { start: 0, end: 0, items: [] };
      }
      this.lspConnection = lspConnection;
    }
    const virtualDocument = adapter.virtualDocument;

    const cursor = ceEditor.getCursorPosition();
    const token = ceEditor.getTokenAtCursor();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const start = ceEditor.getPositionAt(token.offset)!;
    const positionInToken = cursor.column - start.column - 1;
    const typedCharacter = token.value[cursor.column - start.column - 1];

    const cursorInRoot = this.transformFromEditorToRoot(
      virtualDocument,
      editor,
      cursor
    );
    const virtualCursor = virtualDocument.virtualPositionAtDocument(
      cursorInRoot as ISourcePosition
    );

    const params: protocol.CompletionParams = {
      textDocument: {
        uri: virtualDocument.documentInfo.uri
      },
      position: {
        line: virtualCursor.line,
        character: virtualCursor.ch
      },
      context: {
        triggerKind: CompletionTriggerKind.Invoked,
        triggerCharacter: typedCharacter
      }
    };

    return this.lspConnection.clientRequests['textDocument/completion']
      .request(params)
      .then((lspCompletionItems: any) => {
        console.log('resp', lspCompletionItems);
        let prefix = token.value.slice(0, positionInToken + 1);
        let allNonPrefixed = true;
        const items = [] as CompletionHandler.ICompletionItem[];
        lspCompletionItems.items.forEach((match: any) => {
          const text = match.insertText ? match.insertText : match.label;

          if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
            allNonPrefixed = false;
            if (prefix !== token.value) {
              if (text.toLowerCase().startsWith(token.value.toLowerCase())) {
                prefix = token.value;
              }
            }
          } else if (token.type === 'string' && prefix.includes('/')) {
            const parts = prefix.split('/');
            if (
              text
                .toLowerCase()
                .startsWith(parts[parts.length - 1].toLowerCase())
            ) {
              let pathPrefix = parts.slice(0, -1).join('/') + '/';
              match.insertText = pathPrefix + match.insertText;
              // for label removing the prefix quote if present
              if (pathPrefix.startsWith("'") || pathPrefix.startsWith('"')) {
                pathPrefix = pathPrefix.substr(1);
              }
              match.label = pathPrefix + match.label;
              allNonPrefixed = false;
            }
          }

          const completionItem: CompletionHandler.ICompletionItem = {
            label: match.label,
            insertText: match.insertText ?? undefined,
            type: CompletionItemKind[match.kind]
          };

          items.push(completionItem as any);
        });
        let prefixOffset = token.value.length;

        if (allNonPrefixed && prefixOffset > prefix.length) {
          prefixOffset = prefix.length;
        }

        const response = {
          start: token.offset + (allNonPrefixed ? prefixOffset : 0),
          end: token.offset + prefix.length,
          items: items,
          source: {
            name: 'LSP',
            priority: 2
          }
        };
        if (response.start > response.end) {
          console.log(
            'Response contains start beyond end; this should not happen!',
            response
          );
        }
        console.log('res', response);

        return response;
      })
      .catch((e: any) => {
        console.log(e);
      });
  }

  /**
   * Kernel provider will use the inspect request to lazy-load the content
   * for document panel.
   */
  async resolve(
    item: CompletionHandler.ICompletionItem,
    context: ICompletionContext,
    patch?: Completer.IPatch | null
  ): Promise<CompletionHandler.ICompletionItem> {
    await this.lspConnection.clientRequests['completionItem/resolve']
      .request(item)
      .then((lspCompletionItem: any) => {
        if (lspCompletionItem.detail) {
          item.documentation = lspCompletionItem.detail;
        }
      })
      .catch((e: any) => {
        console.log(e);
      });
    return item;
  }

  transformFromEditorToRoot(
    virtualDocument: VirtualDocument,
    editor: Document.IEditor,
    position: CodeEditor.IPosition
  ): IRootPosition | null {
    const editorPosition = VirtualDocument.ceToCm(position) as IEditorPosition;
    return virtualDocument.transformFromEditorToRoot(editor, editorPosition);
  }

  identifier = 'CompletionProvider:lsp';
  readonly renderer?: Completer.IRenderer<CompletionHandler.ICompletionItem>;
  private _manager: ILSPDocumentConnectionManager;
  private lspConnection: any;
}

export namespace LspCompletionProvider {
  export interface IOptions {
    manager: ILSPDocumentConnectionManager;
    app: JupyterFrontEnd;
    renderMimeRegistry: IRenderMimeRegistry;
  }
}
