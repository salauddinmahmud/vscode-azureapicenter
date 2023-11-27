import * as vscode from 'vscode';
import { commands } from "vscode";

// Commands
// Copilot

// Tree View UI
import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeDataProvider, AzExtTreeItem, IActionContext, createAzExtOutputChannel, registerCommand, registerEvent } from '@microsoft/vscode-azext-utils';
import { showOpenApi } from './commands/editOpenApi';
import { exportOpenApi } from './commands/exportOpenApi';
import { generateApiLibrary } from './commands/generateApiLibrary';
import { generateHttpFile } from './commands/generateHttpFile';
import { importOpenApi } from './commands/importOpenApi';
import { openAPiInSwagger } from './commands/openApiInSwagger';
import { refreshTree } from './commands/refreshTree';
import { testInPostman } from './commands/testInPostman';
import { doubleClickDebounceDelay, selectedNodeKey } from './constants';
import { ext } from './extensionVariables';
import { ApiVersionDefinitionTreeItem } from './tree/ApiVersionDefinitionTreeItem';
import { AzureAccountTreeItem } from './tree/AzureAccountTreeItem';
import { OpenApiEditor } from './tree/Editors/openApi/OpenApiEditor';

// Copilot Chat
import { IChatAgentResult, handleChatMessage } from './copilot-chat/copilotChat';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "azure-api-center" is now active!');

    // https://github.com/microsoft/vscode-azuretools/tree/main/azure
    ext.context = context;
    ext.outputChannel = createAzExtOutputChannel('Azure API Center', ext.prefix);
    context.subscriptions.push(ext.outputChannel);
    registerAzureUtilsExtensionVariables(ext);

    const azureAccountTreeItem = new AzureAccountTreeItem();
    context.subscriptions.push(azureAccountTreeItem);
    ext.treeItem = azureAccountTreeItem;
    // var a = ext.treeItem.subscription;

    const treeDataProvider = new AzExtTreeDataProvider(azureAccountTreeItem, "appService.loadMore");

    const treeView = vscode.window.createTreeView("apiCenterTreeView", { treeDataProvider });
    context.subscriptions.push(treeView);

    treeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<AzExtTreeItem>) => {
        const selectedNode = e.selection[0];
        ext.outputChannel.appendLine(selectedNode.id!);
        ext.context.globalState.update(selectedNodeKey, selectedNode.id);
    });

    // Register API Center extension commands
    registerCommand('azure-api-center.selectSubscriptions', () => commands.executeCommand('azure-account.selectSubscriptions'));

    // TODO: move all three to their separate files
    registerCommand('azure-api-center.importOpenApiByFile', async (context: IActionContext, node?: ApiVersionDefinitionTreeItem) => { await importOpenApi(context, node, false); });
    registerCommand('azure-api-center.importOpenApiByLink', async (context: IActionContext, node?: ApiVersionDefinitionTreeItem) => { await importOpenApi(context, node, true); });
    registerCommand('azure-api-center.exportOpenApi', async (context: IActionContext, node?: ApiVersionDefinitionTreeItem) => { await exportOpenApi(context, node); });

    // TODO: move this to a separate file
    const openApiEditor: OpenApiEditor = new OpenApiEditor();
    context.subscriptions.push(openApiEditor);
    ext.openApiEditor = openApiEditor;

    // TODO: move this to a separate file
    ext.openApiEditor = openApiEditor;

    registerEvent('azure-api-center.openApiEditor.onDidSaveTextDocument',
        vscode.workspace.onDidSaveTextDocument,
        async (actionContext: IActionContext, doc: vscode.TextDocument) => { await openApiEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azure-api-center.showOpenApi', showOpenApi, doubleClickDebounceDelay);

    registerCommand('azure-api-center.open-api-docs', openAPiInSwagger);

    registerCommand('azure-api-center.open-postman', testInPostman);

    registerCommand('azure-api-center.generate-api-client', generateApiLibrary);

    registerCommand('azure-api-center.generateHttpFile', generateHttpFile);

    registerCommand('azure-api-center.apiCenterTreeView.refresh', async (context: IActionContext) => refreshTree(context));

    const agent = vscode.chat.createChatAgent('apicenter', handleChatMessage);
    agent.description = 'Build, discover, and consume great APIs.';
    agent.fullName = "Azure API Center";
    agent.slashCommandProvider = {
        provideSlashCommands(token) {
            return [
                {
                    name: 'list',
                    description: 'List available APIs.',
                },
                {
                    name: 'find',
                    description: 'Find an API given a search query.',
                },
                {
                    name: 'describe',
                    description: 'Describe an API.',
                }
            ];
        },
    };
    agent.followupProvider = {
        provideFollowups(result: IChatAgentResult, token: vscode.CancellationToken) {
            if (result.slashCommand === 'list') {
                return [{
                    message: '@apicenter /list $more',
                    title: 'List more APIs'
                }];
            } else if (result.slashCommand === 'find') {
                return [{
                    message: '@apicenter /find $more',
                    title: 'Find in more APIs'
                }];
            }
        }
    };

    context.subscriptions.push(agent);
}

export function deactivate() { }