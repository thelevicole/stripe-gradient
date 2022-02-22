import MiniGL from './MiniGL.js';
import Blend from './ShadersJs/Blend.js';
import Fragment from './ShadersJs/Fragment.js';
import Noise from './ShadersJs/Noise.js';
import Vertex from './ShadersJs/Vertex.js';
import Uniform from './Uniform.js';
import Material from './Material.js';
import Mesh from './Mesh.js';
import PlaneGeometry from './PlaneGeometry.js';

class Gradient {

    /**
     * Class reference used primarily for static properties.
     *
     * @type {Gradient}
     */
    _class = Gradient;

    /**
     * Default options used if user doesn't provide a value.
     *
     * @type {object}
     */
    static defaultOptions = {
        canvas: null,
        colors: ['#f00', '#0f0', '#00f'],
        wireframe: false,
        density: [.06, .16],

        angle: 0,
        amplitude: 320,
        static: false, // Enable non-animating gradient

        loadedClass: 'is-loaded',

        zoom: 1, // @todo not used.
        speed: 5, // @todo not used.
        rotation: 0, // @todo not used.
    };

    vertexShader = null;
    uniforms = null;
    time = 1253106; // @todo work out why this number has been choosen.
    mesh = null;
    material = null;
    geometry = null;

    // @todo tidy up these properties
    scrollingTimeout = null;
    scrollingRefreshDelay = 200;
    scrollObserver = null;
    width = null;
    minWidth = 1111;
    height = 600;
    xSegCount = null;
    ySegCount = null;
    freqX = 0.00014;
    freqY = 0.00029;
    freqDelta = 0.00001;
    activeColors = [1, 1, 1, 1];

    /**
     * @type {{fragment: string, vertex: string, blend: string, noise: string}}
     */
    shaderFiles = {
        vertex: Vertex,
        noise: Noise,
        blend: Blend,
        fragment: Fragment
    };

    /**
     * User defined options
     *
     * @type {object}
     */
    options = {};

    /**
     * Store arbitrary flags consisting of mainly boolean values but in some cases can be any data type.
     * @type {object}
     * @private
     */
    _flags = {
        playing: true // autoplay on init
    };

    /**
     * Cached canvas element.
     *
     * @type {HTMLCanvasElement|null}
     * @private
     */
    _canvas;

    /**
     * @type {WebGLRenderingContext|null}
     * @private
     */
    _context;

    /**
     * Cached MiniGL instance.
     *
     * @type {MiniGL}
     * @private
     */
    _minigl;

    /**
     * @param {object} options
     */
    constructor(options) {
        this.options = options;

        // Find and store the canvas element.
        this.setCanvas(this.findCanvas(this.getOption('canvas')));

        // Bail if no canvas element.
        if (!this.getCanvas()) {
            throw 'Missing Canvas. Pass the canvas to the Gradient constructor.';
        }

        // Initiate the MiniGL controller.
        this._minigl = new MiniGL(this.getCanvas(), this.getCanvas().offsetWidth, this.getCanvas().offsetHeight);

        // Initiate the canvas gradient.
        this.init();
    }

    /**
     * Get a user or default option.
     *
     * @param {string} name
     * @param defaultValue
     * @returns {*}
     */
    getOption(name, defaultValue = undefined) {
        if (defaultValue === undefined && name in this._class.defaultOptions) {
            defaultValue = this._class.defaultOptions[name];
        }

        return name in this.options ? this.options[name] : defaultValue;
    }

    /**
     * Get the canvas element and cache as private property.
     *
     * @param {string|HTMLCanvasElement} selector
     * @returns {HTMLCanvasElement|null}
     */
    findCanvas(selector) {
        const canvas = typeof selector === 'string' ? document.querySelector(selector) : selector;

        if (canvas instanceof HTMLCanvasElement) {
            return canvas;
        }

        return null;
    }

    /**
     * Sets the `_canvas` and `_context` properties.
     *
     * @param {HTMLCanvasElement} canvas
     */
    setCanvas(canvas) {
        if (canvas) {
            this._canvas = canvas;
            this._context = canvas.getContext('webgl', {
                antialias: true
            });
        } else {
            this._canvas = null;
            this._context = null;
        }
    }

