import { TOKEN } from './config/common-config.js';
import {
	PRODUCT_ID as RASTER_PRODUCT_ID,
	PRODUCT_TYPE as RASTER_PRODUCT_TYPE,
	LAYER_IMAGE_FORMAT
} from './config/raster-config.js';
import {
	TERRAIN_PRODUCT_ID as DEM_TERRAIN_PRODUCT_ID,
	TERRAIN_PRODUCT_TYPE as DEM_TERRAIN_PRODUCT_TYPE,
	DEM_TERRAIN_SCHEME
} from './config/dem-config.js';
import {
	PRODUCT_ID as MODEL_3D_PRODUCT_ID,
	PRODUCT_TYPE as MODEL_3D_PRODUCT_TYPE,
	MODEL_3D_SCHEME
} from './config/3d-config.js';
import { fetchServiceLink } from './utils/catalog-client.js';
import { fetchWmtsTileTemplate } from './utils/wmts-utils.js';

const fsShaderText = `
#define USE_NORMAL_SHADING
uniform float view_distance; // Maximum distance for shadow effect
uniform vec3 viewArea_color; // Color for visible areas
uniform vec3 shadowArea_color; // Color for invisible areas
uniform float percentShade; // Mix number for color blending
uniform sampler2D colorTexture; // Texture for color
uniform sampler2D shadowMap; // Shadow map texture
uniform sampler2D depthTexture; // Depth texture
uniform mat4 shadowMap_matrix; // Shadow map matrix
uniform vec3 viewPosition_WC;  // Uniform for view position
uniform vec3 cameraPosition_WC;  // Uniform for camera position
uniform vec4 shadowMap_camera_positionEC; // Light position in eye coordinates
uniform vec4 shadowMap_camera_directionEC; // Light direction in eye coordinates
uniform vec3 ellipsoidInverseRadii;
uniform vec3 shadowMap_camera_up; // Light up direction
uniform vec3 shadowMap_camera_dir; // Light direction
uniform vec3 shadowMap_camera_right; // Light right direction
uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness; // Shadow map parameters
uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth; // Shadow map parameters
uniform vec4 _shadowMap_cascadeSplits[2];
uniform mat4 _shadowMap_cascadeMatrices[4];
uniform vec4 _shadowMap_cascadeDistances;
uniform bool exclude_terrain;

in vec2 v_textureCoordinates;
out vec4 FragColor;

vec4 toEye(in vec2 uv, in float depth){
    float x = uv.x * 2.0 - 1.0;
    float y = uv.y * 2.0 - 1.0;
    vec4 camPosition = czm_inverseProjection * vec4(x, y, depth, 1.0);
    float reciprocalW = 1.0 / camPosition.w;
    camPosition *= reciprocalW;
    return camPosition;
}

// This function gets the depth from a depth texture.
float getDepth(in vec4 depth){
    // Unpack the depth value from the depth texture
    float z_window = czm_unpackDepth(depth);
    // Reverse the logarithmic depth value to get the linear depth
    z_window = czm_reverseLogDepth(z_window);
    // Get the near and far values of the depth range
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    // Convert the depth value from window coordinates to normalized device coordinates
    return (2.0 * z_window - n_range - f_range) / (f_range - n_range);
}

/**
 * Projects a point onto a plane.
 *
 * @param planeNormal - A vector representing the normal of the plane.
 * @param planeOrigin - A point on the plane.
 * @param point - The point to be projected onto the plane.
 * @return The projection of the point on the plane.
 */
vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){
    // Calculate the vector from the plane origin to the point
    vec3 v01 = point - planeOrigin;

    // Calculate the perpendicular distance from the point to the plane
    float d = dot(planeNormal, v01);

    // Subtract the product of the plane normal and d from the point
    // to get the projection of the point on the plane
    return (point - planeNormal * d);
}

/**
 * Calculates the magnitude (length) of a vector.
 *
 * @param pt - The input vector.
 * @return The magnitude of the vector.
 */
float point2mag(vec3 point){
    // Square each component of the vector, add them together,
    // and take the square root of the result
    return sqrt(point.x*point.x + point.y*point.y + point.z*point.z);
}

/**
 * Main function for the fragment shader.
 */
void main()
{
    // Get the color and depth at the current texture coordinates
    vec4 color = texture(colorTexture, v_textureCoordinates);
    vec4 cDepth = texture(depthTexture, v_textureCoordinates);

    // Get the depth and position in eye coordinates
    float depth = getDepth(cDepth);
    vec4 positionEC = toEye(v_textureCoordinates, depth);

    // If the depth is at its maximum value, set the fragment color to the texture color and return
    if(cDepth.r >= 1.0){
        FragColor = color;
        return;
    }

    //check to see if we are within distance of the view target
    float cameraDistance = length(cameraPosition_WC.xyz - viewPosition_WC.xyz);

    // Get the fragment position in world coordinates
    vec4 fragPosition_WC = vec4(v_textureCoordinates, 0.0, 1.0);

    if (
        cDepth.r >= 1.0 ||
        (exclude_terrain && czm_ellipsoidContainsPoint(ellipsoidInverseRadii, positionEC.xyz))
        ){
        FragColor = color;
        return;
    }

    // Initialize shadow parameters
    czm_shadowParameters shadowParameters;
    shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy;
    shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z;
    shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w;
    shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w;

    // Adjust the depth bias
    shadowParameters.depthBias *= max(depth * 0.01, 1.0);

    // Calculate the direction in eye coordinates
    vec3 directionEC = normalize(positionEC.xyz - shadowMap_camera_positionEC.xyz);

    // Calculate the dot product of the normal and the negative direction
   float nDotL = clamp(dot(vec3(1.0), -directionEC), 0.0, 1.0);

    // Calculate the shadow position
    vec4 shadowPosition = shadowMap_matrix * positionEC;
    shadowPosition /= shadowPosition.w;

    // If the shadow position is outside the [0, 1] range in any dimension, set the fragment color to the texture color and return
    if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0))))
    {
        FragColor = color;
        return;
    }

    // If the distance between the coordinates and the viewpoint is greater than the maximum distance, the shadow effect is discarded
    vec4 lw = czm_inverseView*  vec4(shadowMap_camera_positionEC.xyz, 1.0);
    vec4 vw = czm_inverseView* vec4(positionEC.xyz, 1.0);

    if(distance(lw.xyz,vw.xyz)>view_distance){
        FragColor = color;
        return;
    }

    // Set the shadow parameters
    shadowParameters.texCoords = shadowPosition.xy;
    shadowParameters.depth = shadowPosition.z;
    shadowParameters.nDotL = nDotL;

    // Calculate the shadow visibility
    float visibility = czm_shadowVisibility(shadowMap, shadowParameters);

    // If the visibility is 1.0, mix the color with the visible color
    if(visibility==1.0){
        FragColor = mix(texture(colorTexture, v_textureCoordinates),vec4(viewArea_color,1.0),percentShade);
    }else{
        if(abs(shadowPosition.z-0.0)<0.01){
            FragColor = color;
            return;
        }
        FragColor = mix(texture(colorTexture, v_textureCoordinates),vec4(shadowArea_color,1.0),percentShade);
    }
}`;
const fsShader = fsShaderText.replace('`;', '');
//https://github.com/DigitalArsenal/SensorShadow
const {
	ShadowMap,
	PerspectiveFrustum,
	Camera,
	Color,
	defaultValue,
	PositionProperty,
	ConstantPositionProperty,
	Cartesian2,
	Cartesian3,
	Cartesian4,
	EllipsoidTerrainProvider,
	PostProcessStage,
	Math: CesiumMath
} = Cesium;

