import EditorLayout from '@/components/editor/EditorLayout';
import CanvasWrapper from '@/components/editor/CanvasArea/CanvasWrapper';
import { DevStoreExporter } from '@/components/DevStoreExporter';

export default function Home() {
  return (
    <EditorLayout>
      <DevStoreExporter />
      <CanvasWrapper />
    </EditorLayout>
  );
}
