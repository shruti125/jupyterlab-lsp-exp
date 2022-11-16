import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Initialization data for the lsp_tests extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'lsp_tests:plugin',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension lsp_tests is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('lsp_tests settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for lsp_tests.', reason);
        });
    }
  }
};

export default plugin;