const defaultValues = {
	cameraPosition: new ConstantPositionProperty(),
	viewPosition: new ConstantPositionProperty(),
	viewAreaColor: new Color(0, 1, 0),
	shadowAreaColor: new Color(1, 0, 0),
	alpha: 0.5,
	frustum: true,
	size: 4096,
	depthBias: 2e-12
};

/**
 * SensorShadow Class.
 * This class handles the creation, update and management of sensor shadow entities.
 *
 * @property {Object} viewer - A reference to the Cesium viewer instance.
 * @property {ConstantPositionProperty|PositionProperty|Cartesian3} cameraPosition - The camera position.
 * @property {ConstantPositionProperty|PositionProperty|Cartesian3} viewPosition - The view position.
 * @property {Color} viewAreaColor - The color of the visible area of the sensor shadow.
 * @property {Color} shadowAreaColor - The color of the hidden area of the sensor shadow.
 * @property {number} alpha - The alpha value for the sensor shadow.
 * @property {boolean} frustum - Whether the frustum is enabled.
 * @property {number} size - The size of the sensor shadow.
 * @property {function|null} preUpdateListener - A pre-update listener function.
 */
class SensorShadow {
	/**
	 * Constructs a new SensorShadow instance.
	 *
	 * @param {Object} viewer - A reference to the Cesium viewer instance.
	 * @param {Object} options - An optional configuration object.
	 *
	 * @example
	 * let sensorShadow = new SensorShadow(viewer, {
	 *   cameraPosition: new Cartesian3(0, 0, 0),
	 *   viewPosition: new Cartesian3(1, 1, 1),
	 *   viewAreaColor: new Color(0, 1, 0),
	 *   shadowAreaColor: new Color(1, 0, 0),
	 *   alpha: 0.5,
	 *   frustum: true,
	 *   size: 512
	 * });
	 */
	constructor(viewer, options = {}) {
		this.viewer = viewer;

		this.cameraPosition =
			typeof options.cameraPosition.getValue === 'function'
				? options.cameraPosition
				: new ConstantPositionProperty(options.cameraPosition);

		this.viewPosition =
			typeof options.viewPosition.getValue === 'function'
				? options.viewPosition
				: new ConstantPositionProperty(options.viewPosition);

		this.viewAreaColor = defaultValue(options.viewAreaColor, defaultValues.viewAreaColor);

		this.shadowAreaColor = defaultValue(options.shadowAreaColor, defaultValues.shadowAreaColor);

		this.alpha = defaultValue(options.alpha, defaultValues.alpha);
		this.size = defaultValue(options.size, defaultValues.size);
		this.frustum = defaultValue(options.frustum, defaultValues.frustum);
		this.depthBias = defaultValue(options.depthBias, defaultValues.depthBias);

		this.preUpdateListener = null;

		if (this.cameraPosition && this.viewPosition) {
			this._addToScene();
		}
	}

