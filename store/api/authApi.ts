import { baseApi } from './baseApi';
import { apiRoutes, routePath } from '@/constants/apiRoutes';
import type {
  AuthedUser,
  ChangePasswordInput,
  LoginResponse,
  UpdateProfileInput,
} from '@/lib/types';

/**
 * Sign-in and self-service profile management.
 *
 * `login` is a mutation rather than a query: it isn't cacheable and must
 * only run when the user submits the form. It's also the one endpoint the
 * backend leaves public — everything else here needs the bearer token that
 * login hands back.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.login),
        method: 'POST',
        body,
      }),
    }),

    /**
     * The signed-in user's own record, re-read from the database rather than
     * decoded from the token — so a role or team change made by an admin
     * shows up without waiting for the token to expire.
     */
    me: builder.query<AuthedUser, void>({
      query: () => routePath(apiRoutes.auth.root, apiRoutes.auth.me),
      providesTags: ['Profile'],
    }),

    updateProfile: builder.mutation<AuthedUser, UpdateProfileInput>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.updateProfile),
        method: 'PATCH',
        body,
      }),
      // The org directory shows this name too, so refresh both.
      invalidatesTags: ['Profile', 'Employees'],
    }),

    /**
     * Returns no body — the token stays valid, so there's nothing to
     * re-issue and no cached data the change affects.
     */
    changePassword: builder.mutation<void, ChangePasswordInput>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.changePassword),
        method: 'POST',
        body,
      }),
    }),

    // Forgot-password flow (all public). Step 1: email an OTP.
    forgotPassword: builder.mutation<{ success: true }, { email: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.forgotPassword),
        method: 'POST',
        body,
      }),
    }),

    // Step 2: verify the OTP → short-lived reset token.
    verifyOtp: builder.mutation<{ resetToken: string }, { email: string; otp: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.verifyOtp),
        method: 'POST',
        body,
      }),
    }),

    // Step 3: set the new password using the reset token.
    resetPassword: builder.mutation<{ success: true }, { resetToken: string; newPassword: string }>({
      query: (body) => ({
        url: routePath(apiRoutes.auth.root, apiRoutes.auth.resetPassword),
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
} = authApi;
