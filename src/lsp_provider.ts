/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Completer,
  CompletionHandler,
  ICompletionContext,
  ICompletionProvider
  // CompleterModel
} from '@jupyterlab/completer';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ILSPDocumentConnectionManager } from '@jupyterlab/lsp';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { BBCompletionRenderer } from './renderer';
import { VirtualDocument } from '@jupyterlab/lsp';
import {
  IEditorPosition,
  // IRootPosition,
  ISourcePosition
} from '@jupyterlab/lsp';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Document } from '@jupyterlab/lsp';
import { IRootPosition } from '@jupyterlab/lsp/lib/positioning';

export class LspCompletionProvider implements ICompletionProvider {
  constructor(options: LspCompletionProvider.IOptions) {
    this._manager = options.manager;
    this._app = options.app;
    this._renderMine = options.renderMimeRegistry;
    this.renderer = new BBCompletionRenderer(this._app, this._renderMine);
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
    if (!adapter) {
      console.debug('No adapter');
      return { start: 0, end: 0, items: [] };
    }

    await adapter.ready;

    this._manager.connections.forEach((val, key) =>
      console.debug('key:', key, val)
    );

    console.debug('VirtualDoc:', adapter.virtualDocument);

    const lspConnection = this._manager.connections.get(
      adapter.virtualDocument.uri
    );
    if (!lspConnection) {
      console.debug('No connection');
      return { start: 0, end: 0, items: [] };
    }

    const editor = adapter.activeEditor?.getEditor();

    console.debug('Editor:', editor);
    if (!editor) {
      console.debug('No active editor');
      return { start: 0, end: 0, items: [] };
    }
    console.log('Got editor' + editor);
    const selection = editor.getSelection();
    const virtualDocument = adapter.virtualDocument;
    const cursor = editor.getCursorPosition();
    //const token = editor.getEditor().getTokenAtCursor();
    const offset = editor.getOffsetAt(cursor);

    const cursorInRoot = this.transformFromEditorToRoot(
      virtualDocument,
      editor,
      cursor
    );

    const virtualCursor = virtualDocument.virtualPositionAtDocument(
      cursorInRoot as ISourcePosition
    );

    const positionInDoc = {
      character: virtualCursor.ch,
      line: virtualCursor.line
    };

    return lspConnection.clientRequests['textDocument/completion']
      .request({
        position: { ...positionInDoc },
        textDocument: { uri: adapter.virtualDocument.uri }
      })
      .then(resp => {
        console.debug('resp', resp);
        const items = [] as CompletionHandler.ICompletionItem[];
        items.push(...(resp as any).items);
        const response = {
          start: offset - selection.start.column,
          end: offset,
          items: items,
          source: {
            name: 'LSP',
            priority: 2
          }
        };

        return response;
      })
      .catch(e => {
        console.debug(e);
      });
  }

  transformFromEditorToRoot(
    virtualDocument: VirtualDocument,
    editor: CodeEditor.IEditor,
    position: CodeEditor.IPosition
  ): IRootPosition | null {
    const editorPosition = VirtualDocument.ceToCm(position) as IEditorPosition;
    return virtualDocument.transformFromEditorToRoot(
      editor as unknown as Document.IEditor,
      editorPosition
    );
  }

  identifier = 'CompletionProvider:lsp';
  renderer:
    | Completer.IRenderer<CompletionHandler.ICompletionItem>
    | null
    | undefined;
  private _manager: ILSPDocumentConnectionManager;
  private _app: JupyterFrontEnd;
  private _renderMine: IRenderMimeRegistry;
}

export namespace LspCompletionProvider {
  export interface IOptions {
    manager: ILSPDocumentConnectionManager;
    app: JupyterFrontEnd;
    renderMimeRegistry: IRenderMimeRegistry;
  }
}
