import { Link, NavLink, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import BookmarkletPage from "./pages/BookmarkletPage";
import HomePage from "./pages/HomePage";

function navClassName({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-md px-3 py-1.5 text-sm font-medium transition",
    isActive
      ? "bg-stone-900 text-white"
      : "text-stone-600 hover:bg-stone-200 hover:text-stone-900",
  ].join(" ");
}

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-stone-900"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-xs font-bold text-white"
              >
                CB
              </span>
              <span className="text-base font-semibold tracking-tight">
                ContextBridge
              </span>
            </Link>
            <p className="text-sm text-stone-600">
              Carry a conversation from one AI chat to another.
            </p>
          </div>

          <nav
            aria-label="Primary"
            className="flex flex-wrap items-center gap-1.5"
          >
            <NavLink to="/" end className={navClassName}>
              Paste
            </NavLink>
            <NavLink to="/bookmarklet" className={navClassName}>
              Bookmarklet
            </NavLink>
          </nav>
        </div>
      </header>

      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bookmarklet" element={<BookmarkletPage />} />
        </Routes>
      </AppErrorBoundary>
    </div>
  );
}
