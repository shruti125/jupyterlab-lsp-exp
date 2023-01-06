import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

// import { MainAreaWidget } from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ICompletionProviderManager } from '@jupyterlab/completer';

import {
  IFeature,
  ILSPDocumentConnectionManager,
  ILSPFeatureManager
} from '@jupyterlab/lsp';

import { LspCompletionProvider } from './lsp_provider';

// import { Widget } from '@lumino/widgets';

// import { UUID } from '@lumino/coreutils';

/**
 * Initialization data for the lsp_tests extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'lsp_tests:plugin',
  autoStart: true,
  requires: [IEditorTracker, IRenderMimeRegistry, ICompletionProviderManager],
  optional: [ILSPDocumentConnectionManager, ILSPFeatureManager],
  activate: (
    app: JupyterFrontEnd,
    editorTracker: IEditorTracker,
    rendermime: IRenderMimeRegistry,
    providerManager: ICompletionProviderManager,
    lspManager?: ILSPDocumentConnectionManager,
    featureManager?: ILSPFeatureManager
  ) => {
    console.log(
      'JupyterLab extension lsp_tests is activated!',
      lspManager,
      featureManager
    );

    if (!lspManager || !featureManager) {
      return;
    }

    console.debug('Help:');
    const ft: IFeature = {
      id: 'lsp_tests:plugin:help',
      capabilities: {
        textDocument: {
          signatureHelp: {
            contextSupport: true,
            dynamicRegistration: undefined,
            signatureInformation: {
              activeParameterSupport: undefined,
              documentationFormat: ['markdown', 'plaintext'],
              parameterInformation: {
                labelOffsetSupport: undefined
              }
            }
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: false,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: false,
              tagSupport: {
                valueSet: [1]
              }
            },
            contextSupport: true
          }
        },
        notebookDocument: {
          synchronization: {
            dynamicRegistration: true
          }
        }
      }
    };

    featureManager.register(ft);
    const provider = new LspCompletionProvider({
      manager: lspManager,
      app: app,
      renderMimeRegistry: rendermime
    });
    providerManager.registerProvider(provider);

    // editorTracker.currentChanged.connect(async (sender, args) => {
    //   if (!args) {
    //     console.debug('No current document');
    //     return;
    //   }

    //   const adapter = lspManager.adapters.get(args.context.path);
    //   if (!adapter) {
    //     console.debug('No adapter');
    //     return;
    //   }

    //   await adapter.ready;

    //   lspManager.connections.forEach((val, key) =>
    //     console.debug('key:', key, val)
    //   );

    //   console.debug('VirtualDoc:', adapter.virtualDocument);

    //   const lspConnection = lspManager.connections.get(adapter.documentPath);
    //   if (!lspConnection) {
    //     console.debug('No connection');
    //     return;
    //   }

    //   const editor = adapter.activeEditor?.getEditor();
    //   console.debug('Editor:', editor);
    //   if (!editor) {
    //     console.debug('No active editor');
    //     return;
    //   }

    //   editor.host.onclick = () => {
    //     console.debug('Click');

    //     const selection = editor.getSelection();
    //     console.debug('Selections:', selection);
    //     lspConnection.clientRequests['textDocument/signatureHelp']
    //       .request({
    //         position: {
    //           character: selection.start.column,
    //           line: selection.start.line
    //         },
    //         textDocument: { uri: adapter.virtualDocument.uri }
    //       })
    //       .then(async resp => {
    //         console.debug('resp', resp);
    //         const documentation = resp.signatures[0].documentation;
    //         if (!documentation) {
    //           console.debug('No Documentation');
    //           return;
    //         }
    //         const docs = await rendermime.markdownParser?.render(
    //           (documentation as any).value
    //         )!;
    //         const panel = new Widget();
    //         panel.id = UUID.uuid4();
    //         panel.node.innerHTML = docs;
    //         app.shell.add(new MainAreaWidget({ content: panel }));
    //       })
    //       .catch(e => {
    //         console.debug(e);
    //       });

    //     // auto complete
    //     lspConnection.clientRequests['textDocument/completion']
    //       .request({
    //         position: {
    //           character: selection.start.column,
    //           line: selection.start.line
    //         },
    //         textDocument: { uri: adapter.virtualDocument.uri }
    //       })
    //       .then(async resp => {
    //         console.debug('resp', resp);
    //         const documentation = { value: 'test' };
    //         if (!documentation) {
    //           console.debug('No Documentation');
    //           return;
    //         }
    //         // const docs = await rendermime.markdownParser?.render(
    //         //   (documentation as any).value
    //         // )!;
    //         const panel = new Widget();
    //         panel.id = UUID.uuid4();
    //         let results = '';
    //         for (let i = 0; i < (resp as any).items.length; i++) {
    //           results += (resp as any).items[i].label;
    //           results += '<br>';
    //         }
    //         panel.node.innerHTML = results;
    //         app.shell.add(new MainAreaWidget({ content: panel }));
    //       })
    //       .catch(e => {
    //         console.debug(e);
    //       });
    //   };
    // });
  }
};

export default plugin;
