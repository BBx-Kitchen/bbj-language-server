import { MonacoEditorLanguageClientWrapper } from 'monaco-editor-wrapper';
import { buildWorkerDefinition } from 'monaco-editor-workers';
import monarch from './monarch';

buildWorkerDefinition('/editor/workers', window.origin, false);
MonacoEditorLanguageClientWrapper.addMonacoStyles('monaco-editor-styles');

const wrapper = new MonacoEditorLanguageClientWrapper('bbj');
const config = wrapper.getEditorConfig();
config.setMainLanguageId('bbj');
config.setMonarchTokensProvider(monarch);

config.setUseLanguageClient(true);
    config.setUseWebSocket(false);
    config.setLanguageClientConfigOptions({
        workerType: 'classic',
        workerURL: '/language/main-browser.js',
    });

config.setAutomaticLayout(true);
config.setMainCode(`x = 1, z = 2

some_object! = ""
a!
next 

IF some_object! <> 3 THEN ?"x", STR(some_object!); ?"y"; ? "z"; rem af

if some_object! = null() then methodret 

IF some_object! <> 3 THEN
    PRINT "some_object is "
    PRINT "some_object is "
ELSE
    PRINT "some_object is " 
ENDIF

next 

DIM sss[1]
`);


wrapper.startEditor(document.getElementById('editor')!);
