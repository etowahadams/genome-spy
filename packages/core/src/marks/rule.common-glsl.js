const COMMON_SHADER = `
layout(std140) uniform Mark {
    /** Minimum rule length in pixels */
    uniform mediump float uMinLength;

    uniform mediump float uDashTextureSize;
    uniform lowp int uStrokeCap;
    uniform mediump float uStrokeDashOffset;

#pragma markUniforms
};

`;
export default COMMON_SHADER;
