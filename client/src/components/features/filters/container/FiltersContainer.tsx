import React from 'react';
import styles from './FiltersContainer.module.css';
import { useFiltersState } from '../hooks/useFiltersState';
import { useFiltersUrlSync, getInitialFiltersFromUrl } from '../hooks/useFiltersUrlSync';
import { useFilteredProducts } from '../hooks/useFilteredProducts';
import FilterPanel from '../panel/FilterPanel/FilterPanel';
import ProductsResults from '../results/ProductsResults';

const FiltersContainer: React.FC = () => {
  const initial = React.useMemo(() => getInitialFiltersFromUrl(), []);
  const { 
    state, 
    setSort, 
    setPriceMin, 
    setPriceMax, 
    toggleCategory, 
    toggleAttribute, 
    clearAttribute, 
    setPage, 
    setPageSize, 
    reset 
  } = useFiltersState(initial);
  useFiltersUrlSync(state);
  const { products, meta, loading, error, refetch } = useFilteredProducts(state);

  const handleReset = () => {
    reset();
    setPage(1);
  };

  return (
    <div className={styles.layout}>
      <div className={styles.leftPanel}>
        <FilterPanel
          state={state}
          setSort={(s) => { setSort(s); setPage(1); }}
          setPriceMin={(v) => { setPriceMin(v); setPage(1); }}
          setPriceMax={(v) => { setPriceMax(v); setPage(1); }}
          toggleCategory={(id) => { toggleCategory(id); setPage(1); }}
          toggleAttribute={(key, value) => { toggleAttribute(key, value); setPage(1); }}
          clearAttribute={(key) => { clearAttribute(key); setPage(1); }}
          reset={handleReset}
          onClearPriceFilter={() => { setPriceMin(null); setPriceMax(null); setPage(1); }}
        />
      </div>
      <div className={styles.content}>
        <ProductsResults
          products={products}
          meta={meta}
          loading={loading}
          error={error}
          onRetry={refetch}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(sz) => setPageSize(sz)}
        />
      </div>
    </div>
  );
};

export default FiltersContainer;
