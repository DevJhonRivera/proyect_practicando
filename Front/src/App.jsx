import AppRouter from "./routes/AppRouter";
import SessionWatcher from "./components/auth/SessionWatcher";
import GlobalActivityIndicator from "./components/ui/GlobalActivityIndicator";
import ModuleErrorBoundary from "./components/ui/ModuleErrorBoundary";
import { useLocation } from "react-router-dom";

function App() {
  const { pathname } = useLocation();

  return (
    <>
      <SessionWatcher />
      <ModuleErrorBoundary pathname={pathname}>
        <AppRouter />
      </ModuleErrorBoundary>
      <GlobalActivityIndicator />
    </>
  );
}

export default App;
