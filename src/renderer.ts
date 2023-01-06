import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { CompletionHandler, Completer } from '@jupyterlab/completer';
import { JupyterFrontEnd } from '@jupyterlab/application';

export class BBCompletionRenderer
  extends Completer.Renderer
  implements Completer.IRenderer
{
  private app: JupyterFrontEnd;
  private renderMimeRegistry: IRenderMimeRegistry;

  constructor(app: JupyterFrontEnd, renderMimeRegistry: IRenderMimeRegistry) {
    //constructor() {
    super();
    this.app = app;
    this.renderMimeRegistry = renderMimeRegistry;
    console.log(this.app);
    console.log(this.renderMimeRegistry);
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
    const node = super.createDocumentationNode(item);
    const text = item.insertText ? item.insertText : item.label;
    const button = document.createElement('button');
    button.innerHTML = 'Click here for detailed documentation example';
    button.title = 'View additional documentation in side panel';
    button.onclick = async () => {
      await this.app.commands.execute('inspector:open', {
        refresh: true,
        text
      });
    };
    node.appendChild(button);

    return node;
  };
}
