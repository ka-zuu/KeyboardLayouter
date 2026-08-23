import Toolbar from './toolbar/Toolbar';
import LeftPanel from './panels/LeftPanel';
import Inspector from './panels/Inspector';
import StatusBar from './panels/StatusBar';
import CanvasArea from './canvas/CanvasArea';
import './App.css';

function App() {
  return (
    <div className="app-shell" data-testid="app-shell">
      <Toolbar />
      <div className="app-body">
        <LeftPanel />
        <CanvasArea />
        <Inspector />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
