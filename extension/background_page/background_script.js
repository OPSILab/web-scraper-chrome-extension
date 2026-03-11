var config = new Config();
var store;
var isStoreReady = false;

function initStoreFromConfig() {
	try {
		console.log("initial configuration", config);
		store = new Store(config);
		isStoreReady = true;
	} catch (e) {
		console.error("Failed to initialize Store", e);
	}
}

try {
	config.loadConfiguration(function () {
		initStoreFromConfig();
	});
} catch (e) {
	console.error("Failed to load configuration", e);
}

// In offscreen documents some chrome.* events may be unavailable at load time.
// If storage.onChanged exists, use it; otherwise rely on service worker broadcast.
if (chrome.storage && chrome.storage.onChanged) {
	chrome.storage.onChanged.addListener(function () {
		config.loadConfiguration(function () {
			console.log("configuration changed", config);
			initStoreFromConfig();
		});
	});
}

var sendToActiveTab = function(request, callback) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		if (tabs.length < 1) {
			this.console.log("couldn't find active tab");
		}
		else {
			var tab = tabs[0];
			chrome.tabs.sendMessage(tab.id, request, callback);
		}
	});
};

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log("chrome.runtime.onMessage", request);

		// If message is intended to be handled by the service worker bridge,
		// ignore it here to avoid double responses.
		if (request && request.__serviceBridge) {
			return false;
		}

		// Service worker broadcast for config changes
		if (request && request.__configChanged) {
			config.loadConfiguration(function () {
				console.log("configuration changed (broadcast)", config);
				initStoreFromConfig();
				sendResponse && sendResponse();
			});
			return true;
		}

		if (!isStoreReady) {
			// Retry shortly if store not yet initialized
			setTimeout(function(){
				chrome.runtime.sendMessage(request, sendResponse);
			}, 50);
			return true;
		}

		if (request.createSitemap) {
			store.createSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.saveSitemap) {
			store.saveSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.deleteSitemap) {
			store.deleteSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.getAllSitemaps) {
			store.getAllSitemaps(sendResponse);
			return true;
		}
		else if (request.sitemapExists) {
			store.sitemapExists(request.sitemapId, sendResponse);
			return true;
		}
		else if (request.getSitemapData) {
			store.getSitemapData(new Sitemap(request.sitemap), sendResponse);
			return true;
		}
		else if (request.scrapeSitemap) {
			var sitemap = new Sitemap(request.sitemap);
			var queue = new Queue();
			var browser = new ChromePopupBrowser({
				pageLoadDelay: request.pageLoadDelay
			});

			var scraper = new Scraper({
				queue: queue,
				sitemap: sitemap,
				browser: browser,
				store: store,
				requestInterval: request.requestInterval
			});

			try {
				scraper.run(function () {
					browser.close();
					var notification = chrome.notifications.create("scraping-finished", {
						type: 'basic',
						iconUrl: 'assets/images/icon128.png',
						title: 'Scraping finished!',
						message: 'Finished scraping ' + sitemap._id
					}, function(id) {
						// notification showed
					});
					sendResponse();
				});
			}
			catch (e) {
				console.log("Scraper execution cancelled".e);
			}

			return true;
		}
		else if(request.previewSelectorData) {
			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function (tabs) {
				if (tabs.length < 1) {
					this.console.log("couldn't find active tab");
				}
				else {
					var tab = tabs[0];
					chrome.tabs.sendMessage(tab.id, request, sendResponse);
				}
			});
			return true;
		}
		else if(request.backgroundScriptCall) {

			var backgroundScript = getBackgroundScript("BackgroundScript");
			var deferredResponse = backgroundScript[request.fn](request.request)
			deferredResponse.done(function(response){
				sendResponse(response);
			});

			return true;
		}
	}
);
