import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';

/**
 * Redux store, following the Scout frontend's `app/store/store.ts`.
 *
 * There are no hand-written slices: Converge's non-server state (session,
 * theme, role) already lives in React context and is unrelated to data
 * fetching, so moving it here would be churn with no benefit and would
 * change behaviour the UI depends on. This store exists to host RTK
 * Query's cache — slices can be added alongside the reducer below if that
 * ever changes.
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
