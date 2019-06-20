var compareDriver = {
	osm: compareDataOsm,
	wikidata: compareDataWikidata
}

function compareData(tiles, resultData, queryType) {
	compareDriver[queryType](tiles, resultData);
}

function compareDataOsm(tiles, resultData)
{
	var osmData = resultData.elements;

	// split per tile
	var i = -1;
	for (var d = 0; d < tiles.length; d++)
	{
		tiles[d].osmData = [];
		while (osmData[++i].type != 'count')
			tiles[d].osmData.push(osmData[i]);
	}


	for (var d = 0; d < tiles.length; d++)
	{
		var data = tiledData[tiles[d].datasetName][tiles[d].tileName].data;
		var settings = datasetSettings[tiles[d].datasetName];
		var maxScore = 1;
		for (var t = 0; t < settings.tagmatch.length; t++)
			maxScore += settings.tagmatch[t].importance || 1;
		for (var p = 0; p < data.length; p++)
		{
			var point = data[p];
			point.maxScore = maxScore;
			point.score = 0;
			point.osmElement = {};

			var bestScore = 0;
			for (var i = 0; i < tiles[d].osmData.length; i++)
			{
				var element = tiles[d].osmData[i];
				if (geoHelper.getDistance(element.center || element, point.coordinates) > settings.dist)
					continue;

				var score = 1;
				for (var t = 0; t < settings.tagmatch.length; t++)
				{
					var tag = settings.tagmatch[t];
					score += comparisonAlgorithms[tag.algorithm || "equality"](
						point.properties[tag.key],
						element.tags[tag.key]) * (tag.importance || 1);
				}
				if (score > bestScore)
				{
					point.osmElement = element;
					point.score = score;
					point.isMatched = osmElement.tags[settings.id] === point.properties[settings.id];
					bestScore = score;
				}
			}
			displayPoint(tiles[d].datasetName, tiles[d].tileName, p);
		}
	}
}

function convertWikidataItem(settings, element) {
	var tags = {};
	for (var i = 0; i < settings.tagmatch.length; ++i) {
		var tag = settings.tagmatch[i];
		var varName = tag.key.replace('^', '_').replace(':', '_');
		if (element.hasOwnProperty(varName)) {
			var data = element[varName];
			var valueRaw = data.value;
			var value = valueRaw;
			/*
			switch(data.type) {
				case "uri":
					"http://www.wikidata.org/entity/" removal?
					break;

				default:
					value = valueRaw;
					break;
			}
			*/
			tags[tag.key] = value;
		}
	}
	return { tags: tags, item: element.item.value };
}

function compareDataWikidata(tiles, resultData)
{
	var results = resultData.results.bindings;
	// split per tile
	var tilesPerName = {};
	for (var d = 0; d < tiles.length; d++)
	{
		tilesPerName[tiles[d].tileName] = tiles[d];
		tiles[d].osmData = [];
	}
	for (var i = 0; i < results.length; ++i) {
		if (!results[i].tileName) continue;
		var tileName = results[i].tileName.value;
		tilesPerName[tileName].osmData.push(results[i]);
	}

	for (var d = 0; d < tiles.length; d++)
	{
		var data = tiledData[tiles[d].datasetName][tiles[d].tileName].data;
		var settings = datasetSettings[tiles[d].datasetName];
		var maxScore = 0.1;
		for (var t = 0; t < settings.tagmatch.length; t++) {
			maxScore += settings.tagmatch[t].importance || 1;
		}
		for (var p = 0; p < data.length; p++)
		{
			var point = data[p];
			point.maxScore = maxScore;
			point.score = 0;
			point.osmElement = {};

			var bestScore = 0;
			for (var i = 0; i < tiles[d].osmData.length; i++)
			{
				var element = tiles[d].osmData[i];
				var osmElement = convertWikidataItem(settings, element);
				var elementCenter = {lat: element.lat.value, lon: element.lon.value};
				if (geoHelper.getDistance(elementCenter, point.coordinates) > settings.dist)
					continue;

				var score = 0.1;
				for (var t = 0; t < settings.tagmatch.length; t++)
				{
					var tag = settings.tagmatch[t];
					var varName = tag.key.replace('^', '_').replace(':', '_');
					var tagScore = comparisonAlgorithms[tag.algorithm || "equality"](
						point.properties[tag.key],
						osmElement.tags[tag.key]);
					score += tagScore * (tag.importance || 1);
				}
				if (score > bestScore)
				{
					point.osmElement = osmElement;
					point.score = score;
					point.isMatched = osmElement.tags[settings.id] === point.properties[settings.id];
					bestScore = score;
				}
			}
			displayPoint(tiles[d].datasetName, tiles[d].tileName, p);
		}
	}
}

// every comparison algorithm returns a value between 0 and 1
// where 0 is non-matching and 1 is perfectly matching
// TODO alternative algorithms: levenshtein, opening hours equivalence, ...:
var comparisonAlgorithms = {
	"equality": function(v1, v2)
	{
		if (!v1)
			return !v2;
		if (v1 == v2)
			return 1;
		return 0;
	},
	/**
	 * Checks if all elements of the semicolumn separated list v1 are in v2
	 */
	"inList": function(v1, v2)
	{
		if (!v1)
			return 1;
		if (!v2)
			return 0;
		var l1 = v1.split(";");
		var l2 = v2.split(";");
		for (var i = 0; i < l1.length; i++)
			if (l2.indexOf(l1[i]) == -1)
				return 0;
		return 1;
	},
	/**
	 * Checks if two lists contain the same elements (not neccesarily the same order)
	 */
	"equalList": function(v1, v2)
	{
		return comparisonAlgorithms.inList(v1, v2) && comparisonAlgorithms.inList(v2, v1);
	},
	"equalIgnoreCase": function(v1, v2)
	{
		if (!v1)
			return 1;
		if (!v2)
			return 0;
		return v1.toLowerCase() === v2.toLowerCase();
	},
	"substringIgnoreCase": function(v1, v2)
	{
		if (!v1)
			return 1;
		if (!v2)
			return 0;
		return v1.toLowerCase().indexOf(v2.toLowerCase()) != -1;
	},
	"presence": function(v1, v2)
	{
		if (!v1)
			return 1;
		return v2 ? 1 : 0;
	},
};

