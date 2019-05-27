var Sitemap = function (sitemapObj) {
    this.initData(sitemapObj);
};

Sitemap.prototype = {

    initData: function (sitemapObj) {

        this.selectors = new Array();
        for (var key in sitemapObj) {

            if (key != 'datasetSelectors' && key != 'pageSelectors')
                this[key] = sitemapObj[key];
            else if (key == 'datasetSelectors') {
                let selArray = sitemapObj[key];
                for (let sel of selArray)
                    this.selectors.push(sel);
            } else if (key == 'pageSelectors') {
                let selArray = sitemapObj[key];
                for (let sel of selArray)
                    this.selectors.push(sel);
            }
        }

        this.selectors = new SelectorList(this.selectors);

    },

	/**
	 * Returns all selectors or recursively find and return all child selectors of a parent selector.
	 * @param parentSelectorId
	 * @returns {Array}
	 */
    getAllSelectors: function (parentSelectorId) {

        return this.selectors.getAllSelectors(parentSelectorId);
    },

	/**
	 * Returns only selectors that are directly under a parent
	 * @param parentSelectorId
	 * @returns {Array}
	 */
    getDirectChildSelectors: function (parentSelectorId) {
        return this.selectors.getDirectChildSelectors(parentSelectorId);
    },

	/**
	 * Returns all selector id parameters
	 * @returns {Array}
	 */
    getSelectorIds: function () {
        var ids = ['_root'];
        this.selectors.forEach(function (selector) {
            ids.push(selector.id);
        });
        return ids;
    },

	/**
	 * Returns only selector ids which can have child selectors
	 * @returns {Array}
	 */
    getPossibleParentSelectorIds: function () {
        var ids = ['_root'];
        this.selectors.forEach(function (selector) {
            if (selector.canHaveChildSelectors()) {
                ids.push(selector.id);
            }
        }.bind(this));
        return ids;
    },

    getStartUrls: function () {

        var startUrls = this.startUrl;
        // single start url
        if (this.startUrl.push === undefined) {
            startUrls = [startUrls];
        }

        var urls = [];
        startUrls.forEach(function (startUrl) {

            // zero padding helper
            var lpad = function (str, length) {
                while (str.length < length)
                    str = "0" + str;
                return str;
            };

            var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/;
            var matches = startUrl.match(re);
            if (matches) {
                var startStr = matches[2];
                var endStr = matches[3];
                var start = parseInt(startStr);
                var end = parseInt(endStr);
                var incremental = 1;
                console.log(matches[5]);
                if (matches[5] !== undefined) {
                    incremental = parseInt(matches[5]);
                }
                for (var i = start; i <= end; i += incremental) {

                    // with zero padding
                    if (startStr.length === endStr.length) {
                        urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6]);
                    }
                    else {
                        urls.push(matches[1] + i + matches[6]);
                    }
                }
                return urls;
            }
            else {
                urls.push(startUrl);
            }
        });

        return urls;
    },

    updateSelector: function (selector, selectorData) {

        // selector is undefined when creating a new one
        if (selector === undefined) {
            selector = new Selector(selectorData);
        }

        // update child selectors
        if (selector.id !== undefined && selector.id !== selectorData.id) {
            this.selectors.forEach(function (currentSelector) {
                currentSelector.renameParentSelector(selector.id, selectorData.id)
            });

            // update cyclic selector
            var pos = selectorData.parentSelectors.indexOf(selector.id);
            if (pos !== -1) {
                selectorData.parentSelectors.splice(pos, 1, selectorData.id);
            }
        }

        selector.updateData(selectorData);

        if (this.getSelectorIds().indexOf(selector.id) === -1) {
            this.selectors.push(selector);
        }
    },
    deleteSelector: function (selectorToDelete) {

        this.selectors.forEach(function (selector) {
            if (selector.hasParentSelector(selectorToDelete.id)) {
                selector.removeParentSelector(selectorToDelete.id);
                if (selector.parentSelectors.length === 0) {
                    this.deleteSelector(selector)
                }
            }
        }.bind(this));

        for (var i in this.selectors) {
            if (this.selectors[i].id === selectorToDelete.id) {
                this.selectors.splice(i, 1);
                break;
            }
        }
    },
    getDataTableId: function () {
        return this._id.replace(/\./g, '_');
    },
    exportSitemap: function () {
        var sitemapObj = JSON.parse(JSON.stringify(this));
        delete sitemapObj._rev;

        var sitemapSelectors = sitemapObj['selectors'];

        // Extract lastPage and datasetUrl selectors and put in a separated pageSelectors array
        var pageSelectors = [], datasetSelectors = [];
        for (var i = 0; i < sitemapSelectors.length; i++) {
            let elem = sitemapSelectors[i];
            if (elem.id == 'lastPage' || elem.id == 'datasetLink') {
                pageSelectors.push(elem);
            } else {
                datasetSelectors.push(elem);
            }

        }

        if ((sitemapObj.navParamType == "QUERY_PAGE" || sitemapObj.navParamType == "PATH_PAGE") && !sitemapObj.pagesNumber && (pageSelectors.length != 2)) {
            alert("Invalid Sitemap: lastPage and datasetLink selectors are mandatory for Page navigation type, if pagesNumber is not specified!");
            return '{}';
        }

        //All the Navigation parameter fields should be there, since they have been validated in the edit metadata part.
        var navigationParameter = {
            name: sitemapObj.navParamName,
            type: sitemapObj.navParamType,
            startValue: sitemapObj.navParamStartValue,
            endValue: sitemapObj.navParamEndValue,
            pagesNumber: parseInt(sitemapObj.navParamPagesNumber),
            datasetsPerPage: parseInt(sitemapObj.navParamDatasetsPerPage),
            pageSelectors: pageSelectors
        };


        return JSON.stringify({
            startUrl: sitemapObj.startUrl,
            datasetSelectors: datasetSelectors,
            navigationParameter: navigationParameter,
            _id: sitemapObj['_id']
        });

    },
    importSitemap: function (sitemapJSON) {
        var sitemapObj = JSON.parse(sitemapJSON);
        this.initData(sitemapObj);
    },
    // return a list of columns than can be exported
    getDataColumns: function () {
        var columns = [];
        this.selectors.forEach(function (selector) {

            columns = columns.concat(selector.getDataColumns());
        });

        return columns;
    },
    getDataExportCsvBlob: function (data) {

        var columns = this.getDataColumns(),
            delimiter = ',',
            newline = "\n",
            csvData = ['\ufeff']; // utf-8 bom char

        // header
        csvData.push(columns.join(delimiter) + newline)

        // data
        data.forEach(function (row) {
            var rowData = [];
            columns.forEach(function (column) {
                var cellData = row[column];
                if (cellData === undefined) {
                    cellData = "";
                }
                else if (typeof cellData === 'object') {
                    cellData = JSON.stringify(cellData);
                }

                rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"');
            });
            csvData.push(rowData.join(delimiter) + newline);
        });

        return new Blob(csvData, { type: 'text/csv' });
    },
    getSelectorById: function (selectorId) {
        return this.selectors.getSelectorById(selectorId);
    },
	/**
	 * Create full clone of sitemap
	 * @returns {Sitemap}
	 */
    clone: function () {
        var clonedJSON = JSON.parse(JSON.stringify(this));
        var sitemap = new Sitemap(clonedJSON);
        return sitemap;
    }
};

