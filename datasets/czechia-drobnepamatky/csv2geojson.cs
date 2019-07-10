private static readonly int urlPrefixLength = "https://www.drobnepamatky.cz/node/".Length;
private static readonly Dictionary<string, string> typeClassMapping = new Dictionary<string, string> {
 { "Boží muka", "Q3395121" },
 { "Hraniční kámen", "Q921099" },
 { "Křížový kámen", "Q38411643" },
 { "Kašna", "Q12029081" },
 { "Kaple", "Q108325" },
 { "Kaplička", "Q14552192" },
 { "Menhir", "Q193475" },
 { "Něco jiného", "?" },
 { "Neznámý", "?" },
 { "Obrázek", "Q478798" },	//?
 { "Pamětní deska", "Q721747" },
 { "Pamětní kříž", "Q2309609" },
 { "Památník", "Q5003624" },
 { "Památný kámen", "Q11734477" },
 { "Plastika", "Q12045520" },	// TODO: Fix WD
 { "Pomník", "Q4989906" },
 { "Pomník padlým", "Q575759" },	// ?
 { "Sloup", "Q4817" },
 { "Smírčí kříž", "Q1640496" },
 { "Socha", "Q179700" },
 { "Zvonička", "Q10861631" },
};

void Main()
{
	var csvFilename = @"y:\_3rdparty\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2019-05.csv";
	using (var geojson = new StreamWriter(@"y:\_3rdparty\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2019-05.json", false, new UTF8Encoding(false)))
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
			var typeLabel = entry[5];
			var typeClass = "http://www.wikidata.org/entity/" + typeClassMapping[typeLabel];
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
				""P31"": ""{typeClass}"",
				""P31^label:cs"": ""{typeLabel}"",
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
	using (var csv = new StreamReader(filename, Encoding.UTF8))
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
