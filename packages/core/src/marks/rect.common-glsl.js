const COMMON_SHADER = `
layout(std140) uniform Mark {
    /** Minimum size (width, height) of the displayed rectangle in pixels */
    uniform float uMinWidth;
    uniform float uMinHeight;

    /** Minimum opacity for the size clamping */
    uniform float uMinOpacity;

    uniform float uCornerRadiusTopRight;
    uniform float uCornerRadiusBottomRight;
    uniform float uCornerRadiusTopLeft;
    uniform float uCornerRadiusBottomLeft;

#pragma markUniforms
};

`;
export default COMMON_SHADER;
