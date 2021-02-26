import Heapify from "heapify";
import { field } from "../../utils/field";
import FlowNode from "../flowNode";

const maxDepth = 65536;

/**
 * @typedef {import("../../spec/transform").CoverageParams} CoverageParams
 */

/**
 * Computes coverage for sorted segments
 *
 * TODO: Binned coverage
 */
export default class CoverageTransform extends FlowNode {
    get behavior() {
        return 0;
    }

    /**
     * @param {CoverageParams} params
     */
    constructor(params) {
        super();
        this.params = params;
    }

    reset() {
        super.reset();
        this.initialize();
    }

    initialize() {
        const params = this.params;

        const asCoverage = params.as || "coverage";
        const asStart = params.asStart || params.start;
        const asEnd = params.asEnd || params.end;
        const asChrom = params.asChrom || params.chrom;

        const startAccessor = field(params.start);
        const endAccessor = field(params.end);

        /** @type {function(any):string} */
        const chromAccessor = params.chrom
            ? field(params.chrom)
            : d => undefined;
        /** @type {function(any):number} */
        const weightAccessor = params.weight ? field(params.weight) : d => 1;

        /** @type {Record<string, number|string>} used for merging adjacent segment */
        let bufferedSegment;

        /** @type {string} */
        let prevChrom;

        /** @type {string} */
        let chrom;

        // TODO: Whattabout cumulative error when float weights are used?
        // Howabout https://github.com/d3/d3-array#fsum ?
        let coverage = 0;

        /** @type {number} */
        let prevEdge;

        // End pos as priority, weight as value
        const ends = new Heapify(maxDepth, [], [], Float32Array, Float64Array);

        const segmentProps = [
            [asStart, "start"],
            [asEnd, "end"],
            [asCoverage, "coverage"]
        ];
        if (asChrom) {
            segmentProps.push([asChrom, "chrom"]);
        }

        // eslint-disable-next-line no-new-func
        const createSegment = /** @type {function} */ (new Function(
            "start",
            "end",
            "coverage",
            "chrom",
            "return {" +
                segmentProps
                    .map(([prop, param]) => `${JSON.stringify(prop)}: ${param}`)
                    .join(", ") +
                "};"
        ));

        /**
         * @param {number} start
         * @param {number} end
         * @param {number} coverage
         */
        const pushSegment = (start, end, coverage) => {
            if (start == end) {
                return;
            }

            let extended = false;
            if (bufferedSegment) {
                if (bufferedSegment[asCoverage] === coverage) {
                    // Extend it
                    bufferedSegment[asEnd] = end;
                    extended = true;
                } else if (bufferedSegment[asCoverage] != 0) {
                    this._propagate(bufferedSegment);
                }
            }

            if (!extended) {
                bufferedSegment = createSegment(start, end, coverage, chrom);
            }
        };

        const flushQueue = () => {
            // Flush queue
            while (ends.size) {
                const edge = ends.peekPriority();
                pushSegment(prevEdge, edge, coverage);
                prevEdge = edge;
                coverage -= ends.pop();
            }
            prevEdge = undefined;

            if (bufferedSegment) {
                this._propagate(bufferedSegment);
                bufferedSegment = undefined;
            }
        };

        /** @param {Record<string, any>} datum */
        this.handle = datum => {
            while (ends.size && ends.peekPriority() < startAccessor(datum)) {
                const edge = ends.peekPriority();
                pushSegment(prevEdge, edge, coverage);
                prevEdge = edge;
                coverage -= ends.pop();
            }

            if (asChrom) {
                let newChrom = chromAccessor(datum);
                if (newChrom !== prevChrom) {
                    flushQueue();
                    chrom = newChrom;
                    prevChrom = chrom;
                }
            }

            const edge = startAccessor(datum);
            if (prevEdge !== undefined) {
                pushSegment(prevEdge, edge, coverage);
            }
            prevEdge = edge;

            const weight = weightAccessor(datum);
            coverage += weight;

            ends.push(weight, endAccessor(datum));
        };

        this.complete = () => {
            flushQueue();
            super.complete();
        };
    }
}