	/**
	 * Get the actual position of the camera.
	 * This method calculates the position vector based on the current time.
	 *
	 * @private
	 * @returns {Cartesian3} The calculated camera position vector.
	 */
	get _getVectors() {
		let positionVector = this.cameraPosition.getValue(this.viewer.clock.currentTime);
		let viewVector = this.viewPosition.getValue(this.viewer.clock.currentTime);
		let distanceBetweenVectors = Number(Cartesian3.distance(viewVector, positionVector).toFixed(1));

		if (distanceBetweenVectors > 10000) {
			let multiple = 1 - 10000 / distanceBetweenVectors;
			positionVector = Cartesian3.lerp(positionVector, viewVector, multiple, new Cartesian3());
		}

		return { positionVector, viewVector };
	}

	/**
	 * Adds the SensorShadow to the scene.
	 *
	 * @private
	 */
	_addToScene() {
		this._createShadowMap();
		this._addPostProcess();
		this.viewer.scene.primitives.add(this);
	}

	/**
	 * Creates the shadow map.
	 *
	 * @private
	 */
	_createShadowMap(updateOnly) {
		let { positionVector, viewVector } = this._getVectors;

		const distance = Number(Cartesian3.distance(viewVector, positionVector).toFixed(1));

		if (distance > 10000) {
			const multiple = 1 - 10000 / distance;
			positionVector = Cartesian3.lerp(positionVector, viewVector, multiple, new Cartesian3());
		}

		const scene = this.viewer.scene;

		const camera = new Camera(scene);

		camera.position = positionVector;

		camera.direction = Cartesian3.subtract(viewVector, positionVector, new Cartesian3(0, 0, 0));

		camera.up = Cartesian3.normalize(positionVector, new Cartesian3(0, 0, 0));

		camera.frustum = new PerspectiveFrustum({
			fov: CesiumMath.toRadians(120),
			aspectRatio: scene.canvas.clientWidth / scene.canvas.clientHeight,
			near: 0.1,
			far: distance
		});

		if (!updateOnly) {
			this.viewShadowMap = new ShadowMap({
				lightCamera: camera,
				enable: true,
				isPointLight: false,
				isSpotLight: true,
				cascadesEnabled: false,
				context: scene.context,
				size: this.size,
				pointLightRadius: distance,
				fromLightSource: false,
				maximumDistance: distance
			});
		} else {
			this.viewShadowMap._lightCamera.position = positionVector;
		}

		this.viewShadowMap.normalOffset = true;
		this.viewShadowMap._terrainBias.depthBias = 0.0;
	}

