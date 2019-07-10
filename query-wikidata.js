var queryProviderWikidata = {
    initQuery: function() {
        return {first: true, query: [], variables: {}};
    },
    addItem: function(state, settings, tileBbox, tileName) {
        var q = state.query;
        if (!state.first) {
            q.push(" UNION ");
        }
        state.first = false;
        q.push("{ BIND('");
        q.push(tileName);
        q.push("' AS ?tileName) ");
        q.push(settings.query);
        q.push(" SERVICE wikibase:box { ?item wdt:P625 ?coords. bd:serviceParam wikibase:cornerWest \"Point(" + tileBbox.l + "," + tileBbox.b + ")\"^^geo:wktLiteral. bd:serviceParam wikibase:cornerEast \"Point(" + tileBbox.r + "," + tileBbox.t + ")\"^^geo:wktLiteral. } ");
        for (var i = 0; i < settings.tagmatch.length; ++i) {
            var key = settings.tagmatch[i].key;

            var arrow = key.indexOf('^');
            var varName = '?' + key.replace('^', '_').replace(':', '_');
            if (arrow < 0) {
                if (key.substr(0, 6) === 'label:') {
                    var lang = key.substr(6);
                    q.push("OPTIONAL { ?item rdfs:label " + varName + ". ");
                    q.push("FILTER(LANG(" + varName + ")='" + lang + "') } ");
                } else if (key[0] === 'P') {
                    q.push("OPTIONAL { ?item wdt:" + key + " " + varName + " } ");
                } else {
                    throw Error("Unknown property syntax " + key);
                }
            } else {
                var propName = key.substr(0, arrow);
                var labelName = key.substr(arrow + 1);
                if (propName[0] !== 'P' || labelName.substr(0, 6) !== 'label:') {
                    throw Error("Unknown property syntax " + key);
                }

                q.push("OPTIONAL { ?item wdt:" + propName + " ?" + propName + ". ");

                var lang = labelName.substr(6);
                q.push("?" + propName + " rdfs:label " + varName + ". ");
                q.push("FILTER(LANG(" + varName + ")='" + lang + "') } ");
            }

            state.variables[varName] = true;
        }
        q.push(" }");
        return state;
    },
    finishQuery: function(state) {
        var result = ["SELECT ?item ?tileName (SAMPLE(?lat) AS ?lat) (SAMPLE(?lon) AS ?lon) "];
        for (var varName in state.variables) {
            if (!state.variables.hasOwnProperty(varName)) continue;
            result.push("(SAMPLE(" + varName + ") AS " + varName + ") ");
        }
        result.push("WHERE { BIND(geof:latitude(?coords) AS ?lat). BIND(geof:longitude(?coords) AS ?lon). ");
        result.push(state.query.join(''));
        result.push(" } GROUP BY ?item ?tileName");
        return result.join('');
    }
}
