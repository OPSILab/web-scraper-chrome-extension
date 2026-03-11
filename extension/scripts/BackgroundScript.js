/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

	dummy: function() {

		return $.Deferred().resolve("dummy").promise();
	},

	/**
	 * Returns the id of the tab that is visible to user
	 * @returns $.Deferred() integer
	 */
	getActiveTabId: function() {

		var deferredResponse = $.Deferred();

		chrome.tabs.query({
			currentWindow: true
		}, function (tabs) {
			if (!tabs || tabs.length < 1) {
				deferredResponse.reject("couldn't find any tabs");
				return;
			}
			// Prefer active http/https tab, otherwise first http/https tab
			var active = tabs.find(function(t){ return t.active; });
			var isHttp = function(url){ return url && (url.startsWith('http://') || url.startsWith('https://')); };
			if (active && isHttp(active.url)) {
				deferredResponse.resolve(active.id);
				return;
			}
			var httpTab = tabs.find(function(t){ return isHttp(t.url); });
			if (httpTab) {
				deferredResponse.resolve(httpTab.id);
			} else {
				deferredResponse.reject('No http/https tab available');
			}
		});
		return deferredResponse.promise();
	},

	/**
	 * Execute a function within the active tab within content script
	 * @param request.fn	function to call
	 * @param request.request	request that will be passed to the function
	 * @param request.tabId	(optional) explicit tabId to target (e.g., DevTools inspected tab)
	 */
	executeContentScript: function(request) {

		var reqToContentScript = {
			contentScriptCall: true,
			fn: request.fn,
			request: request.request
		};
		var deferredResponse = $.Deferred();

		var injectContentScripts = function(tabId) {
			var dfd = $.Deferred();
			try {
				// Inject CSS first
				chrome.scripting.insertCSS({
					target: { tabId: tabId, allFrames: true },
					files: [
						"content_script/content_script.css"
					]
				}, function() {
					// Now inject JS files in order (all frames)
					chrome.scripting.executeScript({
						target: { tabId: tabId, allFrames: true },
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
					}, function() {
						dfd.resolve();
					});
				});
			} catch (e) {
				dfd.reject(e);
			}
			return dfd.promise();
		};

		var sendToTab = function(tabId) {
			try {
				// Guard against non-http tabs
				chrome.tabs.get(tabId, function(tab){
					var url = tab && tab.url || '';
					if (!(url.startsWith('http://') || url.startsWith('https://'))) {
						deferredResponse.reject('Cannot inject into non-http(s) page');
						return;
					}
					var responded = false;
					var timeout = setTimeout(function(){
						if (!responded) {
							deferredResponse.reject('Message timeout from content script');
						}
					}, 5000);
					chrome.tabs.sendMessage(tabId, reqToContentScript, function(response) {
						responded = true;
						clearTimeout(timeout);
					if (chrome.runtime && chrome.runtime.lastError) {
						// Attempt to inject scripts then resend the message
						injectContentScripts(tabId).done(function(){
								var responded2 = false;
								var timeout2 = setTimeout(function(){
									if (!responded2) {
										deferredResponse.reject('Message timeout from content script after injection');
									}
								}, 5000);
								chrome.tabs.sendMessage(tabId, reqToContentScript, function(resp2){
									responded2 = true;
									clearTimeout(timeout2);
								if (typeof resp2 === 'undefined') {
									deferredResponse.reject('No response from content script');
								} else {
									deferredResponse.resolve(resp2);
								}
							});
						}).fail(function(err){
							deferredResponse.reject(err || chrome.runtime.lastError);
						});
					} else {
						if (typeof response === 'undefined') {
							deferredResponse.reject('No response from content script');
						} else {
							deferredResponse.resolve(response);
						}
					}
				});
				});
			} catch (e) {
				deferredResponse.reject(e);
			}
		}.bind(this);

		if (request.tabId && typeof request.tabId === 'number') {
			sendToTab(request.tabId);
		}
		else {
			var deferredActiveTabId = this.getActiveTabId();
			deferredActiveTabId.done(function(tabId) {
				sendToTab(tabId);
			});
		}

		return deferredResponse.promise();
	}
};

/**
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @returns BackgroundScript
 */
var getBackgroundScript = function(location) {

	// Handle calls from different places
	if(location === "BackgroundScript") {
		return BackgroundScript;
	}
	else if(location === "DevTools" || location === "ContentScript") {

		// if called within background script proxy calls to content script
		var backgroundScript = {};

		Object.keys(BackgroundScript).forEach(function(attr) {
			if(typeof BackgroundScript[attr] === 'function') {
				backgroundScript[attr] = function(request) {

					var reqToBackgroundScript = {
						backgroundScriptCall: true,
						fn: attr,
						request: request
					};

					var deferredResponse = $.Deferred();

					try {
						chrome.runtime.sendMessage(reqToBackgroundScript, function(response) {
							if (chrome.runtime && chrome.runtime.lastError) {
								deferredResponse.reject(chrome.runtime.lastError.message || chrome.runtime.lastError);
							} else if (typeof response === 'undefined') {
								deferredResponse.reject('No response from background');
							} else {
								deferredResponse.resolve(response);
							}
						});
					} catch (e) {
						deferredResponse.reject(e);
					}

					return deferredResponse.promise();
				};
			}
			else {
				backgroundScript[attr] = BackgroundScript[attr];
			}
		});

		return backgroundScript;
	}
	else {
		throw "Invalid BackgroundScript initialization - " + location;
	}
};