	/**
	 * Adds post processing to the SensorShadow.
	 *
	 * @private
	 */
	_addPostProcess() {
		const SensorShadow = this;

		const viewShadowMap = this.viewShadowMap;
		const primitiveBias = viewShadowMap._isPointLight
			? viewShadowMap._pointBias
			: viewShadowMap._primitiveBias;
		this.postProcess = this.viewer.scene.postProcessStages.add(
			new PostProcessStage({
				fragmentShader: fsShader,
				uniforms: {
					view_distance: function () {
						return SensorShadow.distance;
					},
					viewArea_color: function () {
						return SensorShadow.viewAreaColor;
					},
					shadowArea_color: function () {
						return SensorShadow.shadowAreaColor;
					},
					percentShade: function () {
						return SensorShadow.alpha;
					},
					shadowMap: function () {
						return viewShadowMap._shadowMapTexture;
					},
					_shadowMap_cascadeSplits: function () {
						return viewShadowMap._cascadeSplits;
					},
					_shadowMap_cascadeMatrices: function () {
						return viewShadowMap._cascadeMatrices;
					},
					_shadowMap_cascadeDistances: function () {
						return viewShadowMap._cascadeDistances;
					},
					shadowMap_matrix: function () {
						return viewShadowMap._shadowMapMatrix;
					},
					shadowMap_camera_positionEC: function () {
						return viewShadowMap._lightPositionEC;
					},
					shadowMap_camera_directionEC: function () {
						return viewShadowMap._lightDirectionEC;
					},
					cameraPosition_WC: function () {
						return SensorShadow.viewer.camera.positionWC;
					},
					viewPosition_WC: function () {
						return SensorShadow.viewPosition.getValue(SensorShadow.viewer.clock.currentTime);
					},
					shadowMap_camera_up: function () {
						return viewShadowMap._lightCamera.up;
					},
					shadowMap_camera_dir: function () {
						return viewShadowMap._lightCamera.direction;
					},
					shadowMap_camera_right: function () {
						return viewShadowMap._lightCamera.right;
					},
					ellipsoidInverseRadii: function () {
						let radii = SensorShadow.viewer.scene.globe.ellipsoid.radii;
						return new Cartesian3(1 / radii.x, 1 / radii.y, 1 / radii.z);
					},
					shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: function () {
						var viewShed2D = new Cartesian2();
						viewShed2D.x = 1 / viewShadowMap._textureSize.x;
						viewShed2D.y = 1 / viewShadowMap._textureSize.y;

						return Cartesian4.fromElements(
							viewShed2D.x,
							viewShed2D.y,
							this.depthBias,
							primitiveBias.normalShadingSmooth,
							this.combinedUniforms1
						);
					},
					shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: function () {
						return Cartesian4.fromElements(
							primitiveBias.normalOffsetScale,
							viewShadowMap._distance,
							viewShadowMap.maximumDistance,
							viewShadowMap._darkness,
							this.combinedUniforms2
						);
					},
					exclude_terrain: function () {
						return SensorShadow.viewer.terrainProvider instanceof EllipsoidTerrainProvider;
					}
				}
			})
		);

		// If a previous listener was added, remove it
		if (this.preUpdateListener) {
			viewer.scene.preUpdate.removeEventListener(this.preUpdateListener);
		}

		// Add a new listener
		this.preUpdateListener = () => {
			if (!this.viewShadowMap._shadowMapTexture) {
				this.postProcess.enabled = false;
			} else {
				this.postProcess.enabled = true;
			}
		};

		viewer.scene.preUpdate.addEventListener(this.preUpdateListener);
	}

	update(frameState) {
		this._createShadowMap(true);
		frameState.shadowMaps.push(this.viewShadowMap);
	}

	destroy() {
		if (this.preUpdateListener) {
			viewer.scene.preUpdate.removeEventListener(this.preUpdateListener);
		}
		this.viewer.scene.postProcessStages.remove(this.postProcess);
		for (let property in this) {
			if (this.hasOwnProperty(property)) {
				delete this[property];
			}
		}
	}

	get size() {
		return this._size;
	}

	set size(v) {
		this._size = v;
	}

	get depthBias() {
		return this._depthBias;
	}

	set depthBias(v) {
		this._depthBias = v;
	}

	get cameraPosition() {
		return this._cameraPosition;
	}

	set cameraPosition(v) {
		this._cameraPosition = v;
	}

	get viewPosition() {
		return this._viewPosition;
	}

	set viewPosition(v) {
		this._viewPosition = v;
	}

	get frustum() {
		return this._frustum;
	}

	set frustum(v) {
		this._frustum = v;
	}

	get distance() {
		return this._distance;
	}

	set distance(v) {
		this._distance = v;
	}

	get viewAreaColor() {
		return this._viewAreaColor;
	}

	set viewAreaColor(v) {
		this._viewAreaColor = v;
	}

	get shadowAreaColor() {
		return this._shadowAreaColor;
	}

	set shadowAreaColor(v) {
		this._shadowAreaColor = v;
	}

	get alpha() {
		return this._alpha;
	}

	set alpha(v) {
		this._alpha = v;
	}
}

let pointA = Cesium.Cartesian3.fromDegrees(35.198213, 33.264289, 250); // Central Park

