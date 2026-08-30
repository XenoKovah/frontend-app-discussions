/**
 * OST2: shadow-muting an author from the post actions menu.
 *
 * A shadow mute hides everything the author posts in this course from their
 * peers, while leaving it visible to the author themselves and to moderators.
 * The LMS does the hiding; this module only drives the moderator's toggle.
 */
import { useCallback } from 'react';

import { useToggle } from '@openedx/paragon';
import { useDispatch } from 'react-redux';

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { logError } from '@edx/frontend-platform/logging';

import { setAuthorShadowMuted as setCommentAuthorShadowMuted } from '../post-comments/data/slices';
import { setAuthorShadowMuted as setThreadAuthorShadowMuted } from '../posts/data/slices';

export const getShadowMuteApiUrl = (courseId) => (
  `${getConfig().LMS_BASE_URL}/api/discussion/v1/courses/${courseId}/shadow_mute/`
);

/**
 * Apply or lift a shadow mute on one author in one course.
 * @param {string} courseId
 * @param {string} username the author to mute or un-mute
 * @param {boolean} muted
 * @returns {Promise<{}>}
 */
export async function shadowMuteAuthor(courseId, username, muted) {
  const { data } = await getAuthenticatedHttpClient()
    .post(getShadowMuteApiUrl(courseId), { username, muted });
  return data;
}

/**
 * Toggle the mute, then flip the marker on every post and response by that
 * author that is already loaded, so the whole thread updates at once instead
 * of only the post the moderator happened to act on.
 */
export function toggleAuthorShadowMute(courseId, username, muted) {
  return async (dispatch) => {
    try {
      await shadowMuteAuthor(courseId, username, muted);
      dispatch(setThreadAuthorShadowMuted({ author: username, muted }));
      dispatch(setCommentAuthorShadowMuted({ author: username, muted }));
    } catch (error) {
      logError(error);
    }
  };
}

/**
 * Wire up the confirmation-gated toggle for one author.
 *
 * Returns the open/confirm/cancel handlers the actions menu and the
 * Confirmation dialog need, so posts, responses and replies can each offer the
 * action without repeating the plumbing.
 *
 * @param {string} courseId
 * @param {string} author
 * @param {boolean} authorShadowMuted current state, from the serialized content
 */
export function useShadowMute(courseId, author, authorShadowMuted) {
  const dispatch = useDispatch();
  const [isConfirming, showConfirmation, hideConfirmation] = useToggle(false);

  const confirm = useCallback(() => {
    dispatch(toggleAuthorShadowMute(courseId, author, !authorShadowMuted));
    hideConfirmation();
  }, [courseId, author, authorShadowMuted, hideConfirmation]);

  return {
    isConfirming,
    request: showConfirmation,
    cancel: hideConfirmation,
    confirm,
    muted: Boolean(authorShadowMuted),
  };
}
