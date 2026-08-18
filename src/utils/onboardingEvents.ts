export const ONBOARDING_REFRESH = 'onboarding:refresh';

export function refreshOnboarding() {
  window.dispatchEvent(new CustomEvent(ONBOARDING_REFRESH));
}
