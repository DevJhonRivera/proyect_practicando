import AppRouter from "./routes/AppRouter";
import SessionWatcher from "./components/auth/SessionWatcher";
import GlobalActivityIndicator from "./components/ui/GlobalActivityIndicator";

function App() {
  return (
    <>
      <SessionWatcher />
      <AppRouter />
      <GlobalActivityIndicator />
    </>
  );
}

export default App;
