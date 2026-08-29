import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collections as fallbackCollections, getAllProducts, getBestsellers } from '../data/products';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [collections, setCollections] = useState(fallbackCollections);
  const [isLoading, setIsLoading] = useState(true);
  const [isDatabaseBacked, setIsDatabaseBacked] = useState(false);
  const [imageAssets, setImageAssets] = useState({});
  const [siteAssets, setSiteAssets] = useState({});
  const [siteSettings, setSiteSettings] = useState({ homeCarousel: [] });

  const refreshCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/catalog', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue API unavailable');
      const payload = await response.json();
      if (Array.isArray(payload.collections)) {
        setCollections(payload.collections);
        setIsDatabaseBacked(true);
      }
      setImageAssets(payload.imageAssets || {});
      setSiteAssets(payload.siteAssets || {});
      setSiteSettings(payload.siteSettings || { homeCarousel: [] });
    } catch {
      setCollections(fallbackCollections);
      setIsDatabaseBacked(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshCatalog(); }, [refreshCatalog]);

  const value = useMemo(() => ({
    collections,
    products: getAllProducts(collections),
    bestsellers: getBestsellers(collections),
    isLoading,
    isDatabaseBacked,
    imageAssets,
    siteAssets,
    siteSettings,
    refreshCatalog,
  }), [collections, isLoading, isDatabaseBacked, imageAssets, siteAssets, siteSettings, refreshCatalog]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be inside CatalogProvider');
  return context;
}
