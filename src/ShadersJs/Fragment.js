export default `varying vec3 v_color;

void main() {
    vec3 color = v_color;
    if (u_darken_top == 1.0) {
        vec2 st = gl_FragCoord.xy/resolution.xy;
        color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
    }
    gl_FragColor = vec4(color, 1.0);
}
`;
