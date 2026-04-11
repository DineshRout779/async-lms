import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppRoutes from './routes/AppRoutes.tsx';
import { Provider } from 'react-redux';
import { store } from './app/store.ts';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/common/ErrorBoundary.tsx';

// Only bundle React Query devtools in development builds.
// Dynamic import + null in production means Rollup excludes the entire module.
// const ReactQueryDevtools = import.meta.env.DEV
//   ? lazy(() =>
//       import('@tanstack/react-query-devtools').then((m) => ({
//         default: m.ReactQueryDevtools,
//       })),
//     )
//   : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <AppRoutes />
          </Provider>
          {/* {ReactQueryDevtools && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )} */}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
