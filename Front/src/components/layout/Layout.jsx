import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout({
  children,
}) {
  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1">

        <Navbar />

        <main className="p-6">

          {children}

        </main>

      </div>

    </div>
  );
}

export default Layout;