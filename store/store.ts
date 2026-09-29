import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';

/**
 * Redux store. Its only job is to host RTK Query's cache — there are no
 * hand-written slices, since non-server state (session, theme, role) lives in
 * React context. Add slices alongside the reducer below if that changes.
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
