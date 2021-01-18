private static readonly int urlPrefixLength = "https://www.drobnepamatky.cz/node/".Length;

// name; Druh památky; latitude; longitude; Okres; Obec; řazení; Katastrální území; Datum; URL
// name;Druh památky;latitude;longitude;Okres;Obec; XXX řazení XXX;Katastrální území;Datum;URL
// name;Druh památky;latitude;longitude;Okres;Obec;Katastrální území;URL
private const int COLUMN_NAME = 0;
private const int COLUMN_TYPE = 1;
private const int COLUMN_LAT = 2;
private const int COLUMN_LON = 3;
private const int COLUMN_ADMINISTRATIVE = 5;
private const int COLUMN_URL = 7;
private const int COLUMN_COUNT = 8;

private static readonly Dictionary<string, string> typeClassMapping = new Dictionary<string, string> {
 { "Altán", "Q961082" },
 { "Boží muka", "Q3395121" },
 { "Dopravní památka", "Q5003624" },	// ?
 { "Hodiny", "Q376" },
 { "Hraniční kámen", "Q921099" },
 { "Kaple", "Q108325" },
 { "Kaplička", "Q14552192" },
 { "Kašna", "Q12029081" },
 { "Krajinné umění", "?" },	// ??TODO
 { "Křížový kámen", "Q38411643" },
 { "Menhir", "Q193475" },
 { "Něco jiného", "?" },
 { "Nenalezena", "?" },	//???
 { "Neznámý", "?" },	//??
 { "Obrázek", "Q478798" },	//?
 { "Památná dlažba", "Q3328263" }, //?
 { "Památník", "Q5003624" },
 { "Památný kámen", "Q11734477" },
 { "Pamětní deska", "Q721747" },
 { "Pamětní kříž", "Q2309609" },
 { "Plastika", "Q12045520" },	// TODO: Fix WD
 { "Pomník", "Q4989906" },
 { "Pomník padlým", "Q575759" },	// ?
 { "Reliéf", "Q245117" },
 { "Sloup", "Q4817" },
 { "Smírčí kříž", "Q1640496" },
 { "Socha", "Q179700" },
 { "Technická památka", "Q1516537" },
 { "Zvonice", "Q200334" },
 { "Zvonička", "Q10861631" },
};

void Main()
{
	var csvFilename = @"y:\_3rdparty\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2021-01.csv";
	using (var geojson = new StreamWriter(@"y:\_3rdparty\POI-Importer.github.io\datasets\czechia-drobnepamatky\drobnepamatky-2021-01.json", false, new UTF8Encoding(false)))
	{
		float minLat = Single.PositiveInfinity;
		float maxLat = Single.NegativeInfinity;
		float minLon = Single.PositiveInfinity;
		float maxLon = Single.NegativeInfinity;
		foreach (var entry in ReadCsv(csvFilename))
		{
			if (entry.Length < COLUMN_COUNT)
			{
				throw new FormatException("Unexpected row content: " + String.Join(";", entry));
			}
			var lat = ParseFloat(entry[COLUMN_LAT]);
			var lon = ParseFloat(entry[COLUMN_LON]);
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
		/*
		var set = new HashSet<string>();
		foreach (var entry in ReadCsv(csvFilename))
		{
			set.Add(entry[6]);
		}
		foreach(var k in set.OrderBy(s => s))
		{
			Console.WriteLine(k);
		}
		return;
		*/
		foreach (var entry in ReadCsv(csvFilename))
		{
			var lat = ParseFloat(entry[COLUMN_LAT]);
			var lon = ParseFloat(entry[COLUMN_LON]);
			var name = entry[COLUMN_NAME];
			var typeLabel = entry[COLUMN_TYPE];
			if (!typeClassMapping.TryGetValue(typeLabel, out var typeClassQid)) {
				throw new FormatException("Unsupported type: " + typeLabel);
			}
			var typeClass = "http://www.wikidata.org/entity/" + typeClassQid;
			var administrative = entry[COLUMN_ADMINISTRATIVE];
			var id = entry[COLUMN_URL].Substring(urlPrefixLength);

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
				else
				{
					// ugly fix, should not be here at all
					columns[i] = columns[i].Replace('"', '\'');
				}
			}
			yield return columns;
		}
	}
}

private static float ParseFloat(string s)
{
	try
	{
		return Single.Parse(s, CultureInfo.InvariantCulture);
	}
	catch (Exception e)
	{
		throw new FormatException(String.Format("Invalid number: '{0}'", s), e);
	}
}

private static string CoordToStr(float c)
{
	return c.ToString("N13", CultureInfo.InvariantCulture);
}