    /**
     * @return {HTMLCanvasElement}
     */
    getCanvas() {
        return this._canvas;
    }

    /**
     * @return {WebGLRenderingContext}
     */
    getContext() {
        return this._context;
    }

    /**
     * @param {string} name
     * @param {*} value
     * @return {*}
     */
    setFlag(name, value) {
        return this._flags[name] = value;
    }

    /**
     * @param {string} name
     * @param defaultValue
     * @return {boolean|undefined}
     */
    getFlag(name, defaultValue = undefined) {
        return this._flags[name] || defaultValue;
    }

    handleScroll() {
        clearTimeout(this.scrollingTimeout);
        this.scrollingTimeout = setTimeout(this.handleScrollEnd, this.scrollingRefreshDelay);

        if (this.getFlag('playing')) {
            this.setFlag('isScrolling', true);
            this.pause();
        }
    }

    handleScrollEnd() {
        this.setFlag('isScrolling', false);

        if (this.getFlag('isIntersecting')) {
            this.play();
        }
    }

    /**
     * @todo Update resize method to use canvas size not window.
     */
    resize() {
        const [ densityX, densityY ] = this.getOption('density');
        this.width = window.innerWidth;
        this._minigl.setSize(this.width, this.height);
        this._minigl.setOrthographicCamera();
        this.xSegCount = Math.ceil(this.width * densityX);
        this.ySegCount = Math.ceil(this.height * densityY);
        this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
        this.mesh.geometry.setSize(this.width, this.height);
        this.mesh.material.uniforms.u_shadow_power.value = this.width < 600 ? 5 : 6;
    }

