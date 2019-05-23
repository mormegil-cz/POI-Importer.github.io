private static readonly int urlPrefixLength = "https://www.drobnepamatky.cz/node/".Length;

void Main()
{
	var csvFilename = @"y:\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2019-05.csv";
	using (var geojson = new StreamWriter(@"y:\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2019-05.json", false, new UTF8Encoding(false)))
	{
		float minLat = Single.PositiveInfinity;
		float maxLat = Single.NegativeInfinity;
		float minLon = Single.PositiveInfinity;
		float maxLon = Single.NegativeInfinity;
		foreach (var entry in ReadCsv(csvFilename))
		{
			var lat = ParseFloat(entry[1]);
			var lon = ParseFloat(entry[2]);
			minLat = Math.Min(lat, minLat);
			maxLat = Math.Max(lat, maxLat);
			minLon = Math.Min(lon, minLon);
			maxLon = Math.Max(lon, maxLon);
		}
		geojson.WriteLine($@"{{
	    ""type"": ""FeatureCollection"",
	    ""generator"": ""DrobnéPamátky2WikidataImport"",
	    ""bbox"": [
			{CoordToStr(minLon)},
			{CoordToStr(minLat)},
			{CoordToStr(maxLon)},
			{CoordToStr(maxLat)}
	    ],
	    ""features"": [");
		var first = true;
		foreach (var entry in ReadCsv(csvFilename))
		{
			var lat = ParseFloat(entry[1]);
			var lon = ParseFloat(entry[2]);
			var name = entry[0];
			// TODO: Map to Wikidata class
			var type = entry[5];
			var administrative = entry[3];
			var id = entry[6].Substring(urlPrefixLength);

			if (!first)
			{
				geojson.Write(",");
			}
			first = false;
			geojson.WriteLine();
			// TODO: JSON encoding
			geojson.Write($@"{{
			""type"": ""Feature"",
			""properties"": {{
				""label:cs"": ""{name}"",
				""P31"": ""{type}"",
				""P131^label:cs"": ""{administrative}"",
				""P6736"": ""{id}""
			}},
			""geometry"": {{
				""type"": ""Point"",
				""coordinates"": [
					{CoordToStr(lon)},
					{CoordToStr(lat)}
				]
			}}
}}");
		}
		geojson.WriteLine();
		geojson.WriteLine("]");
		geojson.WriteLine("}");
	}
}

private static IEnumerable<string[]> ReadCsv(string filename)
{
	using (var csv = new StreamReader(@"y:\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2019-05.csv", Encoding.UTF8))
	{
		String line;
		var header = true;
		while ((line = csv.ReadLine()) != null)
		{
			if (header)
			{
				header = false;
				continue;
			}
			var columns = line.Split(';');
			// TODO: Proper CSV unescape/parser
			for(var i = 0; i < columns.Length; ++i)
			{
				if (columns[i].StartsWith("\""))
				{
					Debug.Assert(columns[i].EndsWith("\""));
					// TODO: Do not replace " with ' as soon as we have JSON escaping
					columns[i] = columns[i].Substring(1, columns[i].Length - 2).Replace("\"\"", "'");
				}
			}
			yield return columns;
		}
	}
}

private static float ParseFloat(string s)
{
	return Single.Parse(s, CultureInfo.InvariantCulture);
}

private static string CoordToStr(float c)
{
	return c.ToString("N13", CultureInfo.InvariantCulture);
}
