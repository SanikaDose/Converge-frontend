import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type { NotificationItem } from '@/lib/types';

/**
 * The signed-in user's bell feed — tasks assigned to them, projects they
 * lead, and tickets assigned to them. Identity comes from the token on the
 * backend, so this takes no argument. Derived live on read, so it's always
 * in step with the underlying projects/tasks/tickets.
 */
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationItem[], void>({
      query: () => routePath(apiRoutes.notifications.root, apiRoutes.notifications.getList),
      providesTags: ['Notifications'],
    }),
    // Clears the unread flag on the caller's stored notifications (bell opened).
    markNotificationsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({
        url: routePath(apiRoutes.notifications.root, apiRoutes.notifications.markRead),
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationsReadMutation } = notificationsApi;
