import { CanDeactivateFn } from '@angular/router';
import { MyKitComponent } from './my-kit.component';

// The browser's native beforeunload warning (see MyKitComponent.warnBeforeUnload) only fires on
// a real page unload — refresh, close tab, typed URL. Clicking an in-app nav link is an Angular
// Router navigation, not a page unload, so beforeunload never sees it. This guard covers that
// case: block in-app navigation away from an unsaved bare /my-kit quiz result until confirmed via
// the app's own ConfirmLeavePopupComponent (not window.confirm(), which looks like browser chrome).
export const confirmLeaveMyKitGuard: CanDeactivateFn<MyKitComponent> = (component) => component.confirmLeave();
