/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Completer,
  CompletionHandler,
  ICompletionContext,
  ICompletionProvider
  // CompleterModel
} from '@jupyterlab/completer';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILSPDocumentConnectionManager } from '@jupyterlab/lsp';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { BBCompletionRenderer } from './renderer';
// import { Widget } from '@lumino/widgets';

export interface ICompletionsSource {
  /**
   * The name displayed in the GUI
   */
  name: string;
  /**
   * The higher the number the higher the priority
   */
  priority: number;
  /**
   * The icon to be displayed if no type icon is present
   */
  fallbackIcon?: LabIcon;
}

export interface ICompletionsReply
  extends CompletionHandler.ICompletionItemsReply {
  // TODO: it is not clear when the source is set here and when on IExtendedCompletionItem.
  //  it might be good to separate the two stages for both interfaces
  source: ICompletionsSource | null;
  items: CompletionHandler.ICompletionItem[];
}

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
  ): Promise<
    CompletionHandler.ICompletionItemsReply<CompletionHandler.ICompletionItem>
  > {
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

    const lspConnection = this._manager.connections.get(adapter.documentPath);
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
    lspConnection.clientRequests['textDocument/completion']
      .request({
        position: {
          character: selection.start.column,
          line: selection.start.line
        },
        textDocument: { uri: adapter.virtualDocument.uri }
      })
      .then(async resp => {
        console.debug('resp', resp);
        const items = [] as CompletionHandler.ICompletionItem[];
        items.push(...(resp as any).items);
        const response = {
          start: selection.start.column - selection.end.column,
          end: selection.end.column,
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

    const promise: Promise<CompletionHandler.ICompletionItemsReply | any> =
      new Promise(() => 'done');

    console.log('In fetch' + this._manager);
    return promise;
  }

  identifier = 'CompletionProvider:lsp';
  renderer:
    | Completer.IRenderer<CompletionHandler.ICompletionItem>
    | null
    | undefined;
  private _manager: ILSPDocumentConnectionManager;
  private _app: JupyterFrontEnd;
  // //private renderer: IRenderMimeRegistry;
  private _renderMine: IRenderMimeRegistry;
}

export namespace LspCompletionProvider {
  export interface IOptions {
    manager: ILSPDocumentConnectionManager;
    app: JupyterFrontEnd;
    renderMimeRegistry: IRenderMimeRegistry;
  }
}
