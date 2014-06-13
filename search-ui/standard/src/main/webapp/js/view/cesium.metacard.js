/**
 * Copyright (c) Codice Foundation
 *
 * This is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details. A copy of the GNU Lesser General Public License is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 *
 **/
/*global define*/

define(function (require) {
    "use strict";
    var Backbone = require('backbone'),
        Marionette = require('marionette'),
        _ = require('underscore'),
        Cesium = require('cesium'),
        dir = require('direction'),
        Views = {};


    Views.PointView = Marionette.ItemView.extend({
        initialize: function (options) {
            this.geoController = options.geoController;
            if(! options.ignoreEvents) {
                this.listenTo(this.model, 'change:context', this.toggleSelection);
                this.listenTo(this.geoController, 'click:left', this.onMapLeftClick);
                this.listenTo(this.geoController, 'doubleclick:left', this.onMapDoubleClick);
            }
            this.color = options.color || {red: 1, green: 0.6431372549019608, blue: 0.403921568627451, alpha: 1 };
            this.imageIndex = options.imageIndex || 0;
            this.buildBillboard();
        },

        isThisPrimitive : function(event){
            var view = this;
            // could wrap this in one huge if statement, but this seems more readable
            if(_.has(event,'object')){
                if(event.object === view.billboard){
                    return true;
                }
                if(_.contains(view.lines, event.object)){
                    return true;
                }
            }
            return false;
        },

        buildBillboard: function () {
            var view = this;
            
            //TODO: using a promise to add the billboards will not work correctly when in asynchronous mode
            //for the time being I'm going to leave this code here commented out until after
            //the async UI work is completed
//                this.geoController.billboardPromise.then(function () {
                var point = view.model.get('geometry').getPoint();
                view.billboard = view.geoController.billboardCollection.add({
                    imageIndex: view.imageIndex,
                    position: view.geoController.ellipsoid.cartographicToCartesian(
                        Cesium.Cartographic.fromDegrees(
                            point.longitude,
                            point.latitude,
                            point.altitude
                        )
                    ),
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    scaleByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.5e7, 0.5)
                });
                view.billboard.setColor(view.color);
                view.billboard.setScale(0.41);
                view.billboard.hasScale = true;
        },

        toggleSelection: function () {
            var view = this;

            if (view.billboard.getEyeOffset().z < 0) {
                view.billboard.setEyeOffset(new Cesium.Cartesian3(0, 0, 0));
            } else {
                view.billboard.setEyeOffset(new Cesium.Cartesian3(0, 0, -10));
            }

            if (view.model.get('context')) {
                view.billboard.setScale(0.5);
                view.billboard.setImageIndex(view.imageIndex + 1);
            } else {
                view.billboard.setScale(0.41);
                view.billboard.setImageIndex(view.imageIndex);
            }

        },
        onMapLeftClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (_.has(event, 'object') && event.object === view.billboard) {
                view.model.set('direction', dir.none);
                view.model.set('context', true);
            }
        },
        onMapDoubleClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (_.has(event, 'object') && event.object === view.billboard) {
                view.geoController.flyToLocation(view.model);

            }
        },

        onClose: function () {
            var view = this;

            // If there is already a billboard for this view, remove it
            if (!_.isUndefined(view.billboard)) {
                view.geoController.billboardCollection.remove(view.billboard);

            }
            this.stopListening();
        }

    });

    Views.MultiPointView = Views.PointView.extend({
        initialize: function (options) {
            Views.PointView.prototype.initialize.call(this, options);
        },
        
        buildBillboard: function () {
            var view = this;

            var points = view.model.get('geometry').getMultiPoint();
            var cartPoints = _.map(points, function (point) {
                return Cesium.Cartographic.fromDegrees(point.longitude, point.latitude, point.altitude);
            });
            
            view.points = _.map(cartPoints, function(point) {
                var billboard = view.geoController.billboardCollection.add({
                    imageIndex: view.imageIndex,
                    position: view.geoController.ellipsoid.cartographicToCartesian(point),
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    scaleByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.5e7, 0.5)
                });
                billboard.setColor(view.color);
                billboard.setScale(0.41);
                billboard.hasScale = true;
                return billboard;
            });
        },

        toggleSelection: function () {
            var view = this;

            _.each(view.points, function(point) {
                if (point.getEyeOffset().z < 0) {
                    point.setEyeOffset(new Cesium.Cartesian3(0, 0, 0));
                } else {
                    point.setEyeOffset(new Cesium.Cartesian3(0, 0, -10));
                }
                if (view.model.get('context')) {
                    point.setScale(0.5);
                    point.setImageIndex(view.imageIndex + 1);
                } else {
                    point.setScale(0.41);
                    point.setImageIndex(view.imageIndex);
                }
            });
        },
        
        onMapLeftClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (_.has(event, 'object') && _.contains(view.points, event.object)) {
                view.model.set('direction', dir.none);
                view.model.set('context', true);
            }
        },
        onMapDoubleClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (_.has(event, 'object') && _.contains(view.points, event.object)) {
                view.geoController.flyToLocation(view.model);
            }
        },

        onClose: function () {
            var view = this;

            if (!_.isUndefined(view.points)) {
                _.each(view.points, function(point) {
                    view.geoController.billboardCollection.remove(point);
                });
            }

            this.stopListening();
        }
    });
    
    Views.LineView = Views.PointView.extend({
        initialize: function (options) {
            options.color = options.color || new Cesium.Color(0.3568627450980392, 0.5764705882352941, 0.8823529411764706, 1);
            Views.PointView.prototype.initialize.call(this, options);

            this.buildLine();

        },

        onMapLeftClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (view.isThisPrimitive(event)) {
                view.model.set('direction', dir.none);
                view.model.set('context', true);
            }
        },
        onMapDoubleClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (view.isThisPrimitive(event)) {
                view.geoController.flyToLocation(view.model);

            }
        },
        
        addLine : function(positions) {
            this.lines.add({
                positions: positions,
                width: 2
            });
        },
        
        buildLine: function () {
            var view = this;
            var points = view.model.get('geometry').getLineString();
            var cartPoints = _.map(points, function (point) {
                return Cesium.Cartographic.fromDegrees(point.longitude, point.latitude, point.altitude);
            });
            var positions = view.geoController.ellipsoid.cartographicArrayToCartesianArray(cartPoints);
            
            // Add primitives
            view.lines = new Cesium.PolylineCollection();
            view.addLine(positions);
            
            view.geoController.scene.getPrimitives().add(view.lines);
        },

        onClose: function () {
            var view = this;

            // If there is already a billboard for this view, remove it
            if (!_.isUndefined(view.billboard)) {
                view.geoController.billboardCollection.remove(view.billboard);
            }
            if (!_.isUndefined(view.lines)) {
                _.each(view.lines, function (linePrimitive) {
                    view.geoController.scene.getPrimitives().remove(linePrimitive);
                });
            }

            this.stopListening();
        }
    });

    Views.MultiLineView = Views.LineView.extend({
        buildLine: function () {
            var view = this;
            var lineList = view.model.get('geometry').getMultiLineString();
            view.lines = new Cesium.PolylineCollection();
            var pointConverter = function (point) {
                return Cesium.Cartographic.fromDegrees(point.longitude, point.latitude, point.altitude);
            };
            _.each(lineList, function(points) { 
                var cartPoints = _.map(points, pointConverter);
                var positions = view.geoController.ellipsoid.cartographicArrayToCartesianArray(cartPoints);

                view.addLine(positions);
            });
            view.geoController.scene.getPrimitives().add(view.lines);
        },
    });
    
    Views.RegionView = Views.PointView.extend({
        initialize: function (options) {
            this.color = options.color || {red: 1, green: 0.6431372549019608, blue: 0.403921568627451, alpha: 1 };
            // a light blue
            this.polygonColor = options.polygonColor || new Cesium.Color(0.3568627450980392, 0.5764705882352941, 0.8823529411764706, 0.2);
            this.color = options.color || {red: this.polygonColor.red, green: this.polygonColor.green, blue: this.polygonColor.blue, alpha: 1};
            // a grey matching the outline of the default marker
            this.outlineColor = options.outlineColor || new Cesium.Color(0.707, 0.707, 0.707, 1);
            this.imageIndex = options.imageIndex || 0;

            Views.PointView.prototype.initialize.call(this, options);
            this.buildPolygon();

        },
        
        toggleSelection : function(){
            var view = this;
            // call super for billboard modification
            Views.PointView.prototype.toggleSelection.call(this);
            if (view.model.get('context')) {
                view.setPolygonSelected();
            }else{
                view.setPolygonUnselected();
            }

        },
        onMapLeftClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (view.isThisPrimitive(event)) {
                view.model.set('direction', dir.none);
                view.model.set('context', true);
            }
        },
        onMapDoubleClick: function (event) {
            var view = this;
            // find out if this click is on us
            if (view.isThisPrimitive(event)) {
                view.geoController.flyToLocation(view.model);

            }
        },

        pointsEqual : function (p1, p2) {
            return p1.x === p2.x && p1.y === p2.y && p1.z === p2.z;
        },
        
        validatePolygon : function (positions) {
            if(positions.length < 4 || 
                    ! this.pointsEqual(positions[0], positions[positions.length - 1])) {
                return false;
            }
            for(var i = 1; i < positions.length; i++) {
                if(this.pointsEqual(positions[i - 1], positions[i])) {
                    return false;
                }
            }
            return true;
        },

        getOutlineColor: function () {
            return new Cesium.PerInstanceColorAppearance({
                flat: true,
                renderState: {
                    depthTest: {
                        enabled: true
                    },
                    lineWidth: Math.min(2.0, this.geoController.scene.getContext().getMaximumAliasedLineWidth())
                }
            });

        },
        
        getPolygonOutline: function(positions) {
            return new Cesium.GeometryInstance({
                geometry: Cesium.PolygonOutlineGeometry.fromPositions({positions: positions}),
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(this.outlineColor),
                    show : new Cesium.ShowGeometryInstanceAttribute(true)
                },
                id : 'outline'
            });
        },
        
        getPolygonFill: function(positions) {
            return new Cesium.GeometryInstance({
                geometry: Cesium.PolygonGeometry.fromPositions({
                    positions: positions,
                    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
                }),
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(this.polygonColor),
                    show : new Cesium.ShowGeometryInstanceAttribute(false)
                },
                id : 'polyfill'
            });
        },
        
        buildPolygon: function () {
            var view = this;
            var points = view.model.get('geometry').getPolygon();
            var cartPoints = _.map(points, function (point) {
                return Cesium.Cartographic.fromDegrees(point.longitude, point.latitude, point.altitude);
            });
            var positions = view.geoController.ellipsoid.cartographicArrayToCartesianArray(cartPoints);
            
            if(! this.validatePolygon(positions)) {
                return false;
            }

            // Add primitives
            view.polygons = [
                new Cesium.Primitive({
                    geometryInstances: [view.getPolygonOutline(positions)],
                    appearance: view.getOutlineColor()
                }),
                new Cesium.Primitive({
                    geometryInstances: [view.getPolygonFill(positions)],
                    appearance: new Cesium.PerInstanceColorAppearance({
                        closed: true
                    })
                })
            ];
            
            _.each(view.polygons, function (polygonPrimitive) {
                view.geoController.scene.getPrimitives().add(polygonPrimitive);
            });
        },

        setPolygonSelected : function(){
            var view = this;
            var attributes = view.polygons[0].getGeometryInstanceAttributes('outline');
            attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.BLACK);

            var fillAttributes = view.polygons[1].getGeometryInstanceAttributes('polyfill');
            fillAttributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true, fillAttributes.show);
        },

        setPolygonUnselected : function(){
            var view = this;
            var attributes = view.polygons[0].getGeometryInstanceAttributes('outline');
            attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(view.outlineColor);

            var fillAttributes = view.polygons[1].getGeometryInstanceAttributes('polyfill');
            fillAttributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(false, fillAttributes.show);
        },

        onClose: function () {
            var view = this;

            // If there is already a billboard for this view, remove it
            if (!_.isUndefined(view.billboard)) {
                view.geoController.billboardCollection.remove(view.billboard);
            }
            if (!_.isUndefined(view.polygons)) {
                _.each(view.polygons, function (polygonPrimitive) {
                    view.geoController.scene.getPrimitives().remove(polygonPrimitive);
                });
            }

            this.stopListening();
        }
    });
    
    Views.MultiRegionView = Views.RegionView.extend({
        buildPolygon: function () {
            var view = this;
            var polygonList = view.model.get('geometry').getMultiPolygon();
            view.polygons = [];
            var pointConverter = function (point) {
                return Cesium.Cartographic.fromDegrees(point.longitude, point.latitude, point.altitude);
            };
            for(var i = 0; i < polygonList.length; i++) {
                var points = polygonList[i];
                var cartPoints = _.map(points, pointConverter);
                var positions = view.geoController.ellipsoid.cartographicArrayToCartesianArray(cartPoints);
                
                if(! this.validatePolygon(positions)) {
                    return false;
                }
    
                // Add primitives
                view.polygons[2*i] = new Cesium.Primitive({
                        geometryInstances: [view.getPolygonOutline(positions)],
                        appearance: view.getOutlineColor()
                    });
                view.polygons[2*i + 1] = new Cesium.Primitive({
                        geometryInstances: [view.getPolygonFill(positions)],
                        appearance: new Cesium.PerInstanceColorAppearance({
                            closed: true
                        })
                    });
            }
            _.each(view.polygons, function (polygonPrimitive) {
                view.geoController.scene.getPrimitives().add(polygonPrimitive);
            });
        },

        setPolygonSelected : function(){
            var view = this;
            var attributes, fillAttributes;

            for(var i = 0; i < view.polygons.length; i += 2) {
                attributes = view.polygons[i].getGeometryInstanceAttributes('outline');
                attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.BLACK);

                fillAttributes = view.polygons[i + 1].getGeometryInstanceAttributes('polyfill');
                fillAttributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true, fillAttributes.show);
            }
        },

        setPolygonUnselected : function(){
            var view = this;
            var attributes, fillAttributes;
            
            for(var i = 0; i < view.polygons.length; i += 2) {
                attributes = view.polygons[i].getGeometryInstanceAttributes('outline');
                attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(view.outlineColor);

                fillAttributes = view.polygons[i + 1].getGeometryInstanceAttributes('polyfill');
                fillAttributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(false, fillAttributes.show);
            }
        }
    });

    Views.GeometryCollectionView = Views.PointView.extend({
        initialize: function (options) {
            options.color = options.color || {red: 1, green: 1, blue: 0.403921568627451, alpha: 1 };
            options.polygonColor = options.polygonColor || {red: 1, green: 1, blue: 0.404, alpha: 0.2 };

            this.buildGeometryCollection(options);
            Views.PointView.prototype.initialize.call(this, options);            
        },
        
        buildGeometryCollection: function (options) {
            var collection = this.model.get('geometry');

            this.geometries = _.map(collection.getGeometryCollection(), function(geo) {

                var subOptions = _.clone(options);
                var subModel = _.clone(options.model);
                subOptions.ignoreEvents = true;
                subModel.set('geometry', geo);
                subOptions.model = subModel;
                if (geo.isPoint()) {
                    return new Views.PointView(subOptions);
                } else if (geo.isMultiPoint()) {
                    return new Views.MultiPointView(subOptions);
                } else if (geo.isPolygon()) {
                    return new Views.RegionView(subOptions);
                } else if (geo.isMultiPolygon()) {
                    return new Views.MultiRegionView(subOptions);
                }  else if (geo.isLineString()) {
                    return new Views.LineView(subOptions);
                } else if (geo.isMultiLineString()) {
                    return new Views.MultiLineView(subOptions);
                } else if (geo.isGeometryCollection()) {
                    return new Views.GeometryCollectionView(subOptions);
                } else {
                    throw new Error("No view for this geometry");
                }
            });
            this.model.set('geometry', collection);
        },

        buildBillboard: function () {
        },

        toggleSelection: function () {
            var view = this;

            _.each(view.geometries, function(geometry) {
                geometry.toggleSelection();
            });
        },
        
        onMapLeftClick: function (event) {
            var view = this;

            _.each(view.geometries, function(geometry) {
                geometry.onMapLeftClick(event);
            });
        },

        onMapDoubleClick: function (event) {
            var view = this;
            _.each(view.geometries, function(geometry) {
                geometry.onMapDoubleClick(event);
            });
        },

        onClose: function () {
            var view = this;

            _.each(view.geometries, function(geometry) {
                geometry.onClose();
            });

            this.stopListening();
        }
    });
    
    
    Views.ResultsView = Marionette.CollectionView.extend({
        itemView: Backbone.View,
        initialize: function (options) {
            this.geoController = options.geoController;
        },

         // get the child view by item it holds, and remove it
        removeItemView: function (item) {
            var view = this.children.findByModel(item.get('metacard'));
            this.removeChildView(view);
            this.checkEmpty();
        },

        buildItemView: function (item, ItemViewType, itemViewOptions) {
            var metacard = item.get('metacard'),
                geometry = metacard.get('geometry'),
                ItemView;
            if (!geometry) {
                var opts = _.extend({model: metacard}, itemViewOptions);
                return new ItemViewType(opts);
            }
            // build the final list of options for the item view type.
            var options = _.extend({model: metacard, geoController: this.geoController}, itemViewOptions);

            if (geometry.isPoint()) {
                ItemView = Views.PointView;
            } else if (geometry.isMultiPoint()) {
                ItemView = Views.MultiPointView;
            } else if (geometry.isPolygon()) {
                ItemView = Views.RegionView;
            } else if (geometry.isMultiPolygon()) {
                ItemView = Views.MultiRegionView;
            }  else if (geometry.isLineString()) {
                ItemView = Views.LineView;
            } else if (geometry.isMultiLineString()) {
                ItemView = Views.MultiLineView;
            } else if (geometry.isGeometryCollection()) {
                ItemView = Views.GeometryCollectionView;
            } else {
                throw new Error("No view for this geometry");
            }

            // create the item view instance
            var view = new ItemView(options);
            // return it
            return view;
        }
    });
    return Views;
});
