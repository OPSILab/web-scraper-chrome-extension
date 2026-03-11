/**
 * From devtools panel there is no possibility to execute XHR requests. So all requests to a remote CouchDb must be
 * handled through Background page. StoreDevtools is a simply a proxy store
 * @constructor
 */
var StoreDevtools = function () {

};

StoreDevtools.prototype = {
	createSitemap: function (sitemap, callback) {

		var request = {
			createSitemap: true,
			sitemap: JSON.parse(JSON.stringify(sitemap)),
			__serviceBridge: true
		};

		// Use background script proxy in DevTools context
		var bg = getBackgroundScript("DevTools");
		if (!chrome.runtime || !chrome.runtime.sendMessage) {
			console.error('chrome.runtime.sendMessage is unavailable in DevTools context');
			alert('Extension messaging is unavailable. Reload the extension and DevTools pane.');
			return;
		}
		try {
			chrome.runtime.sendMessage(request, function (callbackFn, originalSitemap, newSitemap) {
			if (!newSitemap) {
				console.warn('createSitemap returned empty response');
				callbackFn(originalSitemap);
				return;
			}
			originalSitemap._rev = newSitemap._rev;
			callbackFn(originalSitemap);
		}.bind(this, callback, sitemap));
		} catch (e) {
			console.error('sendMessage failed:', e);
			alert('Messaging failed. Please reload DevTools and try again.');
		}
	},
	saveSitemap: function (sitemap, callback) {
		this.createSitemap(sitemap, callback);
	},
	deleteSitemap: function (sitemap, callback) {

		var request = {
			deleteSitemap: true,
			sitemap: JSON.parse(JSON.stringify(sitemap)),
			__serviceBridge: true
		};
		var bg = getBackgroundScript("DevTools");
		if (!chrome.runtime || !chrome.runtime.sendMessage) {
			console.error('chrome.runtime.sendMessage is unavailable');
			alert('Messaging unavailable. Reload DevTools.');
			return;
		}
		try {
			chrome.runtime.sendMessage(request, function (response) {
				callback();
			});
		} catch (e) {
			console.error('sendMessage failed:', e);
			alert('Messaging failed. Please reload DevTools and try again.');
		}
	},
	getAllSitemaps: function (callback) {

		var request = {
			getAllSitemaps: true
		};
		request.__serviceBridge = true;

		var bg = getBackgroundScript("DevTools");
		if (!chrome.runtime || !chrome.runtime.sendMessage) {
			console.error('chrome.runtime.sendMessage is unavailable');
			alert('Messaging unavailable. Reload DevTools.');
			return;
		}
		try {
			chrome.runtime.sendMessage(request, function (response) {

			var sitemaps = [];

			for (var i in response) {
				sitemaps.push(new Sitemap(response[i]));
			}
			callback(sitemaps);
		});
		} catch (e) {
			console.error('sendMessage failed:', e);
			alert('Messaging failed. Please reload DevTools and try again.');
		}
	},
	getSitemapData: function (sitemap, callback) {
		var request = {
			getSitemapData: true,
			sitemap: JSON.parse(JSON.stringify(sitemap)),
			__serviceBridge: true
		};

		var bg = getBackgroundScript("DevTools");
		if (!chrome.runtime || !chrome.runtime.sendMessage) {
			console.error('chrome.runtime.sendMessage is unavailable');
			alert('Messaging unavailable. Reload DevTools.');
			return;
		}
		try {
			chrome.runtime.sendMessage(request, function (response) {
				callback(response);
			});
		} catch (e) {
			console.error('sendMessage failed:', e);
			alert('Messaging failed. Please reload DevTools and try again.');
		}
	},
	sitemapExists: function (sitemapId, callback) {

		var request = {
			sitemapExists: true,
			sitemapId: sitemapId,
			__serviceBridge: true
		};

		var bg = getBackgroundScript("DevTools");
		if (!chrome.runtime || !chrome.runtime.sendMessage) {
			console.error('chrome.runtime.sendMessage is unavailable');
			alert('Messaging unavailable. Reload DevTools.');
			return;
		}
		try {
			chrome.runtime.sendMessage(request, function (response) {
				callback(response);
			});
		} catch (e) {
			console.error('sendMessage failed:', e);
			alert('Messaging failed. Please reload DevTools and try again.');
		}
	}
};