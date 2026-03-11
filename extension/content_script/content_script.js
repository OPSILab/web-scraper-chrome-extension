chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log("chrome.runtime.onMessage", request);

		if (request.extractData) {
			console.log("received data extraction request", request);
			var extractor = new DataExtractor(request);
			var deferredData = extractor.getData();
			deferredData.done(function(data){
				console.log("dataextractor data", data);
				sendResponse(data);
			});
			return true;
		}
		else if(request.previewSelectorData) {
			console.log("received data-preview extraction request", request);
			var extractor = new DataExtractor(request);
			var deferredData = extractor.getSingleSelectorData(request.parentSelectorIds, request.selectorId);
			deferredData.done(function(data){
				console.log("dataextractor data", data);
				sendResponse(data);
			});
			return true;
		}
		// Universal ContentScript communication handler
		else if(request.contentScriptCall) {

				try {
					var contentScript = getContentScript("ContentScript");

					console.log("received ContentScript request", request);

					if (!contentScript || typeof contentScript[request.fn] !== 'function') {
						sendResponse({ error: 'Invalid content script function: ' + request.fn });
						return true;
					}

					var deferredResponse = contentScript[request.fn](request.request);
					if (!deferredResponse || typeof deferredResponse.done !== 'function') {
						sendResponse({ error: 'Content script did not return a Deferred' });
						return true;
					}

					deferredResponse.done(function(response) {
						sendResponse(response);
					}).fail(function(err){
						try {
							sendResponse({ error: err });
						} catch (_e) {}
					});

					return true;
				} catch (e) {
					try { sendResponse({ error: e && e.message ? e.message : e }); } catch (_e) {}
					return true;
				}
		}
	}
);