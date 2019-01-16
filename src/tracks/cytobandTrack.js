import * as d3 from "d3";
import { Matrix4 } from 'math.gl';
import {
	Program, assembleShaders, setParameters, createGLContext, resizeGLContext 
} from 'luma.gl';
import VERTEX_SHADER from '../gl/rectangleVertex.glsl';
import FRAGMENT_SHADER from '../gl/rectangleFragment.glsl';
import segmentsToVertices from '../gl/segmentsToVertices';
import Interval from "../utils/interval";
import WebGlTrack from "./webGlTrack";


const giemsaScale = d3.scaleOrdinal()
	.domain([
		"gneg", "gpos25", "gpos50", "gpos75", "gpos100", "acen", "stalk", "gvar"
	]).range([
		"#f0f0f0", "#e0e0e0", "#d0d0d0", "#c0c0c0", "#a0a0a0", "#cc4444", "#338833", "#000000"
	].map(str => ({
		background: d3.color(str),
		foreground: d3.color(d3.hsl(str).l < 0.5 ? "#ddd" : "black")
	})));


const defaultConfig = {
	fontSize: 11,
	fontFamily: "sans-serif",

	labelMargin: 3
};  

function mapUcscCytobands(chromMapper, cytobands) {
    return cytobands.map(band => ({
        interval: chromMapper.segmentToContinuous(
			band.chrom, band.chromStart, band.chromEnd),
		name: band.name,
		chrom: band.chrom,
        gieStain: band.gieStain
    }));
}

function computePaddings(band) {
	if (band.gieStain == "acen") {
		if (band.name.startsWith("p")) {
			return { paddingTopRight: 0.5, paddingBottomRight: 0.5 };

		} else if (band.name.startsWith("q")) {
			return { paddingTopLeft: 0.5, paddingBottomLeft: 0.5 };

		}
	}
	return {};
}

/**
 * A track that displays cytobands
 */
export default class CytobandTrack extends WebGlTrack {
    constructor() {
		super();

		this.config = defaultConfig;
    }

    initialize({genomeSpy, trackContainer}) {
		super.initialize({genomeSpy, trackContainer});

        // TODO: Check cytobands' presence in Genome

        this.mappedCytobands = mapUcscCytobands(genomeSpy.chromMapper, genomeSpy.genome.cytobands);

		this.trackContainer.className = "cytoband-track";
        this.trackContainer.style = "height: 21px";

        this.glCanvas = this.createCanvas();
        const gl = createGLContext({ canvas: this.glCanvas });
        this.gl = gl;

        setParameters(gl, {
            clearColor: [1, 1, 1, 1],
            clearDepth: [1],
            depthTest: false,
            depthFunc: gl.LEQUAL
		});

        this.bandProgram = new Program(gl, assembleShaders(gl, {
            vs: VERTEX_SHADER,
            fs: FRAGMENT_SHADER,
            modules: ['fp64']
        }));

		this.bandVertices = segmentsToVertices(
			this.bandProgram,
			this.mappedCytobands.map(band => Object.assign(
				{
					interval: band.interval,
					color: giemsaScale(band.gieStain).background
				},
				computePaddings(band)
			))
		);


		// TODO: Create textures for labels and render everything with WebGL
		this.bandLabelCanvas = this.createCanvas();

		const ctx = this.bandLabelCanvas.getContext("2d");
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        this._bandLabelWidths = this.mappedCytobands.map(band => ctx.measureText(band.name).width);


        genomeSpy.on("zoom", () => {
			this.render();
		});

        genomeSpy.on("layout", layout => {
			this.resizeCanvases(layout);
			this.render();
		});

        genomeSpy.zoom.attachZoomEvents(this.bandLabelCanvas);
    }

    resizeCanvases(layout) {
        this.adjustCanvas(this.bandLabelCanvas, layout.viewport);
        this.adjustCanvas(this.glCanvas, layout.viewport);

        resizeGLContext(this.gl, { useDevicePixels: false });
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		// TODO: Maybe could be provided by some sort of abstraction
        this.projection = Object.freeze(new Matrix4().ortho({
            left: 0,
            right: this.gl.drawingBufferWidth,
            bottom: this.gl.drawingBufferHeight,
            top: 0,
            near: 0,
            far: 500
        }));
	}

	
	render() {
		this.renderBands();
		this.renderLabels();
		this.renderChromosomeBoundaries();
	}
	
