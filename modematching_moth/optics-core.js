(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MothOptics = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const EPSILON = 1e-12;

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function clamp(value, min, max) {
        if (!isFiniteNumber(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    function complex(re, im) {
        return { re, im };
    }

    function cloneComplex(value) {
        return complex(value.re, value.im);
    }

    function addComplex(a, b) {
        return complex(a.re + b.re, a.im + b.im);
    }

    function divideComplex(a, b) {
        const denom = (b.re * b.re) + (b.im * b.im);
        if (denom <= EPSILON * EPSILON) {
            return complex(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }
        return complex(
            ((a.re * b.re) + (a.im * b.im)) / denom,
            ((a.im * b.re) - (a.re * b.im)) / denom
        );
    }

    function magnitudeComplex(value) {
        return Math.hypot(value.re, value.im);
    }

    function propagateFreeSpace(q, distance) {
        if (!isFiniteNumber(distance) || Math.abs(distance) < EPSILON) return cloneComplex(q);
        return addComplex(q, complex(distance, 0));
    }

    function applyThinElement(q, focalLength) {
        if (!isFiniteNumber(focalLength) || Math.abs(focalLength) < EPSILON) {
            return cloneComplex(q);
        }
        const denominator = complex(1 - (q.re / focalLength), -(q.im / focalLength));
        if (magnitudeComplex(denominator) < EPSILON) {
            return complex(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        }
        return divideComplex(q, denominator);
    }

    function localGouyFromQ(q) {
        return Math.atan2(q.re, q.im);
    }

    function initialQFromBeam(initial) {
        const zR = Math.PI * initial.waist * initial.waist / initial.lambda;
        return complex(initial.reference - initial.waistZ, zR);
    }

    function extractBeamMetrics(q, lambda) {
        if (!q || !isFiniteNumber(lambda) || lambda <= 0) {
            return { R: Number.POSITIVE_INFINITY, w: Number.POSITIVE_INFINITY, gouy: 0, zR: Number.NaN };
        }
        const inv = divideComplex(complex(1, 0), q);
        const invRe = inv.re;
        const invIm = inv.im;

        let R = Number.POSITIVE_INFINITY;
        if (isFiniteNumber(invRe) && Math.abs(invRe) > EPSILON) {
            R = 1 / invRe;
        }

        let w = Number.POSITIVE_INFINITY;
        if (isFiniteNumber(invIm) && invIm < -EPSILON) {
            const candidate = Math.sqrt(Math.max(0, lambda / (Math.PI * (-invIm))));
            if (isFiniteNumber(candidate)) {
                w = candidate;
            }
        }

        return {
            R,
            w,
            gouy: localGouyFromQ(q),
            zR: q.im
        };
    }

    function computeModeOverlap(w1, R1, w2, R2, lambda) {
        if (!isFiniteNumber(w1) || !isFiniteNumber(w2) || w1 <= 0 || w2 <= 0 || !isFiniteNumber(lambda) || lambda <= 0) {
            return 0;
        }
        const invW1Sq = 1 / (w1 * w1);
        const invW2Sq = 1 / (w2 * w2);
        const sumInv = invW1Sq + invW2Sq;
        if (sumInv <= 0) return 0;

        const invR1 = isFiniteNumber(R1) && Math.abs(R1) > EPSILON ? 1 / R1 : 0;
        const invR2 = isFiniteNumber(R2) && Math.abs(R2) > EPSILON ? 1 / R2 : 0;
        const deltaCurvature = invR2 - invR1;
        const k = (2 * Math.PI) / lambda;
        const denominator = complex(sumInv, 0.5 * k * deltaCurvature);
        const amplitude = divideComplex(complex(2, 0), complex(w1 * w2 * denominator.re, w1 * w2 * denominator.im));
        const efficiency = Math.pow(magnitudeComplex(amplitude), 2);
        return clamp(efficiency, 0, 1);
    }

    function computeWaistFromSegment(startZ, qStart, lambda) {
        if (!qStart || !isFiniteNumber(qStart.im) || qStart.im <= EPSILON || !isFiniteNumber(lambda) || lambda <= 0) {
            return null;
        }
        return {
            z: startZ - qStart.re,
            w: Math.sqrt(Math.max(0, lambda * qStart.im / Math.PI)),
            zR: qStart.im
        };
    }

    function normalizeLens(raw, index, warnings, errors) {
        if (!raw || typeof raw !== 'object') {
            errors.push(`Lens ${index + 1} is not an object.`);
            return null;
        }

        const type = raw.type === 'mirror' ? 'mirror' : 'lens';
        let focalLength = Number(raw.focalLength);
        if (!isFiniteNumber(focalLength) && isFiniteNumber(Number(raw.focal))) {
            focalLength = Number(raw.focal);
        }
        if (!isFiniteNumber(focalLength) && isFiniteNumber(Number(raw.focalLengthMm))) {
            focalLength = Number(raw.focalLengthMm) * 1e-3;
        }

        let roc = null;
        if (isFiniteNumber(Number(raw.roc))) {
            roc = Number(raw.roc);
        } else if (isFiniteNumber(Number(raw.rocMm))) {
            roc = Number(raw.rocMm) * 1e-3;
        }

        if (type === 'mirror') {
            if (!isFiniteNumber(focalLength) && isFiniteNumber(roc)) {
                focalLength = roc / 2;
            }
            if (!isFiniteNumber(roc) && isFiniteNumber(focalLength)) {
                roc = focalLength * 2;
            }
        }

        const position = Number(raw.position);
        if (!isFiniteNumber(position)) {
            errors.push(`Lens ${index + 1} has an invalid position.`);
            return null;
        }
        if (!isFiniteNumber(focalLength) || Math.abs(focalLength) < 1e-9) {
            errors.push(`Lens ${index + 1} has an invalid focal length.`);
            return null;
        }

        return {
            id: typeof raw.id === 'string' ? raw.id : `lens-${index + 1}`,
            label: typeof raw.label === 'string' ? raw.label : '',
            type,
            focalLength,
            position,
            roc: isFiniteNumber(roc) ? roc : null,
            sourceId: typeof raw.sourceId === 'string' ? raw.sourceId : null
        };
    }

    function normalizeAnalyzer(raw, index, errors) {
        if (!raw || typeof raw !== 'object') {
            errors.push(`Analyzer ${index + 1} is not an object.`);
            return null;
        }
        const position = Number(raw.position);
        if (!isFiniteNumber(position)) {
            errors.push(`Analyzer ${index + 1} has an invalid position.`);
            return null;
        }
        const radius = Math.max(0, Number(raw.lensExclusionRadius || 0));
        return {
            id: typeof raw.id === 'string' ? raw.id : `analyzer-${index + 1}`,
            label: typeof raw.label === 'string' ? raw.label : '',
            position,
            lensExclusionRadius: isFiniteNumber(radius) ? radius : 0
        };
    }

    function normalizeSystem(raw) {
        const warnings = [];
        const errors = [];

        const initialRaw = raw && raw.initial ? raw.initial : {};
        const targetRaw = raw && raw.target ? raw.target : {};
        const components = raw && raw.components ? raw.components : {};

        const initial = {
            waist: Number(initialRaw.waist),
            waistZ: Number(initialRaw.waistZ || 0),
            lambda: Number(initialRaw.lambda),
            reference: Number(initialRaw.reference || 0)
        };

        if (!isFiniteNumber(initial.waist) || initial.waist <= 0) {
            errors.push('Initial waist must be a positive number.');
        }
        if (!isFiniteNumber(initial.lambda) || initial.lambda <= 0) {
            errors.push('Wavelength must be a positive number.');
        }
        if (!isFiniteNumber(initial.waistZ)) {
            errors.push('Initial waist position must be finite.');
        }
        if (!isFiniteNumber(initial.reference)) {
            errors.push('Reference plane must be finite.');
        }

        const target = {
            waist: Number(targetRaw.waist),
            waistZ: Number(targetRaw.waistZ),
            waistTolerance: Math.max(0, Number(targetRaw.waistTolerance || 0)),
            positionTolerance: Math.max(0, Number(targetRaw.positionTolerance || 0))
        };

        if (!isFiniteNumber(target.waist) || target.waist <= 0) {
            warnings.push('Target waist is not a positive number; target evaluation will be disabled.');
            target.waist = Number.NaN;
        }
        if (!isFiniteNumber(target.waistZ)) {
            warnings.push('Target waist position is not finite; target evaluation will be disabled.');
            target.waistZ = Number.NaN;
        }

        const rawLenses = Array.isArray(components.lenses) ? components.lenses : [];
        const rawAnalyzers = Array.isArray(components.analyzers) ? components.analyzers : [];

        const lenses = rawLenses.map((lens, index) => normalizeLens(lens, index, warnings, errors)).filter(Boolean);
        const analyzers = rawAnalyzers.map((item, index) => normalizeAnalyzer(item, index, errors)).filter(Boolean);

        lenses.sort((a, b) => a.position - b.position);
        analyzers.sort((a, b) => a.position - b.position);

        for (let i = 1; i < lenses.length; i++) {
            if (Math.abs(lenses[i].position - lenses[i - 1].position) <= 1e-9) {
                warnings.push(`Lenses "${lenses[i - 1].label || lenses[i - 1].id}" and "${lenses[i].label || lenses[i].id}" share the same position.`);
            }
        }

        return {
            initial,
            target,
            elements: lenses,
            analyzers,
            validation: {
                warnings,
                errors,
                isValid: errors.length === 0
            }
        };
    }

    function buildSamplingRange(system, options, outputWaist) {
        const sampleRange = options && options.sampleRange ? options.sampleRange : {};
        if (isFiniteNumber(sampleRange.min) && isFiniteNumber(sampleRange.max) && sampleRange.max > sampleRange.min) {
            return { min: sampleRange.min, max: sampleRange.max };
        }

        const positions = [system.initial.reference];
        if (isFiniteNumber(system.target.waistZ)) positions.push(system.target.waistZ);
        system.elements.forEach((element) => positions.push(element.position));
        system.analyzers.forEach((analyzer) => positions.push(analyzer.position));
        if (outputWaist && isFiniteNumber(outputWaist.z)) positions.push(outputWaist.z);

        let min = Math.min.apply(null, positions);
        let max = Math.max.apply(null, positions.concat(system.initial.reference + 0.5));
        if (!isFiniteNumber(min)) min = system.initial.reference - 0.1;
        if (!isFiniteNumber(max) || max <= min) max = min + 0.5;
        const padding = Math.max(0.02, (max - min) * 0.08);
        return {
            min: min - padding,
            max: max + padding
        };
    }

    function buildAnchorPositions(trace, options, sampleRange) {
        const anchors = [];
        const sampleCount = Math.max(2, Number(options && options.sampleCount) || 1200);
        const span = Math.max(sampleRange.max - sampleRange.min, 1e-9);
        const baseStep = span / Math.max(sampleCount - 1, 1);
        const lensOffset = Math.max(baseStep * 0.4, span * 1e-6, 1e-6);

        const push = (value) => {
            if (isFiniteNumber(value) && value >= sampleRange.min - EPSILON && value <= sampleRange.max + EPSILON) {
                anchors.push(value);
            }
        };

        push(sampleRange.min);
        push(sampleRange.max);
        push(trace.system.initial.reference);
        if (isFiniteNumber(trace.system.target.waistZ)) push(trace.system.target.waistZ);
        trace.system.analyzers.forEach((analyzer) => push(analyzer.position));
        trace.system.elements.forEach((element) => {
            push(element.position - lensOffset);
            push(element.position);
            push(element.position + lensOffset);
        });
        trace.waistEvents.forEach((waist) => push(waist.z));
        if (Array.isArray(options && options.anchorPositions)) {
            options.anchorPositions.forEach((anchor) => push(anchor));
        }

        return anchors;
    }

    function buildSamplePositions(trace, options, sampleRange) {
        const sampleCount = Math.max(2, Number(options && options.sampleCount) || 1200);
        const positions = [];
        const span = Math.max(sampleRange.max - sampleRange.min, 1e-9);
        for (let i = 0; i < sampleCount; i++) {
            const t = sampleCount === 1 ? 0 : i / (sampleCount - 1);
            positions.push(sampleRange.min + (span * t));
        }
        positions.push.apply(positions, buildAnchorPositions(trace, options, sampleRange));
        positions.sort((a, b) => a - b);

        const minimumSpacing = Math.max(span * 1e-10, 1e-12);
        const unique = [];
        for (let i = 0; i < positions.length; i++) {
            if (!unique.length || positions[i] - unique[unique.length - 1] > minimumSpacing) {
                unique.push(positions[i]);
            }
        }
        return unique;
    }

    function queryTraceAtZ(trace, z) {
        if (!trace || !trace.validation.isValid || !isFiniteNumber(z)) return null;

        const starts = trace.segmentStarts;
        let segmentIndex = 0;
        if (starts.length > 1 && z >= starts[1]) {
            let low = 0;
            let high = starts.length - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (starts[mid] <= z) {
                    segmentIndex = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
        }

        const segment = trace.segments[segmentIndex];
        const q = propagateFreeSpace(segment.qStart, z - segment.startZ);
        const metrics = extractBeamMetrics(q, trace.system.initial.lambda);
        const gouy = segment.gouyStart + (localGouyFromQ(q) - localGouyFromQ(segment.qStart));
        return {
            z,
            q,
            metrics,
            gouy,
            segmentIndex
        };
    }

    function evaluateTarget(trace, targetSpec) {
        if (!trace || !trace.validation.isValid) return null;
        const target = targetSpec || trace.system.target;
        if (!isFiniteNumber(target.waist) || target.waist <= 0 || !isFiniteNumber(target.waistZ)) {
            return null;
        }

        const sample = queryTraceAtZ(trace, target.waistZ);
        if (!sample || !isFiniteNumber(sample.metrics.w) || sample.metrics.w <= 0) return null;

        const idealZR = Math.PI * target.waist * target.waist / trace.system.initial.lambda;
        const idealMetrics = extractBeamMetrics(complex(0, idealZR), trace.system.initial.lambda);
        const modeMatching = computeModeOverlap(sample.metrics.w, sample.metrics.R, idealMetrics.w, idealMetrics.R, trace.system.initial.lambda);
        const outputWaist = trace.outputWaist;
        const errorW = Math.abs(sample.metrics.w - target.waist);
        const errorZ = outputWaist && isFiniteNumber(outputWaist.z) ? Math.abs(outputWaist.z - target.waistZ) : Number.POSITIVE_INFINITY;
        const toleranceW = target.waistTolerance > 0 ? target.waistTolerance : Math.max(target.waist, 1e-6);
        const toleranceZ = target.positionTolerance > 0 ? target.positionTolerance : 1e-3;

        return {
            sample,
            idealMetrics,
            modeMatching,
            outputWaist,
            errorW,
            errorZ,
            toleranceW,
            toleranceZ,
            passes: {
                waist: errorW <= toleranceW,
                position: errorZ <= toleranceZ
            }
        };
    }

    function scoreSolution(trace, targetSpec, scoringOptions) {
        const evaluation = evaluateTarget(trace, targetSpec);
        if (!evaluation) return null;
        const options = scoringOptions || {};
        const toleranceW = options.waistTolerance > 0 ? options.waistTolerance : evaluation.toleranceW;
        const toleranceZ = options.positionTolerance > 0 ? options.positionTolerance : evaluation.toleranceZ;
        const score = (evaluation.errorW / toleranceW) + (evaluation.errorZ / toleranceZ);
        return {
            modeMatching: evaluation.modeMatching,
            score,
            metrics: {
                w0: evaluation.outputWaist ? evaluation.outputWaist.w : Number.NaN,
                waistZ0: evaluation.outputWaist ? evaluation.outputWaist.z : Number.NaN,
                wAtTarget: evaluation.sample.metrics.w,
                RAtTarget: evaluation.sample.metrics.R,
                errorW: evaluation.errorW,
                errorZ: evaluation.errorZ
            },
            evaluation
        };
    }

    function traceSystem(system, options) {
        const normalized = system && system.validation ? system : normalizeSystem(system);
        const trace = {
            system: normalized,
            validation: normalized.validation,
            segments: [],
            segmentStarts: [],
            elementStates: [],
            waistEvents: [],
            samples: [],
            z: [],
            w: [],
            q: [],
            continuousGouy: [],
            rangeMin: Number.NaN,
            rangeMax: Number.NaN,
            displayMin: Number.NaN,
            displayMax: Number.NaN,
            maxW: Number.NaN,
            outputWaist: null,
            analyzers: [],
            targetEvaluation: null
        };

        if (!normalized.validation.isValid) {
            return trace;
        }

        const q0 = initialQFromBeam(normalized.initial);
        let currentZ = normalized.initial.reference;
        let currentQ = q0;
        let currentPhase = 0;

        for (let index = 0; index < normalized.elements.length; index++) {
            const element = normalized.elements[index];
            const qBefore = propagateFreeSpace(currentQ, element.position - currentZ);
            const gouyEnd = currentPhase + (localGouyFromQ(qBefore) - localGouyFromQ(currentQ));
            const waist = computeWaistFromSegment(currentZ, currentQ, normalized.initial.lambda);
            if (waist && waist.z >= currentZ - EPSILON && waist.z <= element.position + EPSILON) {
                trace.waistEvents.push({ ...waist, segmentIndex: trace.segments.length, kind: 'segment' });
            }

            trace.segments.push({
                startZ: currentZ,
                endZ: element.position,
                qStart: cloneComplex(currentQ),
                qEnd: qBefore,
                gouyStart: currentPhase,
                gouyEnd
            });
            trace.segmentStarts.push(currentZ);

            const qAfter = applyThinElement(qBefore, element.focalLength);
            trace.elementStates.push({
                element,
                qBefore,
                qAfter,
                metricsBefore: extractBeamMetrics(qBefore, normalized.initial.lambda),
                metricsAfter: extractBeamMetrics(qAfter, normalized.initial.lambda)
            });

            currentZ = element.position;
            currentQ = qAfter;
            currentPhase = gouyEnd;
        }

        trace.segments.push({
            startZ: currentZ,
            endZ: Number.POSITIVE_INFINITY,
            qStart: cloneComplex(currentQ),
            qEnd: null,
            gouyStart: currentPhase,
            gouyEnd: null
        });
        trace.segmentStarts.push(currentZ);

        const outputWaist = computeWaistFromSegment(currentZ, currentQ, normalized.initial.lambda);
        if (outputWaist) {
            trace.outputWaist = { ...outputWaist, kind: 'output', segmentIndex: trace.segments.length - 1 };
            trace.waistEvents.push(trace.outputWaist);
        }

        const sampleRange = buildSamplingRange(normalized, options || {}, trace.outputWaist);
        trace.rangeMin = sampleRange.min;
        trace.rangeMax = sampleRange.max;
        trace.displayMin = sampleRange.min;
        trace.displayMax = sampleRange.max;

        const samplePositions = buildSamplePositions(trace, options || {}, sampleRange);
        let maxW = 0;
        for (let i = 0; i < samplePositions.length; i++) {
            const sample = queryTraceAtZ(trace, samplePositions[i]);
            if (!sample) continue;
            trace.samples.push(sample);
            trace.z.push(sample.z);
            trace.w.push(sample.metrics.w);
            trace.q.push(sample.q);
            trace.continuousGouy.push(sample.gouy);
            if (isFiniteNumber(sample.metrics.w)) {
                maxW = Math.max(maxW, sample.metrics.w);
            }
        }
        trace.maxW = maxW || normalized.initial.waist;

        trace.analyzers = normalized.analyzers.map((analyzer) => {
            const sample = queryTraceAtZ(trace, analyzer.position);
            return {
                ...analyzer,
                sample
            };
        });

        trace.targetEvaluation = evaluateTarget(trace, normalized.target);
        return trace;
    }

    return {
        EPSILON,
        complex,
        propagateFreeSpace,
        applyThinElement,
        extractBeamMetrics,
        computeModeOverlap,
        normalizeSystem,
        traceSystem,
        queryTraceAtZ,
        evaluateTarget,
        scoreSolution,
        initialQFromBeam
    };
}));
