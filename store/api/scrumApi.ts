import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { ScrumEntry, ScrumSavePayload } from '@/lib/types';

/**
 * Daily scrum board. `getScrum` reads one day's saved updates (the page merges
 * them with the org directory to render a row per employee); `saveScrum` upserts
 * the whole day. Cached per date via the Scrum tag.
 */
export const scrumApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScrum: builder.query<ScrumEntry[], string>({
      query: (date) => `${routePath(apiRoutes.scrum.root, apiRoutes.scrum.getByDate)}?date=${date}`,
      providesTags: (_r, _e, date) => [{ type: 'Scrum', id: date }],
    }),

    saveScrum: builder.mutation<ScrumEntry[], ScrumSavePayload>({
      query: (body) => ({
        url: routePath(apiRoutes.scrum.root, apiRoutes.scrum.save),
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { date }) => [{ type: 'Scrum', id: date }],
    }),
  }),
});

export const { useGetScrumQuery, useSaveScrumMutation } = scrumApi;
