import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { CompletionHandler, Completer } from '@jupyterlab/completer';
import { JupyterFrontEnd } from '@jupyterlab/application';

export class CustomRenderer
  extends Completer.Renderer
  implements Completer.IRenderer
{
  constructor(app: JupyterFrontEnd, renderMimeRegistry: IRenderMimeRegistry) {
    super();
  }

  createCompletionItemNode(
    item: CompletionHandler.ICompletionItem,
    orderedTypes: string[]
  ): HTMLLIElement {
    const label = item.label;
    console.log('In createCompletionItemNode:  ' + label);
    const li = super.createCompletionItemNode(item, orderedTypes);
    return li;
  }

  createDocumentationNode = (
    item: CompletionHandler.ICompletionItem
  ): HTMLElement => {
    console.log('In createDocumentationNode');
    const node = super.createDocumentationNode(item);
    return node;
  };
}
