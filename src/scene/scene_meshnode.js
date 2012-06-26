pc.extend(pc.scene, function () {
    var RenderStyle = {
        NORMAL: 0,
        WIREFRAME: 1
    };

    /**
     * @name pc.scene.MeshNode
     * @class A mesh.
     */
    var MeshNode = function MeshNode() {
        this._geometry = null;
        this._style = RenderStyle.NORMAL;
        this._castShadows = false;
        this._receiveShadows = true;
        this._aabb = new pc.shape.Aabb();
        this._bones = null; // For skinned meshes, the bones array that influences the skin
    }
    MeshNode = pc.inherits(MeshNode, pc.scene.GraphNode);

    MeshNode._current = null;

    /**
     * @private
     * @function
     * @name pc.scene.MeshNode#_cloneInternal
     * @description Internal function for cloning the contents of a mesh node. Also clones
     * the properties of the superclass GraphNode.
     * @param {pc.scene.MeshNode} clone The clone that will receive the copied properties.
     */
    MeshNode.prototype._cloneInternal = function (clone) {
        // Clone GraphNode properties
        MeshNode._super._cloneInternal.call(this, clone);

        // Clone MeshNode properties
        clone.setGeometry(this.getGeometry());
        clone.setRenderStyle(this.getRenderStyle());
        clone.setReceiveShadows(this.getReceiveShadows());
        clone.setCastShadows(this.getCastShadows());
        
        // Notice the bone array isn't cloned here.  This generated externally
        // (normally in Model#clone) where a graph is supplied to find bones
        // matching the bone IDs on the geometry.
    };

    /**
     * @function
     * @name pc.scene.MeshNode#clone
     * @description Duplicates a mesh node but does not 'deep copy' the geometry. Instead,
     * any attached geometry is referenced in the returned cloned MeshNode.
     * @returns {pc.scene.MeshNode} A cloned MeshNode.
     * @author Will Eastcott
     */
    MeshNode.prototype.clone = function () {
        var clone = new pc.scene.MeshNode();
        this._cloneInternal(clone);
        return clone;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#dispatch
     * @description Dispatches the mesh's assigned geometry with the mesh's world transformation
     * matrix.
     * @author Will Eastcott
     */
    MeshNode.prototype.dispatch = function () {
        MeshNode._current = this;

        var geom = this._geometry;
        if (geom !== null) {
            if (geom.isSkinned()) {
                var i, numBones;
                var matrixPalette = geom.getMatrixPalette();
                var invBindPose = geom.getInverseBindPose();
                var m4Mult = pc.math.mat4.multiply;
                for (i = 0, numBones = this._bones.length; i < numBones; i++) {
                    m4Mult(this._bones[i]._wtm, invBindPose[i], matrixPalette[i]);
                }
            } 

            geom.dispatch(this._wtm, this._style);
        }
        
        MeshNode._current = null;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#getCastShadows
     * @description Queries whether the specified mesh occludes light from dynamic 
     * lights that cast shadows.
     * @returns {Boolean} True if the specified mesh casts shadows, false otherwise.
     * @author Will Eastcott
     */
    MeshNode.prototype.getCastShadows = function () {
        return this._castShadows;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#getReceiveShadows
     * @description Queries whether the specified mesh cast shadows onto other meshes.
     * @returns {Boolean} True if the specified mesh cast shadows, false otherwise.
     * @author Will Eastcott
     */
    MeshNode.prototype.getReceiveShadows = function () {
        return this._receiveShadows;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#getGeometry
     * @description Returns the geometry assigned to this mesh node. If no geometry is assigned, then
     * null is returned.
     * @returns {pc.scene.Geometry} The attached geometry or null if no geometry is assigned.
     * @author Will Eastcott
     */
    MeshNode.prototype.getGeometry = function () {
        return this._geometry;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#getRenderStyle
     * @description Return the render style for the specified mesh node. The style signifies
     * either a 'normal' style or a 'wireframe' style.
     * @returns {pc.scene.RenderStyle} The current render style for the mesh node.
     * @author Will Eastcott
     */
    MeshNode.prototype.getRenderStyle = function () {
        return this._style;
    }

    /**
     * @function
     * @name pc.scene.MeshNode#getVolume
     * @description
     * @returns {pc.shape.Sphere}
     * @author Will Eastcott
     */
    MeshNode.prototype.getVolume = function () {
        var volumeLocal = this._geometry.getVolume();
        if (volumeLocal && volumeLocal instanceof pc.shape.Sphere) {
            var volumeWorld = new pc.shape.Sphere();
            pc.math.mat4.multiplyVec3(volumeLocal.center, 1.0, this._wtm, volumeWorld.center);
            var scale = pc.math.mat4.getScale(this._wtm);
            volumeWorld.radius = volumeLocal.radius * scale[0];
            return volumeWorld;
        }
        return null;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#setOccludeLight
     * @description Toggles the casting of shadows from this mesh. In other words, if true
     * is passed to this function, the mesh will be treated as an occluder.
     * @param {Boolean} castShadows True to cast shadows from this mesh, false otherwise.
     * @author Will Eastcott
     */
    MeshNode.prototype.setCastShadows = function (castShadows) {
        this._castShadows = castShadows;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#setReceiveShadows
     * @description Toggles the receiving of shadows for the specified mesh. In other words, 
     * if true is passed to this function, the mesh will be mapped with the shadows cast from
     * occluding meshes via shadow casting light sources.
     * @param {Boolean} receiveShadows True to receive shadows on this mesh, false otherwise.
     * @author Will Eastcott
     */
    MeshNode.prototype.setReceiveShadows = function (receiveShadows) {
        this._receiveShadows = receiveShadows;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#setGeometry
     * @description Assigns a geometry to the specified mesh node. Note that multiple mesh nodes can
     * reference the same geometry which effectively implements instancing. This can reduce the memory
     * footprint and load time for any given model.
     * @param {pc.scene.Geometry} geometry
     * @author Will Eastcott
     */
    MeshNode.prototype.setGeometry = function (geometry) {
        this._geometry = geometry;
    };

    /**
     * @function
     * @name pc.scene.MeshNode#setRenderStyle
     * @description Sets the render style for the specified mesh node. The style can be
     * either a 'normal' style or a 'wireframe' style. For a wireframe style to be set,
     * the mesh node's geometry have previously had pc.scene.Geometry#generateWireframe
     * called on it.
     * @param {pc.scene.RenderStyle} style The current render style for the mesh node.
     * @author Will Eastcott
     */
    MeshNode.prototype.setRenderStyle = function (style) {
        this._style = style;
    }

    MeshNode.prototype.syncAabb = function () {
        this._aabb.setFromTransformedAabb(this._geometry._aabb, this._wtm);
    }

    MeshNode.prototype.getAabb = function () {
        return this._aabb;
    }

    return {
        RenderStyle: RenderStyle,
        MeshNode: MeshNode
    }; 
}());