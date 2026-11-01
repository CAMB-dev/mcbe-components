import {createRoot} from 'react-dom/client';
import type {ChatComposerProps,ChatTranscriptProps} from 'mcbeui';
import 'mcbeui/chat-screen.css';import 'mcbeui/chat-composer.css';import 'mcbeui/chat-transcript.css';
import {App} from './app';
createRoot(document.getElementById('app')!).render(<App/>);
type ComposerMode=ChatComposerProps['mode'];
// @ts-expect-error Unsupported draft mode.
const invalidMode:ComposerMode='automatic';void invalidMode;
// @ts-expect-error Source child count is the literal 100.
const invalidChildren:ChatTranscriptProps['maxChildren']=99;void invalidChildren;
