const TIMEOUT_DEFAULT = 5000;
const SOURCE_DASHBOARD = 'sakshi-dashboard';
const SOURCE_EXTENSION = 'sakshi-extension';

function sendAndReceive(sendMessage, expectedReplyType, timeoutMs = TIMEOUT_DEFAULT) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error(`Timeout waiting for ${expectedReplyType} from extension`));
    }, timeoutMs);

    const listener = (event) => {
      if (event.data && event.data.source === SOURCE_EXTENSION && event.data.type === expectedReplyType) {
        window.removeEventListener('message', listener);
        clearTimeout(timeout);
        resolve(event.data);
      }
    };

    window.addEventListener('message', listener);
    window.postMessage({ ...sendMessage, source: SOURCE_DASHBOARD }, '*');
  });
}

export function pingExtension(timeoutMs = 2000) {
  return sendAndReceive({ type: 'PING' }, 'PONG', timeoutMs)
    .then(data => ({ connected: true, version: data.version }))
    .catch(() => ({ connected: false }));
}

export function startSession({ intention, durationMin, graceMinutes, profile }) {
  return sendAndReceive({
    type: 'START_SESSION',
    payload: { intention, durationMin, graceMinutes, profile }
  }, 'SESSION_STARTED').then(data => ({ sessionId: data.sessionId }));
}

export function endSession() {
  return sendAndReceive({ type: 'END_SESSION' }, 'SESSION_ENDED')
    .then(data => ({ summary: data.summary }));
}

export function getData() {
  return sendAndReceive({ type: 'GET_DATA' }, 'DATA')
    .then(data => ({ sessions: data.sessions, activeSession: data.activeSession }));
}

export function returnToWork({ domain, turnOff = true } = {}) {
  window.postMessage({
    source: SOURCE_DASHBOARD,
    type: 'RETURN_TO_WORK',
    payload: { domain, turnOff }
  }, '*');
}

export function continueAnyway() {
  window.postMessage({
    source: SOURCE_DASHBOARD,
    type: 'CONTINUE_ANYWAY'
  }, '*');
}

export function subscribeToExtension(callback) {
  const listener = (event) => {
    if (event.data && event.data.source === SOURCE_EXTENSION) {
      callback(event.data);
    }
  };
  window.addEventListener('message', listener);
  return () => {
    window.removeEventListener('message', listener);
  };
}
