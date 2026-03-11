var Config = function () {

};

Config.prototype = {

	sitemapDb: '<use loadConfiguration()>',
	dataDb: '<use loadConfiguration()>',

	defaults: {
		storageType: "local",
		// this is where sitemap documents are stored
		sitemapDb: "scraper-sitemaps",
		// this is where scraped data is stored.
		// empty for local storage
		dataDb: ""
	},

	/**
	 * Loads configuration from chrome extension sync storage
	 */
	loadConfiguration: function (callback) {

		// Make callback optional and robust
		if (typeof callback !== 'function') {
			callback = function () {};
		}

		try {
			var defaults = {
				sitemapDb: this.defaults.sitemapDb,
				dataDb: this.defaults.dataDb,
				storageType: this.defaults.storageType
			};
			chrome.storage.sync.get(defaults, function (items) {
				items = items || defaults;
				this.storageType = items.storageType || this.defaults.storageType;
				if (this.storageType === 'local') {
					this.sitemapDb = this.defaults.sitemapDb;
					this.dataDb = this.defaults.dataDb;
				}
				else {
					this.sitemapDb = items.sitemapDb || this.defaults.sitemapDb;
					this.dataDb = items.dataDb || this.defaults.dataDb;
				}

				callback();
			}.bind(this));
		}
		catch (e) {
			// Fallback to defaults if storage access fails
			this.storageType = this.defaults.storageType;
			this.sitemapDb = this.defaults.sitemapDb;
			this.dataDb = this.defaults.dataDb;
			try { callback(); } catch (_) {}
		}
	},

	/**
	 * Saves configuration to chrome extension sync storage
	 * @param {type} items
	 * @param {type} callback
	 * @returns {undefined}
	 */
	updateConfiguration: function (items, callback) {
		chrome.storage.sync.set(items, callback);
	}
};