let pointB = Cesium.Cartesian3.fromDegrees(35.200014, 33.268811, 40); // Empire State Building

let viewer;
Promise.all([
	fetchWmtsTileTemplate(RASTER_PRODUCT_ID, RASTER_PRODUCT_TYPE, LAYER_IMAGE_FORMAT),
	fetchServiceLink('3d', DEM_TERRAIN_PRODUCT_ID, DEM_TERRAIN_PRODUCT_TYPE, DEM_TERRAIN_SCHEME),
	fetchServiceLink('3d', MODEL_3D_PRODUCT_ID, MODEL_3D_PRODUCT_TYPE, MODEL_3D_SCHEME)
]).then(async ([raster, dem, model]) => {
	const demResource = new Cesium.Resource({
		url: dem.url,
		queryParameters: { token: TOKEN }
	});
	const modelResource = new Cesium.Resource({
		url: model.url,
		queryParameters: { token: TOKEN }
	});

	const [terrainProvider, tileset] = await Promise.all([
		Cesium.CesiumTerrainProvider.fromUrl(demResource),
		Cesium.Cesium3DTileset.fromUrl(modelResource, {
			maximumScreenSpaceError: 5,
			cullRequestsWhileMovingMultiplier: 120,
			preloadFlightDestination: true,
			preferLeaves: true,
			skipLevelOfDetail: true
		})
	]);

	viewer = new Cesium.Viewer('cesiumContainer', {
		baseLayer: new Cesium.ImageryLayer(
			new Cesium.WebMapTileServiceImageryProvider({
				url: new Cesium.Resource({
					url: raster.template,
					queryParameters: {
						token: TOKEN
					}
				}),
				layer: raster.name,
				style: 'default',
				format: LAYER_IMAGE_FORMAT,
				tileMatrixSetID: 'WorldCRS84',
				tilingScheme: new Cesium.GeographicTilingScheme()
			})
		),
		terrainProvider
	});

	viewer.scene.primitives.add(tileset);

	viewer.camera.flyTo({
		destination: pointA,
		orientation: {
			heading: Cesium.Math.toRadians(25.0),
			pitch: Cesium.Math.toRadians(-10.0),
			roll: 0.0
		}
	});
	viewer.camera.moveEnd.addEventListener(function () {
		const { camera } = viewer;
		if (camera.position?.clone) {
			const cameraState = {
				position: camera.position.clone(),
				direction: camera.direction.clone(),
				up: camera.up.clone()
			};
		}
	});

	viewer.clock.shouldAnimate = false;
	//return;
	const redBall = viewer.entities.add({
		position: pointA,
		point: {
			pixelSize: 10,
			color: Cesium.Color.RED
		}
	});

	//return;
	const blueBall = viewer.entities.add({
		position: pointB,
		point: {
			pixelSize: 10,
			color: Cesium.Color.BLUE
		}
	});

	//@ts-ignore
	var sensorShadowInstance = new SensorShadow(viewer, {
		cameraPosition: redBall.position,
		viewPosition: pointB
	});

	let handler;
	let pickedEntity;
	let cartesian;
	handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
	handler.setInputAction((click) => {
		cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
		if (cartesian) {
			var pickedObject = viewer.scene.pick(click.position);
			if (Cesium.defined(pickedObject) && pickedObject.id === redBall) {
				pickedEntity = pickedObject.id;
				viewer.scene.screenSpaceCameraController.enableInputs = false;
			}
		}
	}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

	handler.setInputAction((movement) => {
		if (pickedEntity) {
			let newCartesian = viewer.camera.pickEllipsoid(
				movement.endPosition,
				viewer.scene.globe.ellipsoid
			);
			if (newCartesian) {
				// Convert the picked Cartesian3 to Cartographic
				let newCartographic = Cesium.Cartographic.fromCartesian(newCartesian);

				// Get the original height
				let originalCartographic = Cesium.Cartographic.fromCartesian(
					pickedEntity.position.getValue(Cesium.JulianDate.now())
				);

				// Update the height to the original one
				newCartographic.height = originalCartographic.height;

				// Convert the updated Cartographic back to Cartesian3
				let updatedCartesian = Cesium.Cartographic.toCartesian(newCartographic);

				// Set the new position
				pickedEntity.position = new Cesium.ConstantPositionProperty(updatedCartesian);
				sensorShadowInstance.cameraPosition = pickedEntity.position;
			}
		}
	}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

	handler.setInputAction(() => {
		if (pickedEntity) {
			pickedEntity = undefined;
			viewer.scene.screenSpaceCameraController.enableInputs = true;
		}
	}, Cesium.ScreenSpaceEventType.LEFT_UP);
});
