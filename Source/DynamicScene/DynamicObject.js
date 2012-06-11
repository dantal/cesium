/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/TimeInterval',
        './DynamicProperty',
        './DynamicPositionProperty',
        './DynamicVertexPositionsProperty',
        './CzmlQuaternion'
    ], function(
        DeveloperError,
        TimeInterval,
        DynamicProperty,
        DynamicPositionProperty,
        DynamicVertexPositionsProperty,
        CzmlQuaternion) {
    "use strict";

    function DynamicObject(id) {
        if (typeof id === 'undefined' || id === null) {
            throw new DeveloperError("id is required");
        }

        this.id = id;

        //Add standard CZML properties.  Even though they won't all be used
        //for each object, having the superset directly will allow the compiler
        //to greatly optimize this class.  Any changes to this list should
        //coincide with changes to CzmlStandard.updaters
        this.billboard = undefined;
        this.cone = undefined;
        this.label = undefined;
        this.point = undefined;
        this.polygon = undefined;
        this.polyline = undefined;
        this.pyramid = undefined;
        this.position = undefined;
        this.orientation = undefined;
        this.vertexPositions = undefined;
        this.availability = undefined;
    }

    DynamicObject.prototype.isAvailable = function(time) {
        return typeof this.availability === 'undefined' || this.availability.contains(time);
    };

    DynamicObject.processCzmlPacketPosition = function(dynamicObject, packet, buffer, sourceUri) {
        var positionData = packet.position;
        if (typeof positionData !== 'undefined') {
            var position = DynamicPositionProperty.processCzmlPacket(positionData, buffer, sourceUri, dynamicObject.position);
            if (typeof dynamicObject.position === 'undefined') {
                dynamicObject.position = position;
                return true;
            }
            return false;
        }
    };

    DynamicObject.processCzmlPacketOrientation = function(dynamicObject, packet, dynamicObjectCollection) {
        var orientationData = packet.orientation;
        if (typeof orientationData !== 'undefined') {
            return DynamicProperty.processCzmlPacket(dynamicObject, "orientation", CzmlQuaternion, orientationData, undefined, dynamicObjectCollection);
        }
        return false;
    };

    DynamicObject.processCzmlPacketVertexPositions = function(dynamicObject, packet, buffer, sourceUri) {
        var vertexPositionsData = packet.vertexPositions;
        if (typeof vertexPositionsData !== 'undefined') {
            var vertexPositions = DynamicVertexPositionsProperty.processCzmlPacket(vertexPositionsData, buffer, sourceUri, dynamicObject.vertexPositions);
            if (typeof dynamicObject.vertexPositions === 'undefined') {
                dynamicObject.vertexPositions = vertexPositions;
                return true;
            }
            return false;
        }
    };

    DynamicObject.processCzmlPacketAvailability = function(dynamicObject, packet, buffer, sourceUri) {
        var availability = packet.availability;
        if (typeof availability !== 'undefined') {
            var interval = TimeInterval.fromIso8601(availability);
            if (typeof interval !== 'undefined') {
                dynamicObject.availability = interval;
            }
            return true;
        }
        return false;
    };

    DynamicObject.mergeProperties = function(targetObject, objectToMerge) {
        targetObject.position = targetObject.position || objectToMerge.position;
        targetObject.orientation = targetObject.orientation || objectToMerge.orientation;
        targetObject.vertexPositions = targetObject.vertexPositions || objectToMerge.vertexPositions;
        targetObject.availability = targetObject.availability || objectToMerge.availability;
    };

    DynamicObject.undefineProperties = function(dynamicObject) {
        dynamicObject.position = undefined;
        dynamicObject.orientation = undefined;
        dynamicObject.vertexPositions = undefined;
        dynamicObject.availability = undefined;
    };

    return DynamicObject;
});