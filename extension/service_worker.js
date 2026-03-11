// Ensures an offscreen document is available to run legacy background logic
// that depends on a DOM-like environment (e.g., jQuery-based code).

const OFFSCREEN_URL = "background.html";

async function ensureOffscreenDocument() {
  if (chrome.offscreen) {
    try {
      // If an offscreen document already exists, creating again will error; ignore that.
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ["IFRAME_SCRIPTING"],
        justification: "Run legacy background logic that needs a DOM context"
      });
    } catch (e) {
      // Ignore errors if the document already exists
    }
  }
}

// Create offscreen document when the service worker starts
ensureOffscreenDocument();

// Also ensure on install and on startup
chrome.runtime.onInstalled.addListener(() => {
  ensureOffscreenDocument();
});

chrome.runtime.onStartup.addListener(() => {
  ensureOffscreenDocument();
});

// Optional: Wake the offscreen page if messages arrive while it's starting up
chrome.runtime.onMessage.addListener((_msg, _sender, _sendResponse) => {
  ensureOffscreenDocument();
  // Handle delegated downloads from offscreen page/content scripts
  try {
    if (_msg && _msg.__downloadDataUrl && _msg.url && _msg.filename) {
      chrome.downloads.download({ url: _msg.url, filename: _msg.filename }, (downloadId) => {
        if (!downloadId) {
          _sendResponse({ status: 'error' });
          return;
        }
        const onChanged = function (item) {
          if (item.id === downloadId && item.state) {
            if (item.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(onChanged);
              _sendResponse({ status: 'ok' });
            } else if (item.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(onChanged);
              _sendResponse({ status: 'error' });
            }
          }
        };
        chrome.downloads.onChanged.addListener(onChanged);
      });
      return true; // keep the message channel open for async response
    }
  } catch (e) {
    try { _sendResponse({ status: 'error' }); } catch (_) {}
  }
  // Bridge DevTools -> ContentScript calls directly in the service worker to
  // avoid timing issues when offscreen document listeners are not yet ready.
  try {
    // Bridge StoreDevtools -> Background offscreen for reliability
    if (_msg && _msg.__serviceBridge) {
      const forward = Object.assign({}, _msg, { __fromSW: true });
      delete forward.__serviceBridge;
      chrome.runtime.sendMessage(forward, (resp) => {
        try { _sendResponse(resp); } catch (_) {}
      });
      return true;
    }
    if (_msg && _msg.contentScriptCall) {
      const reqToContentScript = _msg;

      const sendToTab = (tabId) => {
        if (!tabId || typeof tabId !== 'number') {
          _sendResponse({ error: 'Invalid tabId for content script call' });
          return;
        }

        const isHttp = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

        chrome.tabs.get(tabId, (tab) => {
          if (!tab || !isHttp(tab.url)) {
            try { _sendResponse({ error: 'Cannot inject into non-http(s) page' }); } catch (_) {}
            return;
          }

          const injectContentScripts = () => new Promise((resolve, reject) => {
            try {
              chrome.scripting.insertCSS({
                target: { tabId, allFrames: true },
                files: [ "content_script/content_script.css" ]
              }, () => {
                chrome.scripting.executeScript({
                  target: { tabId, allFrames: true },
                  files: [
                    "assets/jquery-2.0.3.js",
                    "assets/jquery.whencallsequentially.js",
                    "assets/sugar-1.4.1.js",
                    "assets/css-selector/lib/CssSelector.js",
                    "assets/base64.js",
                    "scripts/DataExtractor.js",
                    "scripts/ContentSelector.js",
                    "scripts/Selector.js",
                    "scripts/ElementQuery.js",
                    "scripts/UniqueElementList.js",
                    "scripts/Selector/SelectorElement.js",
                    "scripts/Selector/SelectorGroup.js",
                    "scripts/Selector/SelectorLink.js",
                    "scripts/Selector/SelectorPopupLink.js",
                    "scripts/Selector/SelectorText.js",
                    "scripts/Selector/SelectorImage.js",
                    "scripts/Selector/SelectorHTML.js",
                    "scripts/Selector/SelectorElementAttribute.js",
                    "scripts/Selector/SelectorTable.js",
                    "scripts/Selector/SelectorElementScroll.js",
                    "scripts/Selector/SelectorElementClick.js",
                    "scripts/SelectorList.js",
                    "scripts/Sitemap.js",
                    "scripts/ContentScript.js",
                    "scripts/BackgroundScript.js",
                    "content_script/content_script.js"
                  ]
                }, () => resolve());
              });
            } catch (e) { reject(e); }
          });

          const send = () => {
            let responded = false;
            const timeout = setTimeout(() => {
              if (!responded) {
                try { _sendResponse({ error: 'Message timeout from content script' }); } catch (_) {}
              }
            }, 5000);

            chrome.tabs.sendMessage(tabId, reqToContentScript, (response) => {
              responded = true;
              clearTimeout(timeout);
              if (chrome.runtime.lastError || typeof response === 'undefined') {
                injectContentScripts()
                  .then(() => {
                    let responded2 = false;
                    const timeout2 = setTimeout(() => {
                      if (!responded2) {
                        try { _sendResponse({ error: 'Message timeout from content script after injection' }); } catch (_) {}
                      }
                    }, 5000);
                    chrome.tabs.sendMessage(tabId, reqToContentScript, (resp2) => {
                      responded2 = true;
                      clearTimeout(timeout2);
                      if (typeof resp2 === 'undefined') {
                        try { _sendResponse({ error: 'No response from content script' }); } catch (_) {}
                      } else {
                        try { _sendResponse(resp2); } catch (_) {}
                      }
                    });
                  })
                  .catch((err) => {
                    try { _sendResponse({ error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || err }); } catch (_) {}
                  });
              } else {
                try { _sendResponse(response); } catch (_) {}
              }
            });
          };

          send();
        });
      };

      if (reqToContentScript.tabId && typeof reqToContentScript.tabId === 'number') {
        sendToTab(reqToContentScript.tabId);
      } else {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
          const tabId = tabs && tabs[0] ? tabs[0].id : undefined;
          sendToTab(tabId);
        });
      }
      return true; // keep channel open for async responses
    }
    // Bridge BackgroundScript.executeContentScript coming from DevTools
    if (_msg && _msg.backgroundScriptCall && _msg.fn === 'executeContentScript' && _msg.request && _msg.request.contentScriptCall) {
      const reqToContentScript = _msg.request;

      const sendToTab = (tabId) => {
        if (!tabId || typeof tabId !== 'number') {
          _sendResponse({ error: 'Invalid tabId for content script call' });
          return;
        }

        const isHttp = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

        chrome.tabs.get(tabId, (tab) => {
          if (!tab || !isHttp(tab.url)) {
            try { _sendResponse({ error: 'Cannot inject into non-http(s) page' }); } catch (_) {}
            return;
          }

          const injectContentScripts = () => new Promise((resolve, reject) => {
            try {
              chrome.scripting.insertCSS({
                target: { tabId, allFrames: true },
                files: [ "content_script/content_script.css" ]
              }, () => {
                chrome.scripting.executeScript({
                  target: { tabId, allFrames: true },
                  files: [
                    "assets/jquery-2.0.3.js",
                    "assets/jquery.whencallsequentially.js",
                    "assets/sugar-1.4.1.js",
                    "assets/css-selector/lib/CssSelector.js",
                    "assets/base64.js",
                    "scripts/DataExtractor.js",
                    "scripts/ContentSelector.js",
                    "scripts/Selector.js",
                    "scripts/ElementQuery.js",
                    "scripts/UniqueElementList.js",
                    "scripts/Selector/SelectorElement.js",
                    "scripts/Selector/SelectorGroup.js",
                    "scripts/Selector/SelectorLink.js",
                    "scripts/Selector/SelectorPopupLink.js",
                    "scripts/Selector/SelectorText.js",
                    "scripts/Selector/SelectorImage.js",
                    "scripts/Selector/SelectorHTML.js",
                    "scripts/Selector/SelectorElementAttribute.js",
                    "scripts/Selector/SelectorTable.js",
                    "scripts/Selector/SelectorElementScroll.js",
                    "scripts/Selector/SelectorElementClick.js",
                    "scripts/SelectorList.js",
                    "scripts/Sitemap.js",
                    "scripts/ContentScript.js",
                    "scripts/BackgroundScript.js",
                    "content_script/content_script.js"
                  ]
                }, () => resolve());
              });
            } catch (e) { reject(e); }
          });

          const send = () => {
            let responded = false;
            const timeout = setTimeout(() => {
              if (!responded) {
                try { _sendResponse({ error: 'Message timeout from content script' }); } catch (_) {}
              }
            }, 5000);

            chrome.tabs.sendMessage(tabId, reqToContentScript, (response) => {
              responded = true;
              clearTimeout(timeout);
              if (chrome.runtime.lastError || typeof response === 'undefined') {
                injectContentScripts()
                  .then(() => {
                    let responded2 = false;
                    const timeout2 = setTimeout(() => {
                      if (!responded2) {
                        try { _sendResponse({ error: 'Message timeout from content script after injection' }); } catch (_) {}
                      }
                    }, 5000);
                    chrome.tabs.sendMessage(tabId, reqToContentScript, (resp2) => {
                      responded2 = true;
                      clearTimeout(timeout2);
                      if (typeof resp2 === 'undefined') {
                        try { _sendResponse({ error: 'No response from content script' }); } catch (_) {}
                      } else {
                        try { _sendResponse(resp2); } catch (_) {}
                      }
                    });
                  })
                  .catch((err) => {
                    try { _sendResponse({ error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || err }); } catch (_) {}
                  });
              } else {
                try { _sendResponse(response); } catch (_) {}
              }
            });
          };

          send();
        });
      };

      if (reqToContentScript.tabId && typeof reqToContentScript.tabId === 'number') {
        sendToTab(reqToContentScript.tabId);
      } else {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
          const tabId = tabs && tabs[0] ? tabs[0].id : undefined;
          sendToTab(tabId);
        });
      }
      return true;
    }
  } catch (e) {
    try { _sendResponse({ error: e && e.message ? e.message : e }); } catch (_) {}
    return true;
  }
  // Let other listeners handle messages in the offscreen document
});

// Mirror storage changes to the offscreen background logic when needed
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((_changes, _area) => {
    // Notify all extension listeners (offscreen document will pick this up)
    chrome.runtime.sendMessage({ __configChanged: true });
  });
}
