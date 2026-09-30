const EVENT_NAME = "polarizadosya:activity";
let pendingActions = 0;

const notify = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: { pendingActions },
  }));
};

export const startActivity = () => {
  pendingActions += 1;
  notify();
};

export const finishActivity = () => {
  pendingActions = Math.max(pendingActions - 1, 0);
  notify();
};

export const subscribeToActivity = (listener) => {
  const handler = (event) => listener(event.detail?.pendingActions || 0);
  window.addEventListener(EVENT_NAME, handler);
  listener(pendingActions);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
