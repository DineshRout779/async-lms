import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppRoutes from './routes/AppRoutes.tsx';
import { Provider } from 'react-redux';
import { store } from './app/store.ts';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <AppRoutes />
        </Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
