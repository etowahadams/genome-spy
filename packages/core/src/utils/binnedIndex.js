import clamp from "./clamp";

const MAX_INTEGER = 2 ** 31 - 1;
const MIN_INTEGER = -(2 ** 31);

/**
 * @callback Lookup
 * @param {number} start
 * @param {number} end
 * @param {[number, number]} [arr] Store the result into this array (and return it)
 * @returns {[number, number]}
 */

/**
 * A binned index for (overlapping) ranges that are sorted by their start position.
 * Each indexed range is associated with respective vertex indices.
 *
 * @param {number} size Number of bins
 * @param {[number, number]} domain Domain of positions
 * @param {(datum: T) => number} accessor Accessor for range's start position
 * @param {(datum: T) => number} [accessor2] Accessor for range's end position
 * @template T
 */
export function createBinningRangeIndexer(
    size,
    domain,
    accessor,
    accessor2 = accessor
) {
    const startIndices = new Int32Array(size);
    startIndices.fill(MAX_INTEGER);

    let lastIndex = MIN_INTEGER;
    let unordered = false;

    const endIndices = new Int32Array(size);

    const start = domain[0];
    const domainLength = domain[1] - domain[0];
    const divisor = domainLength / size;

    /**
     * @param {number} pos
     * @param {boolean} end
     */
    const getBin = (pos, end) => {
        const unfloored = (pos - start) / divisor;
        const floored = Math.floor(unfloored);

        // Special handling for the end coordinate because we are using half-open ranges.
        return clamp(
            end && floored == unfloored ? floored - 1 : floored,
            0,
            size - 1
        );
    };

    /**
     * Indexer for point items. Those have just a single coordinate.
     *
     * @param {T} datum
     * @param {number} startVertexIndex
     * @param {number} endVertexIndex
     */
    function binningIndexer(datum, startVertexIndex, endVertexIndex) {
        if (startVertexIndex > lastIndex) {
            lastIndex = startVertexIndex;
        } else if (!unordered) {
            unordered = true;
            // TODO: Contextual info like view path
            console.debug(
                "Items are not ordered properly. Disabling binned index."
            );
        }

        const value = accessor(datum);
        const bin = getBin(value, false);

        if (startIndices[bin] > startVertexIndex) {
            startIndices[bin] = startVertexIndex;
        }

        if (endIndices[bin] < endVertexIndex) {
            endIndices[bin] = endVertexIndex;
        }
    }

    /**
     * Indexer for ranged items. Those have both start and end coordinates.
     *
     * @param {T} datum
     * @param {number} startVertexIndex
     * @param {number} endVertexIndex
     */
    function binningRangeIndexer(datum, startVertexIndex, endVertexIndex) {
        if (startVertexIndex > lastIndex) {
            lastIndex = startVertexIndex;
        } else if (!unordered) {
            unordered = true;
            // TODO: Contextual info like view path
            console.debug(
                "Items are not ordered properly. Disabling binned index."
            );
        }

        const start = accessor(datum);
        const end = accessor2(datum);
        const startBin = getBin(start, false);
        const endBin = getBin(end, true);

        // TODO: This loop could probably be done as a more efficient post processing
        // step.
        for (let bin = startBin; bin <= endBin; bin++) {
            if (startIndices[bin] > startVertexIndex) {
                startIndices[bin] = startVertexIndex;
            }

            if (endIndices[bin] < endVertexIndex) {
                endIndices[bin] = endVertexIndex;
            }
        }
    }

    /**
     * @type {Lookup}
     */
    const lookup = (start, end, arr = [0, 0]) => {
        const startBin = getBin(start, false);
        const endBin = getBin(end, true);
        const startIndex = startIndices[startBin];
        const endIndex = Math.max(endIndices[endBin], startIndex);

        arr[0] = startIndex;
        arr[1] = endIndex;
        return arr;
    };

    const getIndex = () => {
        for (let i = 1; i < endIndices.length; i++) {
            if (endIndices[i] < endIndices[i - 1]) {
                endIndices[i] = endIndices[i - 1];
            }
        }

        let tail = true;

        for (let i = startIndices.length - 1; i > 0; i--) {
            if (tail && startIndices[i] == MAX_INTEGER) {
                startIndices[i] = endIndices[i];
                tail = false;
            } else if (startIndices[i - 1] > startIndices[i]) {
                startIndices[i - 1] = startIndices[i];
            }
        }

        return lookup;
    };

    binningIndexer.getIndex = getIndex;
    binningRangeIndexer.getIndex = getIndex;

    if (unordered) {
        return undefined;
    } else {
        return accessor == accessor2 ? binningIndexer : binningRangeIndexer;
    }
}
