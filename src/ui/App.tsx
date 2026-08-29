import Toolbar from './toolbar/Toolbar';
import LeftPanel from './panels/LeftPanel';
import Inspector from './panels/Inspector';
import StatusBar from './panels/StatusBar';
import CanvasArea from './canvas/CanvasArea';
import { useAutoSave } from './hooks/useAutoSave';
import { useBootstrap } from './hooks/useBootstrap';
import { useTheme } from './theme/useTheme';
import './App.css';

function App() {
  const bootstrapStatus = useBootstrap();
  const saveStatus = useAutoSave({ enabled: bootstrapStatus === 'ready' });
  useTheme();

  return (
    <div className="app-shell" data-testid="app-shell">
      <Toolbar />
      <div className="app-body">
        <LeftPanel />
        <CanvasArea />
        <Inspector />
      </div>
      <StatusBar saveStatus={saveStatus} />
    </div>
  );
}

export default App;