    animate(event = 0) {
        const shouldSkipFrame = !!window.document.hidden || (!this.getFlag('playing') || parseInt(event, 10) % 2 === 0);
        let lastFrame = this.getFlag('lastFrame', 0);

        if (!shouldSkipFrame) {
            this.time += Math.min(event - lastFrame, 1000 / 15);
            lastFrame = this.setFlag('lastFrame', event);
            this.mesh.material.uniforms.u_time.value = this.time;
            this._minigl.render();
        }

        // @todo support static gradient.
        if (lastFrame !== 0 && this.getOption('static')) {
            this._minigl.render();
            return this.disconnect();
        }

        if (/*this.getFlag('isIntersecting') && */this.getFlag('playing')) {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    /**
     * Pause the animation.
     */
    pause() {
        this.setFlag('playing', false);
    }

    /**
     * Start or continue the animation.
     */
    play() {
        requestAnimationFrame(this.animate.bind(this));
        this.setFlag('playing', true);
    }

    disconnect() {
        if (this.scrollObserver) {
            window.removeEventListener("scroll", this.handleScroll);
            this.scrollObserver.disconnect();
        }

        window.removeEventListener("resize", this.resize);
    }

    initMaterial() {

        /**
         * @type {array[]}
         */
        const colors = this.getOption('colors').map(hex => {

            // Check if shorthand hex value was used and double the length so the conversion in normalizeColor will work.
            if (hex.length === 4) {
                const hexTemp = hex.substr(1).split('').map(hexTemp => hexTemp + hexTemp).join('');
                hex = `#${hexTemp}`
            }

            return hex && `0x${hex.substr(1)}`;
        }).filter(Boolean).map(this.normalizeColor);

        this.uniforms = {
            u_time: new Uniform(this._minigl, 'float',0),
            u_shadow_power: new Uniform(this._minigl, 'float', 10),
            u_darken_top: new Uniform(this._minigl, 'float', this.getCanvas().dataset.jsDarkenTop ? 1 : 0),
            u_active_colors: new Uniform(this._minigl, 'vec4', this.activeColors),

            u_global: new Uniform(this._minigl, 'struct', {
                noiseFreq: new Uniform(this._minigl, 'vec2', [this.freqX, this.freqY]),
                noiseSpeed: new Uniform(this._minigl, 'float',0.000005)
            }),

            u_vertDeform: new Uniform(this._minigl, 'struct', {
                incline: new Uniform(this._minigl, 'float', Math.sin(this.getOption('angle')) / Math.cos(this.getOption('angle'))),
                offsetTop: new Uniform(this._minigl, 'float', -0.5),
                offsetBottom: new Uniform(this._minigl, 'float', -0.5),
                noiseFreq: new Uniform(this._minigl, 'vec2', [3, 4]),
                noiseAmp: new Uniform(this._minigl, 'float', this.getOption('amplitude')),
                noiseSpeed: new Uniform(this._minigl, 'float', 10),
                noiseFlow: new Uniform(this._minigl, 'float', 3),
                noiseSeed: new Uniform(this._minigl, 'float', this.seed)
            }, {
                excludeFrom: 'fragment'
            }),

            u_baseColor: new Uniform(this._minigl, 'vec3', colors[0], {
                excludeFrom: 'fragment'
            }),

            u_waveLayers: new Uniform(this._minigl, 'array', [], {
                excludeFrom: 'fragment'
            })
        };

        for (let e = 1; e < colors.length; e += 1) {
            const waveLayerUniform = new Uniform(this._minigl, 'struct', {
                color: new Uniform(this._minigl, 'vec3', colors[e]),
                noiseFreq: new Uniform(this._minigl, 'vec2', [2 + e / colors.length, 3 + e / colors.length]),
                noiseSpeed: new Uniform(this._minigl, 'float', 11 + 0.3 * e),
                noiseFlow: new Uniform(this._minigl, 'float', 6.5 + 0.3 * e),
                noiseSeed: new Uniform(this._minigl, 'float', this.seed + 10 * e),
                noiseFloor: new Uniform(this._minigl, 'float', 0.1),
                noiseCeil: new Uniform(this._minigl, 'float', 0.63 + 0.07 * e)
            });

            this.uniforms.u_waveLayers.value.push(waveLayerUniform);
        }
        this.vertexShader = [
            this.shaderFiles.noise,
            this.shaderFiles.blend,
            this.shaderFiles.vertex
        ].join("\n\n");

        return new Material(this._minigl, this.vertexShader, this.shaderFiles.fragment, this.uniforms);
    }

    initMesh() {
        this.material = this.initMaterial();
        this.geometry = new PlaneGeometry(this._minigl);

        this.mesh = new Mesh(this._minigl, this.geometry, this.material);
        this.mesh.wireframe = this.getOption('wireframe');
    }

    updateFrequency(e) {
        this.freqX += e;
        this.freqY += e;
    }

    toggleColor(index) {
        this.activeColors[index] = this.activeColors[index] === 0 ? 1 : 0;
    }

    init() {

        // Add loaded class.
        const loadedClass = this.getOption('loadedClass');
        if (loadedClass) {
            this.getCanvas().classList.add(loadedClass);
        }

        // @todo add scroll observer.
        //
        // this.scrollObserver = await s.create(.1, false),
        // this.scrollObserver.observe(this.getCanvas());
        //
        // this.scrollObserver.onSeparate(() => {
        //     window.removeEventListener("scroll", this.handleScroll);
        //
        //     this.setFlag('isIntersecting', false);
        //
        //     if (this.getFlag('playing')) {
        //         this.pause();
        //     }
        // });
        //
        // this.scrollObserver.onIntersect(() => {
        //     window.addEventListener("scroll", this.handleScroll);
        //
        //     this.setFlag('isIntersecting', true);
        //
        //     this.addIsLoadedClass();
        //     this.play();
        // });

        this.initMesh();
        this.resize();
        requestAnimationFrame(this.animate.bind(this));
        window.addEventListener('resize', this.resize);
    }

    /**
     * @param {string} hexCode
     * @return {number[]}
     */
    normalizeColor(hexCode) {
        return [
            (hexCode >> 16 & 255) / 255,
            (hexCode >> 8 & 255) / 255,
            (255 & hexCode) / 255
        ];
    }

}

window.Gradient = Gradient;

if (window.jQuery) {
    jQuery.fn.gradient = function(options = {}) {
        options.canvas = this.get(0);
        this._gradient = new Gradient(options);
        return this;
    };
}
