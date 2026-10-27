import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getStoredTasks, saveStoredTasks } from './utils/storage';
import { applyNativeAlarmActions, isNativeApp, takeNativeAlarmActions } from './utils/nativeAlarms';

// Apply notification button presses made while the app was closed before the
// first render, so an already-snoozed alarm does not ring again on launch.
async function applyPendingNativeActions() {
  if (!isNativeApp()) return;
  const actions = await takeNativeAlarmActions();
  if (actions.length > 0) {
    saveStoredTasks(applyNativeAlarmActions(getStoredTasks(), actions));
  }
}

applyPendingNativeActions().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
