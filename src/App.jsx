import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar      from './components/Navbar/Navbar';
import Footer      from './components/Footer/Footer';
import Newsletter  from './components/Newsletter/Newsletter';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import Home        from './pages/Home/Home';
import About       from './pages/About/About';
import Shop        from './pages/Shop/Shop';
import Contact     from './pages/Contact/Contact';
import './styles/global.css';
import './styles/reveal.css';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />

      <Routes>
        <Route path="/"        element={<Home />}    />
        <Route path="/shop"    element={<Shop />}    />
        <Route path="/about"   element={<About />}   />
        <Route path="/contact" element={<Contact />} />
        <Route path="*"        element={<Home />}    />
      </Routes>

      <Newsletter />
      <Footer />
    </BrowserRouter>
  );
}
