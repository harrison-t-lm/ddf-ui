/*global define*/

define(function (require) {
    "use strict";
    var $ = require('jquery'),
        Backbone = require('backbone'),
        _ = require('underscore'),
        QueryFormView = require('js/view/Query.view'),
        MetacardList = require('js/view/MetacardList.view'),


    SearchControlView = Backbone.View.extend({

    events: {
        'click .back': 'back',
        'click .forward': 'forward'
    },
    views: {
        'queryForm': 'queryForm',
        'resultList': 'resultList',
        'metacardDetail': 'metacardDetail',
        'map': 'placeholder' //TODO this should go away when we do something else with the map
    },
    initialize: function(options) {
        _.bindAll(this, "render", "showQuery", "showResults", "showMetacardDetail", "back", "forward");
        this.selectedView = "queryForm";
        this.views.queryForm = new QueryFormView({searchControlView: this, el: this.$el.children('#searchPages')});
        this.views.resultList = new MetacardList.MetacardListView({searchControlView: this, el: this.$el.children('#searchPages')});
        this.views.map = options.map;
    },
    render: function() {
        this.views[this.selectedView].render();
        return this;
    },
    back: function() {
//        if(this.selectedView === "queryForm")
//        {
//            //we don't have anything behind this page yet
//        }
        if(this.selectedView === "resultList")
        {
            //go back to query
            this.showQuery();
        }
        else if(this.selectedView === "metacardDetail")
        {
            this.showResults();
        }
    },
    forward: function() {
        if(this.selectedView === "queryForm")
        {
            this.showResults();
        }
//        else if(this.selectedView === "resultList")
//        {
//            //no forward here
//        }
//        else if(this.selectedView === "metacardDetail")
//        {
//            //no forward here
//        }
    },
    showQuery: function() {
        $(".back").hide();
        $(".forward").show();
        $(".forwardNavText").text("Results ("+this.views.resultList.model.get("hits")+")");
        this.selectedView = "queryForm";
        this.render();
    },
    showResults: function(result) {
        $(".forward").hide();
        $(".back").show();
        $(".backNavText").text("Query");
        if(result) {
            this.views.map.createResultsOnMap(result);
            this.views.resultList = new MetacardList.MetacardListView({ result: result, mapView: this.mapView, searchControlView: this, el: this.$el.children('#searchPages') });
        }
        this.selectedView = "resultList";
        this.render();
    },
    showMetacardDetail: function(metacard) { //just guessing at what this method sig might be
        $(".back").show();
        $(".forward").hide();
        $(".backNavText").text("Results");
    }
});

    return SearchControlView;
});