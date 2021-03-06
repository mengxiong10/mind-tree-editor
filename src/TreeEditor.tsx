import React, { useRef, useEffect, useState } from 'react';
import EditorContext from './EditorContext';
import ContextMenu from './ContextMenu';
import EditorInput from './EditorInput';
import Editor from './editor';

const { Provider } = EditorContext;

function TreeEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    const ed: any = new Editor({ container: containerRef.current });
    setEditor(ed);
    return () => {
      ed.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <Provider value={editor}>
        {editor && (
          <>
            <ContextMenu />
            <EditorInput />
          </>
        )}
      </Provider>
    </div>
  );
}

export default TreeEditor;
