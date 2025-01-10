const FRAGMENT_SHADER = `
in vec4 vColor;
in float vSize;
in float vNormalLengthInPixels;
in float vGamma;

out lowp vec4 fragColor;

void main(void) {
    float dpr = uDevicePixelRatio;

    float distance = abs(vNormalLengthInPixels);
    float opacity = clamp(((vSize / 2.0 - distance) * dpr), 0.0, 1.0);

    opacity = pow(opacity, vGamma);

    fragColor = vColor * opacity;

    if (uPickingEnabled) {
        fragColor = vPickingColor;
    }
}

`;
export default FRAGMENT_SHADER;
