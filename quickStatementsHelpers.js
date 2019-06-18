var quickStatementsHelper = (function () {
	var quickStatementsUrl = "https://tools.wmflabs.org/quickstatements/#/v1=";
	var wqsUrl = "https://query.wikidata.org/embed.html#";
	var entityLinkUrlBase = "http://www.wikidata.org/entity/";

	var openArea = function (lon, lat) {
		var query = "#defaultView:Map\nSELECT ?location ?item ?itemLabel ?itemDescription ((CONCAT(STR(?distance*1000), \" m\")) AS ?dist) WHERE {\n\tSERVICE wikibase:around {\n\t\t?item wdt:P625 ?location.\n\t\tbd:serviceParam wikibase:center \"Point(" + lon + "," + lat + ")\"^^geo:wktLiteral.\n\t\tbd:serviceParam wikibase:radius \"5\".\n\t\tbd:serviceParam wikibase:distance ?distance.\n\t}\n\tSERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\".\n\t}\n}\nORDER BY ?distance\nLIMIT 20";
		window.open(wqsUrl + encodeURIComponent(query), '_blank');
	};

	var importPoint = function (datasetName, tileName, idx) {
		var settings = datasetSettings[datasetName];
		var point = tiledData[datasetName][tileName].data[idx];
		var coords = point.coordinates;
		var refAppend = buildReferences(settings.quickStatementsReferences, point.properties);
		var commands = ["CREATE", "LAST|P625|@" + coords.lat + "/" + coords.lon + refAppend];

		for (var t = 0; t < settings.tagmatch.length; t++) {
			var tag = settings.tagmatch[t];
			var key = tag.key;
			var value = point.properties[key];
			if (!value) continue;
			if (key.indexOf('^') >= 0) continue;
			var cmd = importCommand(key, tag.valueType, value, refAppend);
			if (cmd) commands.push('LAST|' + cmd);
		}

		var qsBatch = commands.join('||');
		console.debug('QuickStatements batch: ', qsBatch)
		window.open(quickStatementsUrl + encodeURIComponent(qsBatch), '_blank');
	};

	var addStatement = function(datasetName, tileName, idx, itemUri, property) {
		var settings = datasetSettings[datasetName];

		var qsCommand = null;
		for (var t = 0; t < settings.tagmatch.length; t++) {
			var tag = settings.tagmatch[t];
			var key = tag.key;
			if (tag.key !== property) continue;

			var point = tiledData[datasetName][tileName].data[idx];
			var refAppend = buildReferences(settings.quickStatementsReferences, point.properties);
			var cmd = importCommand(key, tag.valueType, point.properties[key], refAppend);
			if (cmd) qsCommand = itemUriToId(itemUri) + '|' + cmd;
			break;
		}

		if (!qsCommand) return;

		console.debug('QuickStatements command: ', qsCommand)
		window.open(quickStatementsUrl + encodeURIComponent(qsCommand), '_blank');
	};

	var buildReferences = function (refDefs, pointProperties) {
		if (!refDefs) return '';

		var refs = [];
		for (var def in refDefs) {
			if (!refDefs.hasOwnProperty(def)) continue;
			var refVal = refDefs[def];
			var type = null;
			if (typeof refVal === "object") {
				var refValParts = [];
				if (refVal.prefix) refValParts.push(refVal.prefix);
				if (refVal.value) refValParts.push(refVal.value);
				if (refVal.from) refValParts.push(pointProperties[refVal.from]);
				if (refVal.suffix) refValParts.push(refVal.suffix);
				type = refVal.type;
				refVal = refValParts.join('');
			}
			refs.push(def + '|' + valueToQSDef(refVal, type));
		}
		return '|' + refs.join('|');
	}

	var importCommand = function(key, type, value, refAppend) {
		if (key[0] === 'P') {
			prop = key;
			val = valueToQSDef(value, type) + refAppend;
		} else if (key.substr(0, 6) === 'label:') {
			var lang = key.substr(6);
			prop = "L" + lang;
			val = JSON.stringify(value);
		} else {
			return null;
		}
		return prop + '|' + val;
	};

	var itemUriToId = function(uri) {
		if (!uri) return uri;
		var slash = uri.lastIndexOf('/');
		return slash < 0 ? uri : uri.substr(slash + 1);
	};

	var valueToQSDef = function (value, type) {
		if (!value) value = '';
		var entityId = typeof value === "string" && value.substr(0, entityLinkUrlBase.length) === entityLinkUrlBase ? value.substr(entityLinkUrlBase.length) : null;
		if (!type) {
			type = (entityId && entityId.match(/^Q[0-9]+$/) ? "url" : "string");
		}
		switch (type) {
			case "string":
				return JSON.stringify(value);
			case "url":
				return entityId;
			default:
				return value;
		}
	};

	return {
		importPoint: importPoint,
		openArea: openArea,
		addStatement: addStatement
	};
})();
