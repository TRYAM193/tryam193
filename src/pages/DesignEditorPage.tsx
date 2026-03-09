import { Provider } from 'react-redux';
import { Routes, Route } from 'react-router';
// @ts-ignore
import { store } from '@/design-tool/redux/store';
// @ts-ignore
import EditorPanel from '@/design-tool/pages/Editor';
import FontLoader from '@/components/FontLoader';

export default function DesignEditorPage() {
  return (
    <Provider store={store}>
      <div className="w-full h-screen bg-background overflow-hidden">
          <FontLoader children={undefined} />

        <Routes>
          <Route path="/*" element={<EditorPanel />} />
        </Routes>
      </div>
    </Provider>
  );
}