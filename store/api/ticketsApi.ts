import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { CreateTicketInput, Ticket } from '@/lib/types';

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTickets: builder.query<Ticket[], void>({
      query: () => routePath(apiRoutes.tickets.root, apiRoutes.tickets.getList),
      /**
       * Normalised on the way in, exactly as the old TicketsPanel `load()`
       * did: rows stored before these two columns existed come back without
       * them, and every render path assumes they're present.
       */
      transformResponse: (rows: Ticket[]) =>
        rows.map((t) => ({ ...t, actionPoints: t.actionPoints ?? [], resolvedAt: t.resolvedAt ?? null })),
      providesTags: ['Tickets'],
    }),

    createTicket: builder.mutation<Ticket, CreateTicketInput>({
      query: (body) => ({
        url: routePath(apiRoutes.tickets.root, apiRoutes.tickets.create),
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tickets', 'DashboardBaseline'],
    }),

    updateTicket: builder.mutation<Ticket, { id: string; patch: Partial<Ticket> }>({
      query: ({ id, patch }) => ({
        url: routePath(apiRoutes.tickets.root, apiRoutes.tickets.updateById(id)),
        method: 'PATCH',
        body: patch,
      }),
      /**
       * Optimistic, then reconciled — the behaviour the panel had by hand.
       *
       * The optimistic half keeps typing in the description and ticking an
       * action point instant. The reconcile half matters just as much:
       * `resolvedAt` is stamped server-side, so an optimistic-only update
       * would leave a just-resolved ticket showing a blank closing date.
       * A failed request rolls the optimistic patch back.
       *
       * The cache is edited in place rather than invalidated so the list
       * doesn't visibly reload under the user mid-edit; only the dashboard
       * baseline is invalidated.
       */
      async onQueryStarted({ id, patch }, { dispatch, queryFulfilled }) {
        const optimistic = dispatch(
          ticketsApi.util.updateQueryData('getTickets', undefined, (draft) => {
            const row = draft.find((t) => t.id === id);
            if (row) Object.assign(row, patch);
          }),
        );
        try {
          const { data: saved } = await queryFulfilled;
          dispatch(
            ticketsApi.util.updateQueryData('getTickets', undefined, (draft) => {
              const i = draft.findIndex((t) => t.id === id);
              if (i !== -1) {
                draft[i] = { ...saved, actionPoints: saved.actionPoints ?? [], resolvedAt: saved.resolvedAt ?? null };
              }
            }),
          );
        } catch {
          optimistic.undo();
        }
      },
      invalidatesTags: ['DashboardBaseline'],
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
} = ticketsApi;
