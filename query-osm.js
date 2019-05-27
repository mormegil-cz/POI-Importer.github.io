var queryProviderOsm = {
    initQuery: function() {
        return "";
    },
    addItem: function(state, settings, tileBbox, _tileName) {
        var types = settings.types || ["node"];
        var query = "(";
        for (var t = 0; t < types.length; t++)
            query += types[t] + settings.query + "(" + tileBbox.b + "," + tileBbox.l + "," + tileBbox.t + "," + tileBbox.r + ");";
        query += "); out center; out count;\n";
        return state + query;
    },
    finishQuery: function(state) {
        return "[out:json];\n" + state;
    }
}
