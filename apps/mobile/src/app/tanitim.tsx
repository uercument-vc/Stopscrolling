import { router } from 'expo-router';

import { Tutorial } from '@/components/tutorial';
import { Screen } from '@/components/ui';

/** Tanıtımı onboarding'den sonra tekrar izlemek için (Tarif → "Uygulama nasıl çalışır?"). */
export default function TutorialScreen() {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen withTabBar={false}>
      <Tutorial onDone={close} doneLabel="Anladım" />
    </Screen>
  );
}
