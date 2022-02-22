import Attribute from './Attribute.js';

export default class Material {

    /**
     * The parent MiniGL controller.
     *
     * @type {MiniGL}
     * @private
     */
    gl;

    uniformInstances = [];

    /**
     *
     * @param {MiniGL} minigl
     * @param {object} properties
     */
    constructor(minigl, vertexShaders, fragments, uniforms = {}, properties = {}) {

        // Add additional properties.
        Object.assign(this, properties);

        // Set required properties.
        this.gl = minigl;
        this.uniforms = uniforms;

        const context = this.gl.getContext();

        const prefix = `
            precision highp float;
        `;

        this.vertexSource = `
            ${prefix}
            attribute vec4 position;
            attribute vec2 uv;
            attribute vec2 uvNorm;
            ${this._getUniformVariableDeclarations(this.gl.commonUniforms,"vertex")}
            ${this._getUniformVariableDeclarations(uniforms,"vertex")}
            ${vertexShaders}
        `;

        this.Source = `
            ${prefix}
            ${this._getUniformVariableDeclarations(this.gl.commonUniforms,"fragment")}
            ${this._getUniformVariableDeclarations(uniforms,"fragment")}
            ${fragments}
        `;

        this.vertexShader = this._getShaderByType(context.VERTEX_SHADER, this.vertexSource);
        this.fragmentShader = this._getShaderByType(context.FRAGMENT_SHADER, this.Source);
        this.program = context.createProgram();

        context.attachShader(this.program, this.vertexShader);
        context.attachShader(this.program, this.fragmentShader);
        context.linkProgram(this.program);
        context.getProgramParameter(this.program, context.LINK_STATUS) || console.error(context.getProgramInfoLog(this.program));
        context.useProgram(this.program);

        this.attachUniforms(void 0, this.gl.commonUniforms);
        this.attachUniforms(void 0, this.uniforms);

    }

    _getShaderByType(type, source) {
        const context = this.gl.getContext();
        const shader = context.createShader(type);
        context.shaderSource(shader, source);
        context.compileShader(shader);

        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            console.error(context.getShaderInfoLog(shader));
        }

        return shader;
    }

    _getUniformVariableDeclarations(uniforms, type) {
        return Object.entries(uniforms).map(([uniform, value]) => {
            return value.getDeclaration(uniform, type);
        }).join("\n");
    }

    attachUniforms(name, uniforms) {
        if (!name) {
            Object.entries(uniforms).forEach(([name, uniform]) => {
                this.attachUniforms(name, uniform);
            });
        } else if (uniforms.type === 'array') {
            uniforms.value.forEach((uniform, i) => {
                this.attachUniforms(`${name}[${i}]`, uniform);
            });
        } else if (uniforms.type === 'struct') {
            Object.entries(uniforms.value).forEach(([uniform, i]) => {
                this.attachUniforms(`${name}.${uniform}`, i);
            });
        } else {
            this.uniformInstances.push({
                uniform: uniforms,
                location: this.gl.getContext().getUniformLocation(this.program, name)
            });
        }
    }

}
