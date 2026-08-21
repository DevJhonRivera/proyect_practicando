import AppRouter from "./routes/AppRouter";
import SessionWatcher from "./components/auth/SessionWatcher";

function App() {
  return (
    <>
      <SessionWatcher />
      <AppRouter />
    </>
  );
}

export default App;