	renderBands() {
        const gl = this.gl;

        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clear(gl.COLOR_BUFFER_BIT);

		const view = new Matrix4()
			//.translate([0, 0, 0])
			.scale([
				gl.drawingBufferWidth,
				gl.drawingBufferHeight,
				1
			]);

		// TODO: Move to base class / abstraction
		const uniforms = Object.assign(
			{
				uTMatrix: this.projection.clone().multiplyRight(view),
			},
			this.getDomainUniforms()
		);

        this.bandProgram.draw(Object.assign(
            {
                uniforms: Object.assign({ ONE: 1.0 }, uniforms) // WTF: https://github.com/uber/luma.gl/pull/622
            },
            this.bandVertices
        ));
	}

	renderLabels() {
		const scale = this.genomeSpy.getZoomedScale();
		const viewportInterval = Interval.fromArray(scale.range()); // TODO: Provide this from somewhere
		const ctx = this.bandLabelCanvas.getContext("2d");
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
        ctx.clearRect(0, 0, this.bandLabelCanvas.width, this.bandLabelCanvas.height);
		const y = this.bandLabelCanvas.height / 2;

		// TODO: For each band, precompute the maximum domain width that yields bandwidth ...
		// ... that accommodates the label. That would avoid scaling intervals of all bands.

		this.mappedCytobands.forEach((band, i) => {
			const scaledInt = band.interval.transform(scale);
			const labelWidth = this._bandLabelWidths[i];

			if (scaledInt.connectedWith(viewportInterval) &&
				scaledInt.width() > labelWidth + this.config.labelMargin * 2)
			{
				let x = scaledInt.centre();
				ctx.fillStyle = giemsaScale(band.gieStain).foreground;

				const threshold = labelWidth / 2 + this.config.labelMargin;

				if (x < viewportInterval.lower + threshold) {
					// leftmost
					x = Math.max(x, viewportInterval.lower + threshold);
					x = Math.min(x, scaledInt.upper - threshold);

				} else if (x > viewportInterval.upper - threshold) {
					// rightmost
					x = Math.min(x, viewportInterval.upper - threshold);
					x = Math.max(x, scaledInt.lower + threshold);
				}

				ctx.fillText(band.name, x, y);
			}
		});

	}

	renderChromosomeBoundaries() {
		const scale = this.genomeSpy.getZoomedScale();

		const ctx = this.bandLabelCanvas.getContext("2d");
		ctx.strokeStyle = "#909090";
		ctx.setLineDash([3, 3]);

        // TODO: Consider moving to Track base class
        const visibleDomain = Interval.fromArray(scale.domain());

        this.genomeSpy.chromMapper.chromosomes().forEach((chrom, i) => {
			if (i > 0 && visibleDomain.contains(chrom.continuousInterval.lower)) {
				const x = scale(chrom.continuousInterval.lower);
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, this.bandLabelCanvas.height);
				ctx.stroke();
			}
		});
	}


	/**
	 * Find a range of cytobands using the search string as a prefix
	 */
	search(string) {
		const f = /^[0-9]+$/.test(string) ?
			d => d.chrom.substring(3) == string :
			d => (d.chrom.substring(3) + d.name).startsWith(string);

		const bands = this.mappedCytobands.filter(f);

		if (bands.length > 0) {
			return new Interval(
				Math.min.apply(null, bands.map(b => b.interval.centre() - (b.interval.width()) / 2)),
				Math.max.apply(null, bands.map(b => b.interval.centre() + (b.interval.width()) / 2))
			);
		}
	}

	searchHelp() {
		return `<p>Zoom in to a cytoband, arm or chromosome. Examples:</p>
			<ul>
				<li>8p11.23</li>
				<li>8p11</li>
				<li>8p</li>
				<li>8</li>
			</ul>`;
	}

}


