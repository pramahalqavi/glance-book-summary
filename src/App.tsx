import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { MyLibraryPage } from './pages/MyLibraryPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ReaderPage } from './pages/ReaderPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AppShell>
                <HomePage />
              </AppShell>
            }
          />
          <Route
            path="/library"
            element={
              <AppShell>
                <MyLibraryPage />
              </AppShell>
            }
          />
          <Route
            path="/book/:bookId"
            element={
              <AppShell>
                <BookDetailPage />
              </AppShell>
            }
          />
          <Route path="/read/:bookId" element={<ReaderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
