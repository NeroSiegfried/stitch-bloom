import { HashRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar      from './components/Navbar/Navbar';
import CartDrawer  from './components/CartDrawer/CartDrawer';
import Footer      from './components/Footer/Footer';
import Newsletter  from './components/Newsletter/Newsletter';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import Home          from './pages/Home/Home';
import About         from './pages/About/About';
import Shop          from './pages/Shop/Shop';
import Contact       from './pages/Contact/Contact';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import './styles/global.css';
import './styles/reveal.css';

export default function App() {
  return (
    <CartProvider>
    <HashRouter>
      <ScrollToTop />
      <Navbar />
      <CartDrawer />

      <Routes>
        <Route path="/"         element={<Home />}          />
        <Route path="/shop"     element={<Shop />}          />
        <Route path="/shop/:id" element={<ProductDetail />} />
        <Route path="/about"    element={<About />}         />
        <Route path="/contact"  element={<Contact />}       />
        <Route path="*"         element={<Home />}          />
      </Routes>

      <Newsletter />
      <Footer />
    </HashRouter>
    </CartProvider>
  );
}
