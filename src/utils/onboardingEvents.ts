import { onboardingService } from '../services/onboarding.service';

export const ONBOARDING_REFRESH = 'onboarding:refresh';

export function refreshOnboarding() {
  onboardingService.invalidarCache();
  window.dispatchEvent(new CustomEvent(ONBOARDING_REFRESH));
}
