var quickStatementsHelper = (function () {
	var quickStatementsUrl = "https://tools.wmflabs.org/quickstatements/#/v1=";
	var wqsUrl = "https://query.wikidata.org/embed.html#";
	var entityLinkUrlBase = "http://www.wikidata.org/entity/";

	var openArea = function (lon, lat) {
		var query = "#defaultView:Map\nSELECT ?location ?item ?itemLabel ?itemDescription ((CONCAT(STR(?distance*1000), \" m\")) AS ?dist) WHERE {\n\tSERVICE wikibase:around {\n\t\t?item wdt:P625 ?location.\n\t\tbd:serviceParam wikibase:center \"Point(" + lon + "," + lat + ")\"^^geo:wktLiteral.\n\t\tbd:serviceParam wikibase:radius \"5\".\n\t\tbd:serviceParam wikibase:distance ?distance.\n\t}\n\tSERVICE wikibase:label { bd:serviceParam wikibase:language \"[AUTO_LANGUAGE],en\".\n\t}\n}\nORDER BY ?distance\nLIMIT 20";
		window.open(wqsUrl + encodeURIComponent(query), '_blank');
	}

	var importPoint = function (datasetName, tileName, idx) {
		var settings = datasetSettings[datasetName];
		var point = tiledData[datasetName][tileName].data[idx];
		var coords = point.coordinates;
		var refAppend = "";
		var refDefs = settings.quickStatementsReferences;
		if (refDefs) {
			var refs = [];
			for (var def in refDefs) {
				if (!refDefs.hasOwnProperty(def)) continue;
				var refVal = refDefs[def];
				var type = null;
				if (typeof refVal === "object") {
					var refValParts = [];
					if (refVal.prefix) refValParts.push(refVal.prefix);
					if (refVal.value) refValParts.push(refVal.value);
					if (refVal.from) refValParts.push(point.properties[refVal.from]);
					if (refVal.suffix) refValParts.push(refVal.suffix);
					type = refVal.type;
					refVal = refValParts.join('');
				}
				refs.push(def + '|' + valueToQSDef(refVal, type));
			}
			refAppend = '|' + refs.join('|');
		}
		var commands = ["CREATE", "LAST|P625|@" + coords.lat + "/" + coords.lon + refAppend];

		for (var t = 0; t < settings.tagmatch.length; t++) {
			var tag = settings.tagmatch[t];
			var key = tag.key;
			var value = point.properties[key];
			var prop, val;
			if (!value) continue;
			if (key.indexOf('^') >= 0) continue;
			if (key[0] === 'P') {
				prop = key;
				val = valueToQSDef(value, tag.valueType) + refAppend;
			} else if (key.substr(0, 6) === 'label:') {
				var lang = key.substr(6);
				prop = "L" + lang;
				val = JSON.stringify(value);
			} else {
				continue;
			}
			commands.push('LAST|' + prop + '|' + val);
		}

		var qsBatch = commands.join('||');
		console.debug('QuickStatements batch: ', qsBatch)
		window.open(quickStatementsUrl + encodeURIComponent(qsBatch), '_blank');
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
	}

	return {
		importPoint: importPoint,
		openArea: openArea
	};
})();
