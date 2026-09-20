import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import SeriesPage from "./pages/SeriesPage";
import PeliculasPage from "./pages/PeliculasPage";
import ListingPage from "./pages/ListingPage";
import SearchPage from "./pages/SearchPage";
import MiListaPage from "./pages/MiListaPage";
import DetailPage from "./pages/DetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="series" element={<SeriesPage />} />
          <Route path="peliculas" element={<PeliculasPage />} />
          <Route path="listing/:type" element={<ListingPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="mi-lista" element={<MiListaPage />} />
          <Route path="peliculas/:slug" element={<DetailPage />} />
          <Route path="series/:slug" element={<DetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
